# Solar Forecast Grafana Data Source Plugin

A powerful Grafana data source plugin for solar power forecasting, supporting both **Forecast.Solar** and **Solcast** APIs.

![Grafana Plugin](https://img.shields.io/badge/Grafana-10.0%2B-orange)
![License](https://img.shields.io/badge/License-Apache%202.0-blue)
![Status](https://img.shields.io/badge/Status-Stable-green)

## ✨ Features

- 🌞 **Dual API Support**: Compatible with both Forecast.Solar (free/paid) and Solcast APIs
- 📍 **Location Management**: Define and reuse solar installation locations in the datasource configuration
- 📊 **Multiple Data Types**: 
  - Power forecasts (watts)
  - Energy forecasts (watt-hours)
  - Daily energy summaries
  - Historical data (paid tiers)
- ⏰ **Flexible Time Periods**: Select "Today", "Tomorrow", specific days, or all available forecast data
- 🔐 **API Key Support**: Optional API keys for increased rate limits and premium features
- 📈 **Time Series Ready**: Optimized for Grafana time series visualizations
- 🎯 **Smart Caching**: Respects API rate limits with intelligent caching

## 🚀 Quick Start

### Installation

1. **Download** the latest release from the [releases page](https://github.com/your-repo/solar-forecast-datasource/releases)
2. **Extract** the plugin to your Grafana plugins directory:
   ```bash
   # Extract to Grafana plugins directory
   sudo unzip solar-forecast-datasource-v1.0.1.zip -d /var/lib/grafana/plugins/
   
   # Set proper permissions
   sudo chown -R grafana:grafana /var/lib/grafana/plugins/solar-forecast-datasource
   ```

3. **Configure Grafana** to allow unsigned plugins (add to `grafana.ini`):
   ```ini
   [plugins]
   allow_loading_unsigned_plugins = solar-forecast-datasource
   ```

4. **Restart Grafana**:
   ```bash
   sudo systemctl restart grafana-server
   ```

### Configuration

1. Navigate to **Configuration → Data Sources** in Grafana
2. Click **Add data source** and select **Solar Forecast**
3. Configure your settings:
   - **Provider**: Choose between Forecast.Solar or Solcast
   - **API Key**: (Optional for Forecast.Solar, Required for Solcast)
   - **Locations**: Add your solar installation locations

### Creating Panels

1. Create a new panel in your dashboard
2. Select **Solar Forecast** as the data source
3. Configure your query:
   - **Location**: Select from predefined locations or use custom parameters
   - **Metric**: Choose power, energy, or daily summary data
   - **Forecast Period**: Select time range (today, tomorrow, all days, etc.)

## 📖 Configuration Guide

### Provider Selection

#### Forecast.Solar
- **Free Tier**: 12 requests/hour
- **Paid Tier**: Higher rate limits with API key
- **Features**: Current and next-day forecasts, historical data (paid)

#### Solcast
- **Hobbyist**: 50 requests/day (requires API key)
- **Features**: High-accuracy forecasts, historical data

### Location Management

Define solar installations in the data source configuration:

- **Name**: Descriptive name for the location
- **Coordinates**: Latitude and longitude
- **System Parameters**:
  - **Tilt/Declination**: Panel angle (0-90°)
  - **Azimuth**: Panel orientation (0-360°, 180° = south)
  - **Peak Power**: System capacity in kWp

### Available Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| `watts` | Instantaneous power forecast | W |
| `watt_hours` | Cumulative energy forecast | Wh |
| `watt_hours_period` | Energy per time period | Wh |
| `watt_hours_day` | Daily energy totals | Wh |

## 🔧 Advanced Configuration

### Rate Limiting

- **Refresh Interval**: Set dashboard refresh to 30+ minutes to respect API limits
- **Caching**: Plugin automatically caches responses to minimize API calls
- **Smart Requests**: Only fetches new data when needed

### Time Series Optimization

The plugin returns all data as time series, optimized for:
- Line charts
- Area charts
- Stat panels
- Gauge panels

### Proxy Configuration

The plugin uses Grafana's proxy feature for secure API access:
- API keys are handled server-side
- CORS issues are automatically resolved
- Secure credential management

## 🐛 Troubleshooting

### Plugin Not Loading
1. Check Grafana logs: `sudo journalctl -u grafana-server -f`
2. Verify plugin is in unsigned plugins list
3. Ensure proper file permissions

### API Connection Issues
1. Verify API key configuration
2. Check rate limits in browser console
3. Test with free tier first (Forecast.Solar)

### Data Not Displaying
1. Check browser console for errors
2. Verify location coordinates
3. Ensure forecast period is valid

## 📊 Dashboard Examples

### Basic Power Forecast
- **Panel Type**: Time Series
- **Metric**: watts
- **Period**: Today
- **Visualization**: Line chart

### Daily Energy Summary
- **Panel Type**: Stat
- **Metric**: watt_hours_day
- **Period**: Today
- **Visualization**: Value with gauge

### Multi-Day Comparison
- **Panel Type**: Time Series
- **Metric**: watt_hours_day
- **Period**: All Available Days
- **Visualization**: Bar chart

## 🔐 Security

- API keys are stored securely in Grafana's secure JSON storage
- All API requests go through Grafana's proxy (no direct client calls)
- No sensitive data is logged or cached persistently

## 🤝 Contributing

Contributions are welcome! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

- [Forecast.Solar](https://forecast.solar/) - Free solar forecasting API
- [Solcast](https://solcast.com/) - Professional solar forecasting service
- [Grafana](https://grafana.com/) - Visualization platform

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/your-repo/solar-forecast-datasource/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-repo/solar-forecast-datasource/discussions)
- 📚 **Documentation**: [Wiki](https://github.com/your-repo/solar-forecast-datasource/wiki)

---

**Made with ☀️ for the solar community**
