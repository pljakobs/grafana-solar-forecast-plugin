import { DataQueryRequest, DataQueryResponse, DataSourceApi, DataSourceInstanceSettings, MutableDataFrame } from '@grafana/data';
import { MyQuery, MyDataSourceOptions } from './types';
export declare class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
    private settings;
    constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>);
    getProvider(): string;
    query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse>;
    doRequest(query: MyQuery, from: number, to: number): Promise<MutableDataFrame<any>>;
    private getFieldConfig;
    testDatasource(): Promise<{
        status: string;
        message: any;
    }>;
}
