import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface SolarLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  declination: number;
  azimuth: number;
  kwp: number;
  description?: string;
}

export interface MyQuery extends DataQuery {
  refId: string;
  queryText?: string;
  metric?: string;
  dataType?: string; // 'forecast' or 'historical'
  
  // Location selection
  locationId?: string; // ID of predefined location
  useCustomLocation?: boolean; // If true, use individual parameters below
  
  // Individual location parameters (fallback/custom)
  latitude?: number;
  longitude?: number;
  declination?: number;
  azimuth?: number;
  kwp?: number;
  solcastSiteId?: string;
  
  // Historical data options
  startDate?: string; // YYYY-MM-DD format
  endDate?: string;   // YYYY-MM-DD format
  
  // Forecast period selection - replaces old format/forecastDay
  forecastPeriod?: string; // 'today', 'tomorrow', 'day+2', 'day+3', 'all'
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  queryText: 'forecast',
  metric: 'watts',
  dataType: 'forecast',
  useCustomLocation: false,
  latitude: 51.13,
  longitude: 10.42,
  declination: 30,
  azimuth: 180,
  kwp: 5.0,
  forecastPeriod: 'all',
};

export const METRIC_OPTIONS = [
  { label: 'Power (Watts)', value: 'watts' },
  { label: 'Energy per Period (Wh)', value: 'watt_hours_period' },
  { label: 'Energy Accumulated (Wh)', value: 'watt_hours' },
  { label: 'Daily Energy Summary (Wh/day)', value: 'watt_hours_day' },
];

export const DATA_TYPE_OPTIONS = [
  { label: 'Forecast Data', value: 'forecast' },
  { label: 'Historical Data', value: 'historical' },
];

export const FORECAST_PERIOD_OPTIONS = [
  { label: 'All Available Days', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Tomorrow', value: 'tomorrow' },
  { label: 'Day After Tomorrow', value: 'day+2' },
  { label: 'Day +3', value: 'day+3' },
  { label: 'Day +4', value: 'day+4' },
  { label: 'Day +5', value: 'day+5' },
  { label: 'Day +6', value: 'day+6' },
];

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  provider?: string;
  locations?: SolarLocation[];
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey?: string;
}
