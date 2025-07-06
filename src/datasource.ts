import { DataQueryRequest, DataQueryResponse, DataSourceApi, DataSourceInstanceSettings, MutableDataFrame, FieldType } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';

import { MyQuery, MyDataSourceOptions, DEFAULT_QUERY } from './types';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  private instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.instanceSettings = instanceSettings;
  }

  getProvider(): string {
    return this.instanceSettings.jsonData?.provider || 'forecast.solar';
  }

  getLocations() {
    return this.instanceSettings.jsonData?.locations || [];
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    console.log('🚀 Solar Forecast Plugin - Backend Query');
    console.log('📊 Query options:', options);
    console.log('⏰ Time range:', { from: new Date(from), to: new Date(to) });

    // Return a DataQueryResponse
    const data = await Promise.all(
      options.targets.map(async (target: MyQuery) => {
        const query = { ...DEFAULT_QUERY, ...target };
        
        console.log('🔧 Processing query:', query);
        
        // Validate required parameters
        if (!query.latitude || !query.longitude || !query.declination || !query.azimuth || !query.kwp) {
          console.warn('⚠️ Missing required query parameters');
          return new MutableDataFrame({
            refId: query.refId,
            fields: [],
          });
        }

        try {
          return await this.doRequest(query, from, to);
        } catch (error) {
          console.error('❌ Query failed:', error);
          throw error;
        }
      })
    );

    return { data };
  }

  async doRequest(query: MyQuery, from: number, to: number) {
    console.log('🌐 Making backend request for:', query.metric);
    
    // Create the data frame to return data
    const frame = new MutableDataFrame({
      refId: query.refId,
      fields: [
        { name: 'Time', type: FieldType.time },
        { name: this.getFieldConfig(query.metric || 'watts').name, type: FieldType.number, config: { unit: this.getFieldConfig(query.metric || 'watts').unit } },
      ],
    });

    try {
      // Use Grafana's backend query API
      const response = await getBackendSrv().post(`/api/ds/query`, {
        queries: [
          {
            refId: query.refId,
            datasource: {
              uid: this.instanceSettings.uid,
              type: this.instanceSettings.type,
            },
            queryText: query.queryText,
            metric: query.metric,
            latitude: query.latitude,
            longitude: query.longitude,
            declination: query.declination,
            azimuth: query.azimuth,
            kwp: query.kwp,
            solcastSiteId: query.solcastSiteId,
          },
        ],
        from: from.toString(),
        to: to.toString(),
      });

      console.log('✅ Backend response received:', response);

      // The backend should return data frames, extract the data
      if (response.results && response.results[query.refId] && response.results[query.refId].frames) {
        const backendFrame = response.results[query.refId].frames[0];
        if (backendFrame && backendFrame.data && backendFrame.data.values) {
          const timeValues = backendFrame.data.values[0] || [];
          const dataValues = backendFrame.data.values[1] || [];
          
          for (let i = 0; i < timeValues.length; i++) {
            frame.add({
              Time: timeValues[i],
              [this.getFieldConfig(query.metric || 'watts').name]: dataValues[i],
            });
          }
        }
      }

      console.log(`📈 Processed ${frame.length} data points`);
      return frame;

    } catch (error) {
      console.error('💥 Backend request failed:', error);
      throw error;
    }
  }

  private getFieldConfig(metric: string): { name: string; unit: string } {
    switch (metric) {
      case 'watts':
        return { name: 'Watts', unit: 'watt' };
      case 'watt_hours_period':
        return { name: 'Energy per Period', unit: 'watth' };
      case 'watt_hours':
        return { name: 'Cumulative Energy', unit: 'watth' };
      case 'watt_hours_day':
        return { name: 'Daily Energy', unit: 'watth' };
      default:
        return { name: 'Value', unit: 'short' };
    }
  }

  async testDatasource() {
    console.log('🔍 Testing datasource connection...');
    
    try {
      const response = await getBackendSrv().post(`/api/ds/healthcheck`, {
        datasource: {
          uid: this.instanceSettings.uid,
          type: this.instanceSettings.type,
        },
      });

      console.log('✅ Health check response:', response);

      if (response.status === 'OK') {
        return {
          status: 'success',
          message: response.message || 'Data source is working',
        };
      } else {
        return {
          status: 'error',
          message: response.message || 'Health check failed',
        };
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        status: 'error',
        message: 'Failed to connect to the API',
      };
    }
  }
}
