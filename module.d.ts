import { DataSourcePlugin } from '@grafana/data';
import { DataSource } from './datasource_proxy';
import { MyQuery, MyDataSourceOptions } from './types';
export declare const plugin: DataSourcePlugin<DataSource, MyQuery, MyDataSourceOptions, {}>;
