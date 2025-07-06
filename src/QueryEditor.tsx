import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource_proxy';
import { DEFAULT_QUERY, MyDataSourceOptions, MyQuery, METRIC_OPTIONS, DATA_TYPE_OPTIONS, FORECAST_PERIOD_OPTIONS, SolarLocation } from './types';

const { FormField } = LegacyForms;

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export class QueryEditor extends PureComponent<Props> {
  onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, queryText: event.target.value });
  };

  onMetricChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, metric: event.target.value });
    onRunQuery();
  };

  onLatitudeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, latitude: parseFloat(event.target.value) || undefined });
    onRunQuery();
  };

  onLongitudeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, longitude: parseFloat(event.target.value) || undefined });
    onRunQuery();
  };

  onDeclinationChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, declination: parseFloat(event.target.value) || undefined });
    onRunQuery();
  };

  onAzimuthChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, azimuth: parseFloat(event.target.value) || undefined });
    onRunQuery();
  };

  onKwpChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, kwp: parseFloat(event.target.value) || undefined });
    onRunQuery();
  };

  onDataTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, dataType: event.target.value });
    onRunQuery();
  };

  onStartDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, startDate: event.target.value });
    onRunQuery();
  };

  onEndDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, endDate: event.target.value });
    onRunQuery();
  };

  onSolcastSiteIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, solcastSiteId: event.target.value });
    onRunQuery();
  };

  onForecastPeriodChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, forecastPeriod: event.target.value });
    onRunQuery();
  };

  onLocationChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    const selectedLocationId = event.target.value;
    
    if (selectedLocationId === 'custom') {
      // Switch to custom location mode
      onChange({ ...query, locationId: undefined, useCustomLocation: true });
    } else if (selectedLocationId) {
      // Use predefined location
      const { datasource } = this.props;
      const locations = datasource.getLocations() as SolarLocation[];
      const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
      
      if (selectedLocation) {
        onChange({ 
          ...query, 
          locationId: selectedLocationId,
          useCustomLocation: false,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          declination: selectedLocation.declination,
          azimuth: selectedLocation.azimuth,
          kwp: selectedLocation.kwp
        });
      }
    }
    onRunQuery();
  };

  onUseCustomLocationChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, useCustomLocation: event.target.checked, locationId: undefined });
    onRunQuery();
  };

  render() {
    const query = { ...DEFAULT_QUERY, ...this.props.query };
    const { queryText, metric, dataType, latitude, longitude, declination, azimuth, kwp, solcastSiteId, startDate, endDate, forecastPeriod } = query;
    const { datasource } = this.props;
    // Use the public getProvider method
    const provider = datasource.getProvider();

    return (
      <div>
        <div className="gf-form">
          <FormField
            width={4}
            value={queryText || ''}
            onChange={this.onQueryTextChange}
            label="Query"
            tooltip="Enter query description"
          />
          <FormField
            label="Data Type"
            labelWidth={6}
            inputEl={
              <select
                className="gf-form-input"
                value={dataType || 'forecast'}
                onChange={this.onDataTypeChange}
              >
                {DATA_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            }
          />
          <FormField
            label="Metric"
            labelWidth={6}
            inputEl={
              <select
                className="gf-form-input"
                value={metric || 'watts'}
                onChange={this.onMetricChange}
              >
                {METRIC_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            }
          />
        </div>

        {/* Forecast Period Selection */}
        {dataType === 'forecast' && (
          <div className="gf-form">
            <FormField
              label="Period"
              labelWidth={6}
              inputEl={
                <select
                  className="gf-form-input"
                  value={query.forecastPeriod || 'all'}
                  onChange={this.onForecastPeriodChange}
                >
                  {FORECAST_PERIOD_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              }
            />
          </div>
        )}

        {/* Location Selection */}
        <div className="gf-form">
          <FormField
            label="Location"
            labelWidth={6}
            inputEl={
              <select
                className="gf-form-input"
                value={query.useCustomLocation ? 'custom' : (query.locationId || '')}
                onChange={this.onLocationChange}
              >
                <option value="">Select a location...</option>
                {(datasource.getLocations() as SolarLocation[]).map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.kwp} kWp)
                  </option>
                ))}
                <option value="custom">🔧 Custom Parameters</option>
              </select>
            }
          />
        </div>

        {dataType === 'historical' && provider === 'forecast.solar' && (
          <div className="gf-form-inline">
            <div className="gf-form">
              <FormField
                width={8}
                value={startDate || ''}
                onChange={this.onStartDateChange}
                label="Start Date"
                placeholder="YYYY-MM-DD"
                tooltip="Start date for historical data (YYYY-MM-DD format)"
                type="date"
              />
            </div>
            <div className="gf-form">
              <FormField
                width={8}
                value={endDate || ''}
                onChange={this.onEndDateChange}
                label="End Date"
                placeholder="YYYY-MM-DD"
                tooltip="End date for historical data (YYYY-MM-DD format)"
                type="date"
              />
            </div>
          </div>
        )}

        {/* Location Parameters - only show when using custom location or no locations configured */}
        {(query.useCustomLocation || !(datasource.getLocations() as SolarLocation[]).length) && (
          <>
            <div className="gf-form-inline">
              <div className="gf-form">
                <FormField
                  width={8}
                  value={latitude || ''}
                  onChange={this.onLatitudeChange}
                  label="Latitude"
                  placeholder="51.13"
                  tooltip="Location latitude in decimal degrees"
                />
              </div>
              <div className="gf-form">
                <FormField
                  width={8}
                  value={longitude || ''}
                  onChange={this.onLongitudeChange}
                  label="Longitude"
                  placeholder="10.42"
                  tooltip="Location longitude in decimal degrees"
                />
              </div>
            </div>

            {provider === 'forecast.solar' && (
              <>
                <div className="gf-form-inline">
                  <div className="gf-form">
                    <FormField
                      width={8}
                      value={declination || ''}
                      onChange={this.onDeclinationChange}
                      label="Declination"
                      placeholder="30"
                      tooltip="Solar panel declination angle in degrees (0=horizontal, 90=vertical)"
                    />
                  </div>
                  <div className="gf-form">
                    <FormField
                      width={8}
                      value={azimuth || ''}
                      onChange={this.onAzimuthChange}
                      label="Azimuth"
                      placeholder="180"
                      tooltip="Solar panel azimuth angle in degrees (180=south, 90=east, 270=west)"
                    />
                  </div>
                </div>

                <div className="gf-form">
                  <FormField
                    width={8}
                    value={kwp || ''}
                    onChange={this.onKwpChange}
                    label="Peak Power (kWp)"
                    placeholder="5.0"
                    tooltip="Solar installation peak power in kilowatts"
                    type="number"
                    step="0.1"
                  />
                </div>
              </>
            )}
          </>
        )}

        {provider === 'solcast' && (
          <div className="gf-form">
            <FormField
              width={8}
              value={solcastSiteId || ''}
              onChange={this.onSolcastSiteIdChange}
              label="Solcast Site ID"
              placeholder="xxxx-xxxx-xxxx-xxxx"
              tooltip="Your Solcast site identifier"
            />
          </div>
        )}
      </div>
    );
  }
}
