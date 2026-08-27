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
    dataType?: string;
    locationId?: string;
    useCustomLocation?: boolean;
    latitude?: number;
    longitude?: number;
    declination?: number;
    azimuth?: number;
    kwp?: number;
    solcastSiteId?: string;
    startDate?: string;
    endDate?: string;
    forecastPeriod?: string;
}
export declare const DEFAULT_QUERY: Partial<MyQuery>;
export declare const METRIC_OPTIONS: {
    label: string;
    value: string;
}[];
export declare const DATA_TYPE_OPTIONS: {
    label: string;
    value: string;
}[];
export declare const FORECAST_PERIOD_OPTIONS: {
    label: string;
    value: string;
}[];
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
