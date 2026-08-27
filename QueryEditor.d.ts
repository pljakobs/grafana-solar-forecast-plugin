import React, { ChangeEvent, PureComponent } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource_proxy';
import { MyDataSourceOptions, MyQuery } from './types';
type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;
export declare class QueryEditor extends PureComponent<Props> {
    onQueryTextChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onMetricChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    onLatitudeChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onLongitudeChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onDeclinationChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onAzimuthChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onKwpChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onDataTypeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    onStartDateChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onEndDateChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onSolcastSiteIdChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onForecastPeriodChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    onLocationChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    onUseCustomLocationChange: (event: ChangeEvent<HTMLInputElement>) => void;
    render(): React.JSX.Element;
}
export {};
