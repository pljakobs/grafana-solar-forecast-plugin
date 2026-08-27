import { DataQueryRequest, DataQueryResponse, DataSourceApi, DataSourceInstanceSettings, MutableDataFrame } from '@grafana/data';
import { MyQuery, MyDataSourceOptions, SolarLocation } from './types';
export declare class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
    baseUrl: string;
    protected instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>;
    private cache;
    private readonly CACHE_TTL;
    private readonly MIN_CACHE_TTL;
    private lastApiCall;
    constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>);
    getProvider(): string;
    getLocations(): SolarLocation[];
    query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse>;
    doRequest(query: MyQuery, from: number, to: number): Promise<MutableDataFrame<any>>;
    private formatAsTimeSeries;
    private getFieldConfig;
    private parseTimestamp;
    private getCacheKey;
    private getEffectiveCacheTTL;
    fetchForecastSolarData(latitude: number, longitude: number, declination: number, azimuth: number, kwp: number, dataType?: string, metric?: string, startDate?: string, endDate?: string): Promise<any>;
    fetchForecastSolarDataViaProxy(latitude: number, longitude: number, declination: number, azimuth: number, kwp: number, dataType?: string, metric?: string, startDate?: string, endDate?: string): Promise<any>;
    processForecastSolarData(data: any, dataType?: string, metric?: string): Promise<any>;
    private mapMetricToKey;
    fetchSolcastData(latitude: number, longitude: number, solcastSiteId: string | undefined, secureJsonData: any): Promise<any>;
    testDatasource(): Promise<{
        status: string;
        message: string;
    }>;
    private mapForecastPeriodToDay;
    private getTargetDateFromPeriod;
}
