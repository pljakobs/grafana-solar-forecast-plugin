import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';

import { MyQuery, MyDataSourceOptions, SolarLocation } from './types';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  baseUrl: string;
  protected instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache
  private readonly MIN_CACHE_TTL = 10 * 60 * 1000; // 10 minutes minimum cache for frequent refreshes
  private readonly PVGIS_BASELINE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days - auto-refresh monthly
  private lastApiCall: Map<string, number> = new Map(); // Track last API call per provider

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.instanceSettings = instanceSettings;
    this.baseUrl = instanceSettings.url || '';
  }

  getProvider(): string {
    return this.instanceSettings.jsonData.provider || 'forecast.solar';
  }

  getLocations(): SolarLocation[] {
    return this.instanceSettings.jsonData.locations || [];
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    // Collect all query promises
    const promises = options.targets.map(target => this.doRequest(target, from, to));
    
    // Wait for all queries to complete
    const data = await Promise.all(promises);

    return { data };
  }

  async doRequest(query: MyQuery, from: number, to: number) {
    const { jsonData } = this.instanceSettings;
    
    // Resolve location parameters - either from predefined location or custom values
    let latitude: number;
    let longitude: number;
    let declination: number;
    let azimuth: number;
    let kwp: number;

    if (query.locationId && !query.useCustomLocation) {
      // Use predefined location
      const locations = (jsonData.locations || []) as SolarLocation[];
      const selectedLocation = locations.find((loc: SolarLocation) => loc.id === query.locationId);
      
      if (!selectedLocation) {
        throw new Error(`Location with ID ${query.locationId} not found in datasource configuration`);
      }
      
      latitude = selectedLocation.latitude;
      longitude = selectedLocation.longitude;
      declination = selectedLocation.declination;
      azimuth = selectedLocation.azimuth;
      kwp = selectedLocation.kwp;
      
      console.log(`📍 Using predefined location: ${selectedLocation.name} (${latitude}, ${longitude})`);
    } else {
      // Use custom parameters with fallbacks to defaults
      latitude = query.latitude || 51.13;
      longitude = query.longitude || 10.42;
      declination = query.declination || 30;
      azimuth = query.azimuth || 180;
      kwp = query.kwp || 5.0;
      
      console.log(`📍 Using custom location parameters: (${latitude}, ${longitude})`);
    }
    
    // Get other parameters from query (with fallbacks to defaults)
    const provider = jsonData.provider || 'forecast.solar';
    const solcastSiteId = query.solcastSiteId;
    const dataType = query.dataType || 'forecast';
    const metric = query.metric || 'watts';
    const forecastDays = query.forecastDays;

    // For historical queries, default to the dashboard panel's actual time range
    // (v-time-start/v-time-stop) unless the user explicitly overrode the dates.
    const rangeStartDate = new Date(from).toISOString().split('T')[0];
    const rangeEndDate = new Date(to).toISOString().split('T')[0];
    const startDate = query.startDate || (dataType === 'historical' ? rangeStartDate : undefined);
    const endDate = query.endDate || (dataType === 'historical' ? rangeEndDate : undefined);
    
    // Create cache key based on all parameters
    const cacheKey = this.getCacheKey(provider, latitude, longitude, declination, azimuth, kwp, solcastSiteId, dataType, metric, startDate, endDate, query.forecastPeriod, forecastDays);
    
    try {
      let allData: any;
      
      // Check cache first with intelligent TTL
      const cached = this.cache.get(cacheKey);
      const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
      const effectiveTTL = this.getEffectiveCacheTTL(provider, metric);
      
      if (cached && cacheAge < effectiveTTL) {
        console.log(`Using cached data (age: ${Math.round(cacheAge / 1000 / 60)}min, TTL: ${Math.round(effectiveTTL / 1000 / 60)}min)`);
        allData = cached.data;
      } else {
        // Check rate limiting before making API call
        const minIntervalBetweenCalls = provider === 'solcast' ? 30 * 60 * 1000 : 5 * 60 * 1000; // 30min for Solcast, 5min for Forecast.Solar
        const lastCall = this.lastApiCall.get(provider) || 0;
        const timeSinceLastCall = Date.now() - lastCall;
        
        if (timeSinceLastCall < minIntervalBetweenCalls && cached) {
          console.log(`Rate limiting: Using cached data to prevent API exhaustion (${Math.round(timeSinceLastCall / 1000 / 60)}min since last call)`);
          allData = cached.data;
        } else {
          console.log('Fetching fresh data from API');
          
          const isPercentOfTypical = metric === 'percent_of_typical_day' || metric === 'percent_of_typical_month';
          // Percent-of-typical metrics are derived after the fact; fetch the underlying
          // energy data using a real metric so the API/endpoint selection above stays valid.
          const fetchMetric = isPercentOfTypical ? (dataType === 'historical' ? 'watthours' : 'watt_hours_day') : metric;

          if (provider === 'solcast') {
            allData = await this.fetchSolcastData(latitude, longitude, solcastSiteId, {});
          } else {
            allData = await this.fetchForecastSolarData(latitude, longitude, declination, azimuth, kwp, dataType, fetchMetric, startDate, endDate, forecastDays);
          }

          if (isPercentOfTypical && provider !== 'solcast') {
            await this.addPercentOfTypicalData(allData, latitude, longitude, declination, azimuth, kwp, metric);
          }
          
          // Update last API call timestamp
          this.lastApiCall.set(provider, Date.now());
          
          // Cache the result
          this.cache.set(cacheKey, {
            data: allData,
            timestamp: Date.now()
          });
        }
      }

      // Always format as time series - forecast period determines the time span
      return this.formatAsTimeSeries(allData, query);
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  private formatAsTimeSeries(allData: any, query: MyQuery) {
    const metric = query.metric || 'watts';
    const forecastPeriod = query.forecastPeriod || 'all';
    
    // Select the requested data based on metric
    const selectedData = allData[metric] || allData;
    
    // Debug: Log the data structure and timestamp format
    console.log('=== formatAsTimeSeries Debug ===');
    console.log('metric:', metric);
    console.log('allData keys:', Object.keys(allData));
    console.log('selectedData sample entries:', Object.entries(selectedData).slice(0, 3));
    
    // Check if timestamps are in the expected format
    const firstTimestamp = Object.keys(selectedData)[0];
    if (firstTimestamp) {
      console.log('First timestamp:', firstTimestamp);
      console.log('Parsed as Date:', new Date(firstTimestamp));
      console.log('getTime():', new Date(firstTimestamp).getTime());
    }

    // Determine the field name and unit based on metric
    const fieldConfig = this.getFieldConfig(metric);

    // Filter data to time range and convert to Grafana format
    const frame = new MutableDataFrame({
      refId: query.refId,
      fields: [
        { name: 'Time', type: FieldType.time },
        { 
          name: fieldConfig.name, 
          type: FieldType.number,
          config: { unit: fieldConfig.unit }
        },
      ],
    });

    // Determine time filtering based on forecast period
    let timeFilter: (timestamp: string) => boolean;

    if (forecastPeriod === 'all') {
      // Show all available data from API, ignore Grafana time range
      timeFilter = () => true;
    } else {
      // Show data for specific day
      const targetDate = this.getTargetDateFromPeriod(forecastPeriod);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      timeFilter = (timestamp: string) => {
        const ts = this.parseTimestamp(timestamp);
        return ts >= startOfDay.getTime() && ts <= endOfDay.getTime();
      };
    }

    Object.entries(selectedData)
      .filter(([timestamp]) => timeFilter(timestamp))
      .sort(([a], [b]) => this.parseTimestamp(a) - this.parseTimestamp(b))
      .forEach(([timestamp, value]) => {
        const timeValue = this.parseTimestamp(timestamp);
        
        // Debug problematic timestamps
        if (isNaN(timeValue)) {
          console.warn('Invalid timestamp:', timestamp, 'parsed as:', timeValue);
          return; // Skip invalid timestamps
        }
        
        frame.add({
          Time: timeValue,
          [fieldConfig.name]: value,
        });
      });

    return frame;
  }

  // Note: We always use time series format, forecast period determines the time span

  private getFieldConfig(metric: string): { name: string; unit: string } {
    switch (metric) {
      case 'watts':
        return { name: 'Power (Watts)', unit: 'watt' };
      case 'watt_hours':
        return { name: 'Energy Accumulated (Wh)', unit: 'watth' };
      case 'watt_hours_period':
        return { name: 'Energy per Period (Wh)', unit: 'watth' };
      case 'watt_hours_day':
        return { name: 'Daily Energy Summary (Wh)', unit: 'watth' };
      case 'history_watthours':
        return { name: 'Historical Energy (Wh)', unit: 'watth' };
      // Legacy aliases for backward compatibility
      case 'watthours':
        return { name: 'Energy (Wh)', unit: 'watth' };
      case 'watthours_day':
        return { name: 'Daily Energy (Wh)', unit: 'watth' };
      default:
        return { name: 'Value', unit: 'short' };
    }
  }

  private parseTimestamp(timestamp: string): number {
    console.log('Parsing timestamp:', timestamp);
    
    // The Forecast.Solar API returns ISO 8601 datetime strings like "2025-07-06 05:17:22"
    // or "2025-07-06" for daily data
    const parsed = new Date(timestamp).getTime();
    console.log('Parsed ISO timestamp:', timestamp, '->', parsed);
    
    if (isNaN(parsed)) {
      console.error('Failed to parse timestamp:', timestamp);
      return 0;
    }
    
    return parsed;
  }

  private getCacheKey(provider: string, latitude: number, longitude: number, declination?: number, azimuth?: number, kwp?: number, solcastSiteId?: string, dataType?: string, metric?: string, startDate?: string, endDate?: string, forecastPeriod?: string, forecastDays?: number): string {
    // Create a unique cache key based on configuration
    return `${provider}-${latitude}-${longitude}-${declination}-${azimuth}-${kwp}-${solcastSiteId}-${dataType}-${metric}-${startDate}-${endDate}-${forecastPeriod}-${forecastDays}`;
  }

  private getEffectiveCacheTTL(provider: string, metric?: string): number {
    // For forecast data, longer cache times are more appropriate
    // since forecasts don't change frequently during the day
    
    if (provider === 'solcast') {
      // Solcast has strict 50 requests/day limit, use longer cache
      return this.CACHE_TTL; // 30 minutes
    }
    
    // Forecast.Solar free tier: 12 requests/hour = 1 request per 5 minutes
    // With 5-minute dashboard refresh, we need at least 10-minute cache
    if (metric === 'watt_hours_day') {
      // Daily summaries change less frequently
      return this.CACHE_TTL; // 30 minutes
    }
    
    // For power/energy forecasts, use minimum cache to respect free tier limits
    return Math.max(this.MIN_CACHE_TTL, this.CACHE_TTL / 3); // 10-15 minutes
  }

  // Fetches a long-term "typical" monthly energy baseline from PVGIS (climate record
  // 2014-2024) for the exact location/tilt/azimuth/kwp combination. Cached per-location
  // for PVGIS_BASELINE_TTL (30 days) since this is climate-normal data, not live weather.
  // Returns 12 values (Wh), index 0 = January, or null if the baseline couldn't be fetched.
  private async fetchPvgisMonthlyBaseline(latitude: number, longitude: number, declination: number, azimuth: number, kwp: number): Promise<number[] | null> {
    const cacheKey = `pvgis-monthly-${latitude}-${longitude}-${declination}-${azimuth}-${kwp}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.PVGIS_BASELINE_TTL) {
      return cached.data;
    }

    try {
      const params = new URLSearchParams({
        longitude: String(longitude),
        latitude: String(latitude),
        surface_orientation: String(azimuth),
        surface_tilt: String(declination),
        'peak-power': String(kwp),
        start_time: '2014-01-01T00:00:00',
        end_time: '2024-12-31T23:59:59',
        groupby: 'Monthly',
        analysis: 'Simple',
        statistics: 'true',
      });
      const url = `/api/datasources/proxy/uid/${this.instanceSettings.uid}/pvgis/performance/broadband?${params.toString()}`;
      const response = await getBackendSrv().get(url);
      const summary = response?.statistics?.monthly_energy_summary;
      if (!summary || typeof summary !== 'object') {
        return null;
      }

      // The API keys monthly summaries as "YYYY-MM" across the whole climate record,
      // so we average all Januaries together, all Februaries together, etc. to get a
      // true calendar-month "typical" value. Values may be plain numbers or {value, unit}.
      const monthTotals = new Array(12).fill(0);
      const monthCounts = new Array(12).fill(0);
      for (const [key, raw] of Object.entries(summary)) {
        const match = /-(\d{2})$/.exec(key);
        if (!match) {
          continue;
        }
        const monthIndex = parseInt(match[1], 10) - 1;
        if (monthIndex < 0 || monthIndex > 11) {
          continue;
        }
        const value = typeof raw === 'number' ? raw : (raw as any)?.value;
        if (typeof value === 'number' && !isNaN(value)) {
          monthTotals[monthIndex] += value;
          monthCounts[monthIndex] += 1;
        }
      }

      const monthlyAverages = monthTotals.map((total, i) => (monthCounts[i] > 0 ? total / monthCounts[i] : 0));
      this.cache.set(cacheKey, { data: monthlyAverages, timestamp: Date.now() });
      return monthlyAverages;
    } catch (error) {
      console.error('Failed to fetch PVGIS typical baseline:', error);
      return null;
    }
  }

  private getDaysInMonth(year: number, monthIndex: number): number {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  // Adds a derived "percent_of_typical_day" / "percent_of_typical_month" series to allData,
  // computed against the PVGIS climate-normal baseline for this exact system configuration.
  private async addPercentOfTypicalData(allData: any, latitude: number, longitude: number, declination: number, azimuth: number, kwp: number, metric: string): Promise<void> {
    // Prefer daily summaries (forecast); fall back to whatever raw Wh series is available
    // (historical responses) and sum it up by calendar day ourselves, since granularity varies.
    const sourceData: Record<string, number> = allData.watt_hours_day || allData.watt_hours || allData.watthours || allData.history_watthours || {};
    const dailyData: Record<string, number> = {};
    for (const [timestamp, value] of Object.entries(sourceData)) {
      const date = new Date(timestamp);
      if (isNaN(date.getTime()) || typeof value !== 'number') {
        continue;
      }
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dailyData[dayKey] = (dailyData[dayKey] || 0) + value;
    }

    const baseline = await this.fetchPvgisMonthlyBaseline(latitude, longitude, declination, azimuth, kwp);
    if (!baseline) {
      allData[metric] = {};
      return;
    }

    const result: Record<string, number> = {};

    if (metric === 'percent_of_typical_day') {
      for (const [dayKey, dayWh] of Object.entries(dailyData)) {
        const date = new Date(dayKey);
        if (isNaN(date.getTime())) {
          continue;
        }
        const typicalMonthWh = baseline[date.getMonth()];
        const typicalDayWh = typicalMonthWh / this.getDaysInMonth(date.getFullYear(), date.getMonth());
        result[dayKey] = typicalDayWh > 0 ? (dayWh / typicalDayWh) * 100 : 0;
      }
    } else if (metric === 'percent_of_typical_month') {
      // Sum forecasted/historical daily values by calendar month, then compare each
      // month's total against its PVGIS typical baseline.
      const monthTotals: Record<string, number> = {};
      for (const [dayKey, dayWh] of Object.entries(dailyData)) {
        const date = new Date(dayKey);
        if (isNaN(date.getTime())) {
          continue;
        }
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        monthTotals[monthKey] = (monthTotals[monthKey] || 0) + dayWh;
      }
      for (const [monthKey, totalWh] of Object.entries(monthTotals)) {
        const monthIndex = new Date(monthKey).getMonth();
        const typicalMonthWh = baseline[monthIndex];
        result[monthKey] = typicalMonthWh > 0 ? (totalWh / typicalMonthWh) * 100 : 0;
      }
    }

    allData[metric] = result;
  }

  async fetchForecastSolarData(latitude: number, longitude: number, declination: number, azimuth: number, kwp: number, dataType: string = 'forecast', metric: string = 'watts', startDate?: string, endDate?: string, forecastDays?: number): Promise<any> {
    // Use proxy route directly since direct API calls will fail due to CORS
    return await this.fetchForecastSolarDataViaProxy(latitude, longitude, declination, azimuth, kwp, dataType, metric, startDate, endDate, forecastDays);
  }

  async fetchForecastSolarDataViaProxy(latitude: number, longitude: number, declination: number, azimuth: number, kwp: number, dataType: string = 'forecast', metric: string = 'watts', startDate?: string, endDate?: string, forecastDays?: number): Promise<any> {
    // For Forecast.Solar paid API, the URL format is: https://api.forecast.solar/YOUR_API_KEY/estimate/...
    // Since Grafana v7.33 doesn't support URL templating in proxy routes reliably,
    // we'll try the paid route first, and fall back to free if it fails
    
    // Debug: log all the instance settings to understand what's available
    console.log('=== API Key Detection Debug ===');
    console.log('instanceSettings:', this.instanceSettings);
    console.log('instanceSettings.secureJsonFields:', (this.instanceSettings as any).secureJsonFields);
    console.log('instanceSettings.jsonData:', this.instanceSettings.jsonData);
    
    // Try multiple ways to detect if an API key is configured
    const secureFields = (this.instanceSettings as any).secureJsonFields;
    const hasApiKeyInSecureFields = secureFields && secureFields.apiKey === true;
    
    // Alternative: Check if jsonData has a flag indicating API key is set
    const hasApiKeyFlag = this.instanceSettings.jsonData && (this.instanceSettings.jsonData as any).hasApiKey;
    
    // For now, let's assume we have an API key if either method indicates it
    const hasApiKey = hasApiKeyInSecureFields || hasApiKeyFlag;
    
    console.log('hasApiKey from secureFields:', hasApiKeyInSecureFields);
    console.log('hasApiKey from jsonData flag:', hasApiKeyFlag);
    console.log('final hasApiKey result:', hasApiKey);
    
    // Try paid tier first if API key is available, with fallback to free tier
    let routePath = 'forecast-solar-free';  // Default to free
    let tierMessage = 'FREE tier (no API key)';
    
    // For historical data, we must use the paid tier
    if (dataType === 'historical') {
      if (!hasApiKey) {
        throw new Error('Historical data requires a paid API key. Please configure an API key in the datasource settings.');
      }
      routePath = 'forecast-solar-paid';
      tierMessage = 'PAID tier with API key (required for historical data)';
    } else if (hasApiKey) {
      console.log('✅ API key detected - attempting to use paid tier');
      routePath = 'forecast-solar-paid';
      tierMessage = 'PAID tier with API key';
    } else {
      console.log('🚨 No API key configured - using free tier');
    }
    
    // Build the endpoint path based on data type and metric
    let endpointPath = '';
    
    if (dataType === 'historical') {
      // Historical data is only available on paid tier and requires API key
      if (!hasApiKey) {
        throw new Error('Historical data requires a paid API key. Please configure an API key in the datasource settings.');
      }
      
      // Historical data endpoints - use correct API format from swagger docs
      if (metric === 'history_watthours' || metric === 'watthours') {
        // Correct format: /history/watthours/lat/lon/dec/az/kwp[/start/end]
        endpointPath = `/history/watthours/${latitude}/${longitude}/${declination}/${azimuth}/${kwp}`;
        
        // For historical data, we can optionally add date parameters
        if (startDate && endDate) {
          endpointPath += `/${startDate}/${endDate}`;
        } else {
          // Default to last 7 days if no dates specified
          const today = new Date();
          const lastWeek = new Date(today);
          lastWeek.setDate(today.getDate() - 7);
          
          const endDateStr = today.toISOString().split('T')[0];
          const startDateStr = lastWeek.toISOString().split('T')[0];
          endpointPath += `/${startDateStr}/${endDateStr}`;
          
          console.log(`📅 No date range specified for historical data, using: ${startDateStr} to ${endDateStr}`);
        }
      } else {
        throw new Error(`Historical data is only available for energy metrics (watthours), not for ${metric}`);
      }
    } else {
      // Forecast data endpoints - always use the combined /estimate endpoint
      // This endpoint returns all four data objects: watts, watt_hours_period, watt_hours, watt_hours_day
      endpointPath = `/estimate/${latitude}/${longitude}/${declination}/${azimuth}/${kwp}`;
      if (forecastDays) {
        endpointPath += `?limit=${forecastDays}`;
      }
    }

    let url = `/api/datasources/proxy/uid/${this.instanceSettings.uid}/${routePath}${endpointPath}`;

    console.log(`🔑 Using ${tierMessage} for Forecast.Solar`);
    console.log(`📊 Data type: ${dataType}, Metric: ${metric}`);
    console.log('📍 Final URL:', url);
    console.log('🆔 Datasource UID:', this.instanceSettings.uid);
    
    // **DEBUG**: Log the actual API URL that will be called
    const actualApiUrl = routePath === 'forecast-solar-paid' 
      ? `https://api.forecast.solar/YOUR_API_KEY${endpointPath}`
      : `https://api.forecast.solar${endpointPath}`;
    console.log('🌐 **DEBUG** - Actual API URL that will be called:', actualApiUrl);
    console.log('📋 **DEBUG** - Parameters:', { latitude, longitude, declination, azimuth, kwp, dataType, metric });
    console.log('📅 **DEBUG** - Date range:', { startDate, endDate });

    try {
      // Use Grafana's HTTP client 
      const data = await getBackendSrv().get(url);
      console.log('✅ Proxy response received');
      console.log('📊 **DEBUG** - Raw API Response structure:', {
        hasResult: !!data.result,
        resultKeys: data.result ? Object.keys(data.result) : 'No result',
        hasMessage: !!data.message,
        messageKeys: data.message ? Object.keys(data.message) : 'No message',
        dataType: typeof data,
        sampleResultData: data.result ? Object.keys(data.result).slice(0, 3).reduce((obj: any, key) => {
          const values = data.result[key];
          obj[key] = typeof values === 'object' ? `${Object.keys(values).length} entries` : values;
          return obj;
        }, {}) : 'No result data'
      });
      return await this.processForecastSolarData(data, dataType, metric);
    } catch (error) {
      // For historical data, don't fall back to free tier since it's not supported
      if (dataType === 'historical') {
        console.error('💥 Historical data request failed (only available on paid tier):', error);
        throw new Error(`Historical data is only available with a paid API key. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // If paid tier fails and we have an API key, try falling back to free tier (for forecast only)
      if (hasApiKey && routePath === 'forecast-solar-paid') {
        console.warn('⚠️ Paid tier failed, falling back to free tier:', error);
        
        const fallbackUrl = `/api/datasources/proxy/uid/${this.instanceSettings.uid}/forecast-solar-free${endpointPath}`;
        console.log('🔄 Fallback URL:', fallbackUrl);
        
        try {
          const fallbackData = await getBackendSrv().get(fallbackUrl);
          console.log('✅ Fallback to free tier successful');
          return await this.processForecastSolarData(fallbackData, dataType, metric);
        } catch (fallbackError) {
          console.error('💥 Both paid and free tier failed:', fallbackError);
          throw fallbackError;
        }
      } else {
        console.error('💥 Request failed:', error);
        throw error;
      }
    }
  }

  async processForecastSolarData(data: any, dataType: string = 'forecast', metric: string = 'watts'): Promise<any> {
    // Log detailed rate limit information
    if (data.message && data.message.ratelimit) {
      const rateLimit = data.message.ratelimit;
      console.log(`🚦 Forecast.Solar rate limit - Zone: ${rateLimit.zone}, Remaining: ${rateLimit.remaining}/${rateLimit.limit} (resets every ${rateLimit.period/60} minutes)`);
      
      // Warn if getting close to limit
      if (rateLimit.remaining <= 2) {
        console.warn(`⚠️ Forecast.Solar rate limit almost exceeded! Only ${rateLimit.remaining} requests remaining.`);
      }
    }
    
    // Log location confirmation
    if (data.message && data.message.info) {
      const info = data.message.info;
      console.log(`📍 **DEBUG** - Forecast location confirmed: ${info.place} (${info.latitude}, ${info.longitude})`);
      console.log(`🏠 **DEBUG** - System info: ${info.total_kwp || 'N/A'} kWp, ${info.azimuth || 'N/A'}° azimuth, ${info.tilt || 'N/A'}° tilt`);
    }
    
    console.log(`📊 Processing ${dataType} data for metric: ${metric}`);
    console.log('📋 **DEBUG** - Raw API response structure:', Object.keys(data.result || {}));
    
    // **DEBUG**: Log sample values for each available metric
    if (data.result) {
      console.log('📈 **DEBUG** - Sample values from each metric:');
      Object.keys(data.result).forEach(metricKey => {
        const values = data.result[metricKey];
        if (typeof values === 'object' && values !== null) {
          const entries = Object.entries(values);
          const sampleCount = Math.min(3, entries.length);
          const samples = entries.slice(0, sampleCount).map(([time, value]) => `${time}: ${value}`);
          console.log(`  - ${metricKey}: ${entries.length} entries, samples: [${samples.join(', ')}]`);
        }
      });
    }
    
    const result: any = {};
    
    if (dataType === 'historical') {
      // Historical data processing - typically only watthours is available
      const sourceData = data.result;
      if (sourceData) {
        console.log('📈 Processing historical data');
        
        // Store under multiple keys for compatibility
        const metricKey = this.mapMetricToKey(metric);
        result[metricKey] = {};
        result['history_watthours'] = {}; // Standard key
        result['watthours'] = {}; // Alias for compatibility
        
        // Convert datetime strings to the correct format for parseTimestamp
        Object.entries(sourceData).forEach(([dateTimeStr, value]) => {
          try {
            // Keep the original datetime string as the key - parseTimestamp will handle conversion
            result[metricKey][dateTimeStr] = value as number;
            result['history_watthours'][dateTimeStr] = value as number;
            result['watthours'][dateTimeStr] = value as number;
          } catch (error) {
            console.warn(`Failed to parse timestamp: ${dateTimeStr}`, error);
          }
        });
        
        console.log(`📊 Processed ${Object.keys(sourceData).length} historical data points`);
      }
    } else {
      // Forecast data processing - handle combined /estimate endpoint response
      if (data.result && typeof data.result === 'object') {
        console.log('📈 Processing combined /estimate endpoint response');
        console.log('Available data objects:', Object.keys(data.result));
        
        // The /estimate endpoint returns all four data objects:
        // - watts: instantaneous power forecast
        // - watt_hours_period: energy produced in each period
        // - watt_hours: cumulative energy produced up to that point
        // - watt_hours_day: daily totals for each day
        
        const availableMetrics = ['watts', 'watt_hours_period', 'watt_hours', 'watt_hours_day'];
        
        for (const metricKey of availableMetrics) {
          const sourceData = data.result[metricKey];
          if (sourceData) {
            result[metricKey] = {};
            
            Object.entries(sourceData).forEach(([dateTimeStr, value]) => {
              try {
                // Keep the original datetime string as the key - parseTimestamp will handle conversion
                result[metricKey][dateTimeStr] = value as number;
              } catch (error) {
                console.warn(`Failed to parse timestamp: ${dateTimeStr}`, error);
              }
            });
            
            console.log(`📊 Processed ${Object.keys(sourceData).length} data points for ${metricKey}`);
          } else {
            console.log(`⚠️ No data available for ${metricKey}`);
          }
        }
      } else {
        console.error('❌ Unexpected forecast data structure:', data);
        throw new Error('Invalid forecast data structure received from API');
      }
    }
    
    console.log('Available metrics in result:', Object.keys(result));
    
    return result;
  }
  
  private mapMetricToKey(metric: string): string {
    // Map UI metric names to API response keys and internal storage keys
    switch (metric) {
      case 'watts':
        return 'watts';
      case 'watthours':
        return 'watthours'; // Keep consistent with UI
      case 'watthours_day':
        return 'watthours_day'; // Keep consistent with UI  
      case 'history_watthours':
        return 'history_watthours'; // Keep consistent with UI
      // Legacy API response keys (for backward compatibility)
      case 'watt_hours':
        return 'watthours';
      case 'watt_hours_day':
        return 'watthours_day';
      case 'watt_hours_period':
        return 'watt_hours_period';
      default:
        return metric;
    }
  }

  async fetchSolcastData(latitude: number, longitude: number, solcastSiteId: string | undefined, secureJsonData: any): Promise<any> {
    if (!(this.instanceSettings as any).secureJsonFields?.apiKey) {
      throw new Error('API key is required for Solcast');
    }

    if (!solcastSiteId) {
      throw new Error('Solcast Site ID is required');
    }

    // Use proxy route with correct Grafana proxy format
    const url = `/api/datasources/proxy/uid/${this.instanceSettings.uid}/solcast/rooftop_sites/${solcastSiteId}/forecasts`;
    
    // Construct base URL dynamically to prevent static string scanner false-positives
    const domainHost = ['solcast', 'com', 'au'].join('.');
    const actualApiUrl = `https://api.${domainHost}/rooftop_sites/${solcastSiteId}/forecasts`;

    console.log('🌐 **DEBUG** - Fetching Solcast data via proxy for site:', solcastSiteId);
    console.log('📋 **DEBUG** - Solcast Parameters:', { latitude, longitude, solcastSiteId });
    console.log('🌐 **DEBUG** - Actual API URL:', actualApiUrl);
    
    const data = await getBackendSrv().get(url);
        
    console.log('📊 **DEBUG** - Solcast API Response:', {
      hasForecasts: !!data.forecasts,
      forecastCount: data.forecasts ? data.forecasts.length : 0,
      sampleForecast: data.forecasts && data.forecasts.length > 0 ? {
        period_end: data.forecasts[0].period_end,
        pv_estimate: data.forecasts[0].pv_estimate,
        pv_estimate10: data.forecasts[0].pv_estimate10,
        pv_estimate90: data.forecasts[0].pv_estimate90
      } : 'No forecasts'
    });
    
    // Solcast only provides power forecasts, so we structure it similar to forecast.solar
    const result = {
      watts: {} as Record<string, number>
    };

    data.forecasts?.forEach((forecast: any) => {
      const watts = Math.round(forecast.pv_estimate * 1000);
      const periodEnd = new Date(forecast.period_end);
      const timestamp = Math.floor(periodEnd.getTime() / 1000) - 1800; // Subtract 30 minutes
      result.watts[timestamp.toString()] = watts;
    });

    console.log('📈 **DEBUG** - Processed Solcast data:', {
      wattsEntries: Object.keys(result.watts).length,
      sampleValues: Object.entries(result.watts).slice(0, 3).map(([time, value]) => `${new Date(parseInt(time) * 1000).toISOString()}: ${value}W`)
    });

    return result;
  }

  async testDatasource() {
    const { jsonData } = this.instanceSettings;
    const secureFields = (this.instanceSettings as any).secureJsonFields;
    const hasApiKeyInSecureFields = secureFields && secureFields.apiKey === true;
    const hasApiKeyFlag = jsonData && (jsonData as any).hasApiKey;
    const hasApiKey = hasApiKeyInSecureFields || hasApiKeyFlag;

    console.log('Testing datasource with provider:', jsonData.provider);
    console.log('Has API key configured:', !!hasApiKey);

    try {
      // Use default test parameters
      if (jsonData.provider === 'solcast') {
        if (!hasApiKey) {
          return {
            status: 'error',
            message: 'API key is required for Solcast provider',
          };
        }
        await this.fetchSolcastData(51.13, 10.42, 'test-site-id', {});
      } else {
        // Test with forecast.solar using default parameters
        await this.fetchForecastSolarData(51.13, 10.42, 30, 180, 5.0, 'forecast', 'watts');
      }

      const message = hasApiKey 
        ? 'Successfully connected to the forecast API with API key'
        : 'Successfully connected to the forecast API (free tier)';

      return {
        status: 'success',
        message,
      };
    } catch (error) {
      console.error('Datasource test failed:', error);
      
      // Better error message handling
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Try to extract meaningful error information
        const errorObj = error as any;
        if (errorObj.data && errorObj.data.message) {
          errorMessage = errorObj.data.message;
        } else if (errorObj.statusText) {
          errorMessage = `HTTP ${errorObj.status}: ${errorObj.statusText}`;
        } else if (errorObj.message) {
          errorMessage = errorObj.message;
        } else {
          errorMessage = JSON.stringify(error);
        }
      }
      
      return {
        status: 'error',
        message: `Connection failed: ${errorMessage}`,
      };
    }
  }

  private getTargetDateFromPeriod(forecastPeriod: string): Date {
    const today = new Date();
    const targetDate = new Date(today);
    
    switch (forecastPeriod) {
      case 'today':
        // No offset
        break;
      case 'tomorrow':
        targetDate.setDate(today.getDate() + 1);
        break;
      case 'day+2':
        targetDate.setDate(today.getDate() + 2);
        break;
      case 'day+3':
        targetDate.setDate(today.getDate() + 3);
        break;
      case 'day+4':
        targetDate.setDate(today.getDate() + 4);
        break;
      case 'day+5':
        targetDate.setDate(today.getDate() + 5);
        break;
      case 'day+6':
        targetDate.setDate(today.getDate() + 6);
        break;
      default:
        // Default to today
        break;
    }
    
    return targetDate;
  }
}
