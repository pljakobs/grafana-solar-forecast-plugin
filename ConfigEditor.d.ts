import React, { ChangeEvent, PureComponent } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, SolarLocation } from './types';
interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {
}
interface State {
    showLocationModal: boolean;
    editingLocation: SolarLocation | null;
    newLocation: Partial<SolarLocation>;
}
export declare class ConfigEditor extends PureComponent<Props, State> {
    constructor(props: Props);
    onProviderChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    onApiKeyChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onResetApiKey: () => void;
    generateLocationId: () => string;
    onAddLocation: () => void;
    onEditLocation: (location: SolarLocation) => void;
    onDeleteLocation: (locationId: string) => void;
    onSaveLocation: () => void;
    onCloseLocationModal: () => void;
    onLocationFieldChange: (field: keyof SolarLocation, value: string | number) => void;
    render(): React.JSX.Element;
}
export {};
