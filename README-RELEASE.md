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
- 🎯 **Smart Caching**: Intelligent caching system that adapts to your dashboard refresh rate and respects API rate limits

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

### Rate Limiting & Caching

The plugin includes sophisticated caching to handle frequent dashboard refreshes:

- **Adaptive Cache TTL**: 
  - Daily summaries: 30 minutes cache
  - Power/Energy forecasts: 10-15 minutes cache
  - Solcast data: 30 minutes cache (due to strict limits)
- **Rate Limiting Protection**: Automatically prevents API calls more frequent than:
  - Forecast.Solar: 5 minutes minimum between calls
  - Solcast: 30 minutes minimum between calls
- **Intelligent Fallback**: Uses cached data when rate limits would be exceeded
- **Dashboard Compatibility**: Works reliably with 5-minute dashboard refresh rates

**Recommendation**: You can safely use 5-minute dashboard refresh intervals. The plugin will automatically cache data and prevent API rate limit exhaustion.

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

### Data Not Updating
1. Check browser console for cache status messages
2. Verify forecast period settings match your expectations
3. Remember that forecasts update on different schedules:
   - Forecast.Solar: Updates every few hours
   - Solcast: Updates multiple times per day
4. Force refresh by changing query parameters temporarily

### Caching Behavior
1. Check browser console for "Using cached data" vs "Fetching fresh data" messages
2. Cache age and TTL are logged for debugging
3. Rate limiting messages appear when protecting against API exhaustion
4. Clear browser cache to reset plugin cache if needed

### 🔍 API Debugging & Verification

If forecast values seem incorrect or you need to verify the API calls:

#### Enable Debug Logging
1. Open browser Developer Tools (F12)
2. Go to the **Console** tab
3. Refresh your dashboard or panel

#### Debug Information Available
The plugin logs comprehensive debug information to help verify API calls:

**URL Construction:**
- `🌐 **DEBUG** - Actual API URL that will be called` - Shows the exact URL that would be called directly
- `📋 **DEBUG** - Parameters` - Shows all parameters (lat, lng, tilt, azimuth, kWp)
- `📅 **DEBUG** - Date range` - Shows start/end dates for historical data

**API Response Analysis:**
- `📊 **DEBUG** - Raw API Response structure` - Shows what data fields are returned
- `📍 **DEBUG** - Forecast location confirmed` - Verifies the location was interpreted correctly
- `🏠 **DEBUG** - System info` - Shows the system parameters the API is using
- `📈 **DEBUG** - Sample values from each metric` - Shows sample data points for verification

**Rate Limiting & Caching:**
- `🚦 Forecast.Solar rate limit` - Shows remaining API calls and limits
- `Using cached data` vs `Fetching fresh data` - Shows when cache is used

#### Verify Your API Call Manually
Use the logged debug information to verify the API call manually:

1. **Copy the "Actual API URL"** from the console
2. **Replace `YOUR_API_KEY`** with your actual API key (if using paid tier)
3. **Test the URL directly** in your browser or with curl:

```bash
# Example for Forecast.Solar free tier
curl "https://api.forecast.solar/estimate/52.1/13.1/30/180/5.0"

# Example for Forecast.Solar paid tier (replace YOUR_API_KEY)
curl "https://api.forecast.solar/YOUR_API_KEY/estimate/52.1/13.1/30/180/5.0"

# Example for Solcast (replace YOUR_API_KEY and SITE_ID)
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "https://api.solcast.com.au/rooftop_sites/SITE_ID/forecasts"
```

#### Common Issues & Solutions

**Forecast values too low:**
1. Verify system capacity (kWp) matches your actual installation
2. Check tilt/declination angle (0° = flat, 30-45° typical for rooftops)
3. Verify azimuth (180° = south, 90° = east, 270° = west)
4. Ensure coordinates are accurate (use GPS coordinates, not postal codes)
5. Compare with weather conditions - cloudy days will show lower forecasts

**Forecast values too high:**
1. Check if you're using DC vs AC capacity (APIs typically expect DC)
2. Verify inverter efficiency and system losses aren't double-counted
3. Check if coordinates are correct (wrong location = wrong weather data)

**No data or errors:**
1. Check API key configuration and validity
2. Verify rate limits aren't exceeded (see console logs)
3. For Solcast: Ensure Site ID is correctly configured
4. For historical data: Verify you have a paid API key

**Historical data issues:**
- Historical data requires a **paid API key** for Forecast.Solar
- Check the date range - data may only be available for recent periods
- Verify the API response shows historical data vs forecast data

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
