import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData, SolarLocation } from './types';

const { SecretFormField, FormField } = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

interface State {
  showLocationModal: boolean;
  editingLocation: SolarLocation | null;
  newLocation: Partial<SolarLocation>;
}

export class ConfigEditor extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      showLocationModal: false,
      editingLocation: null,
      newLocation: {
        name: '',
        latitude: 51.13,
        longitude: 10.42,
        declination: 30,
        azimuth: 180,
        kwp: 5.0,
        description: '',
      },
    };
  }

  onProviderChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { onOptionsChange, options } = this.props as any;
    const jsonData = {
      ...options.jsonData,
      provider: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  onApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props as any;
    const hasApiKey = event.target.value.trim().length > 0;
    
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        hasApiKey: hasApiKey,  // Add a flag to indicate API key presence
      },
      secureJsonFields: {
        ...options.secureJsonFields,
        apiKey: hasApiKey,  // Mark that an API key is configured
      },
      secureJsonData: {
        apiKey: event.target.value,
      },
    });
  };

  onResetApiKey = () => {
    const { onOptionsChange, options } = this.props as any;
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        hasApiKey: false,  // Clear the API key flag
      },
      secureJsonFields: {
        ...options.secureJsonFields,
        apiKey: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        apiKey: '',
      },
    });
  };

  // Location management methods
  generateLocationId = (): string => {
    return 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  onAddLocation = () => {
    this.setState({
      showLocationModal: true,
      editingLocation: null,
      newLocation: {
        name: '',
        latitude: 51.13,
        longitude: 10.42,
        declination: 30,
        azimuth: 180,
        kwp: 5.0,
        description: '',
      },
    });
  };

  onEditLocation = (location: SolarLocation) => {
    this.setState({
      showLocationModal: true,
      editingLocation: location,
      newLocation: { ...location },
    });
  };

  onDeleteLocation = (locationId: string) => {
    const { onOptionsChange, options } = this.props as any;
    const currentLocations = options.jsonData.locations || [];
    const updatedLocations = currentLocations.filter((loc: SolarLocation) => loc.id !== locationId);
    
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        locations: updatedLocations,
      },
    });
  };

  onSaveLocation = () => {
    const { onOptionsChange, options } = this.props as any;
    const { editingLocation, newLocation } = this.state;
    
    console.log('=== Saving Location Debug ===');
    console.log('newLocation:', newLocation);
    console.log('editingLocation:', editingLocation);
    console.log('current options:', options);
    
    if (!newLocation.name?.trim()) {
      alert('Please enter a location name');
      return;
    }

    const currentLocations = options.jsonData.locations || [];
    console.log('currentLocations:', currentLocations);
    
    let updatedLocations;

    if (editingLocation) {
      // Edit existing location
      updatedLocations = currentLocations.map((loc: SolarLocation) =>
        loc.id === editingLocation.id ? { ...newLocation, id: editingLocation.id } : loc
      );
    } else {
      // Add new location
      const locationToAdd: SolarLocation = {
        ...newLocation as SolarLocation,
        id: this.generateLocationId(),
      };
      console.log('locationToAdd:', locationToAdd);
      updatedLocations = [...currentLocations, locationToAdd];
    }

    console.log('updatedLocations:', updatedLocations);

    const newOptions = {
      ...options,
      jsonData: {
        ...options.jsonData,
        locations: updatedLocations,
      },
    };
    
    console.log('newOptions being saved:', newOptions);
    onOptionsChange(newOptions);

    this.setState({ showLocationModal: false });
  };

  onCloseLocationModal = () => {
    this.setState({ showLocationModal: false });
  };

  onLocationFieldChange = (field: keyof SolarLocation, value: string | number) => {
    this.setState({
      newLocation: {
        ...this.state.newLocation,
        [field]: value,
      },
    });
  };

  render() {
    const { options } = this.props as any;
    const { jsonData, secureJsonFields } = options;
    const secureJsonData = (options.secureJsonData || {}) as MySecureJsonData;

    console.log('=== ConfigEditor Render Debug ===');
    console.log('options:', options);
    console.log('jsonData:', jsonData);
    console.log('jsonData.locations:', jsonData.locations);

    return (
      <div className="gf-form-group">
        <div className="gf-form">
          <FormField
            label="Provider"
            labelWidth={10}
            inputEl={
              <select
                className="gf-form-input"
                value={jsonData.provider || 'forecast.solar'}
                onChange={this.onProviderChange}
              >
                <option value="forecast.solar">Forecast.Solar</option>
                <option value="solcast">Solcast</option>
              </select>
            }
          />
        </div>

        <div className="gf-form-inline">
          <div className="gf-form">
            <SecretFormField
              isConfigured={(secureJsonFields && secureJsonFields.apiKey) as boolean}
              value={secureJsonData.apiKey || ''}
              label="API Key"
              placeholder={jsonData.provider === 'solcast' ? 'Required for Solcast' : 'Optional - increases rate limits'}
              labelWidth={10}
              inputWidth={20}
              onReset={this.onResetApiKey}
              onChange={this.onApiKeyChange}
            />
          </div>
        </div>

        <div className="gf-form-group">
          <h6>Solar Locations</h6>
          <div className="gf-form">
            <div className="gf-form-label width-12">
              <span>Manage predefined solar installation locations for easy selection in panels.</span>
            </div>
          </div>
          
          {/* Add Location Button */}
          <div className="gf-form">
            <button className="btn btn-primary" onClick={this.onAddLocation}>
              Add Location
            </button>
          </div>
          
          {/* Location List */}
          {(jsonData.locations || []).length === 0 ? (
            <div className="gf-form">
              <div className="gf-form-label width-12">
                <span style={{ fontStyle: 'italic', color: '#888' }}>No locations configured. Add a location to get started.</span>
              </div>
            </div>
          ) : (
            <div className="gf-form">
              <div style={{ width: '100%' }}>
                {(jsonData.locations || []).map((location: SolarLocation) => (
                  <div 
                    key={location.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '12px', 
                      padding: '12px', 
                      border: '1px solid #444', 
                      borderRadius: '4px',
                      backgroundColor: '#1e1e1e'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                        {location.name}
                      </div>
                      {location.description && (
                        <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                          {location.description}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {location.latitude}°N, {location.longitude}°E | {location.declination}° tilt, {location.azimuth}° azimuth | {location.kwp} kWp
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary btn-small" 
                        onClick={() => this.onEditLocation(location)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger btn-small" 
                        onClick={() => this.onDeleteLocation(location.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="gf-form-group">
          <h6>Configuration</h6>
          <div className="gf-form">
            <div style={{ width: '100%', fontSize: '13px', color: '#888' }}>
              Location and panel parameters are configured per-query in the panel editor.
            </div>
          </div>
        </div>

        <div className="gf-form-group">
          <h6>Rate Limiting Info</h6>
          <div className="gf-form">
            <div style={{ width: '100%' }}>
              <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                <strong>API Limits:</strong> {jsonData.provider === 'solcast' ? (
                  'Solcast: 50 requests/day (hobbyist)'
                ) : (
                  'Forecast.Solar: 12 requests/hour (free), higher with API key'
                )}
              </div>
              <div style={{ fontSize: '13px', color: '#888' }}>
                <strong>Recommended:</strong> Dashboard refresh 30+ minutes to avoid rate limits
              </div>
            </div>
          </div>
        </div>

        {/* Location Modal */}
        {this.state.showLocationModal && (
          <div className="modal-backdrop" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              backgroundColor: '#1e1e1e',
              padding: '20px',
              borderRadius: '4px',
              minWidth: '500px',
              maxWidth: '600px'
            }}>
              <h5>{this.state.editingLocation ? 'Edit Location' : 'Add New Location'}</h5>
              
              <div className="gf-form">
                <FormField
                  label="Name"
                  labelWidth={10}
                  value={this.state.newLocation.name || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => this.onLocationFieldChange('name', e.target.value)}
                  placeholder="e.g. Home Solar, Office Roof"
                />
              </div>

              <div className="gf-form">
                <FormField
                  label="Description"
                  labelWidth={10}
                  value={this.state.newLocation.description || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => this.onLocationFieldChange('description', e.target.value)}
                  placeholder="Optional description"
                />
              </div>

              <div className="gf-form">
                <FormField
                  label="Latitude"
                  labelWidth={10}
                  type="number"
                  step="0.000001"
                  value={this.state.newLocation.latitude || 0}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => this.onLocationFieldChange('latitude', parseFloat(e.target.value))}
                />
              </div>

              <div className="gf-form">
                <FormField
                  label="Longitude"
                  labelWidth={10}
                  type="number"
                  step="0.000001"
                  value={this.state.newLocation.longitude || 0}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => this.onLocationFieldChange('longitude', parseFloat(e.target.value))}
                />
              </div>

              <div className="gf-form">
                <FormField
                  label="Tilt/Declination (°)"
                  labelWidth={10}
                  type="number"
                  step="1"
                  value={this.state.newLocation.declination || 0}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => this.onLocationFieldChange('declination', parseFloat(e.target.value))}
                />
              </div>

              <div className="gf-form">
                <FormField
                  label="Azimuth (°)"
                  labelWidth={10}
                  type="number"
                  step="1"
                  value={this.state.newLocation.azimuth || 0}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => this.onLocationFieldChange('azimuth', parseFloat(e.target.value))}
                />
              </div>

              <div className="gf-form">
                <FormField
                  label="Peak Power (kWp)"
                  labelWidth={10}
                  type="number"
                  step="0.1"
                  value={this.state.newLocation.kwp || 0}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => this.onLocationFieldChange('kwp', parseFloat(e.target.value))}
                />
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={this.onCloseLocationModal}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={this.onSaveLocation}>
                  {this.state.editingLocation ? 'Update' : 'Add'} Location
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
