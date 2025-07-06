# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-07-06

### Added
- Complete frontend-only Grafana data source plugin for solar forecasting
- Support for both Forecast.Solar (free/paid tiers) and Solcast APIs
- Location management system in datasource configuration
- Multiple data types: power (watts), energy (watt-hours), daily summaries
- Flexible forecast period selection (today, tomorrow, all available days)
- Smart API key detection and automatic tier selection
- Comprehensive error handling and logging
- Rate limiting awareness and intelligent caching
- Time series optimization for Grafana visualizations

### Features
- **Dual Provider Support**: Forecast.Solar and Solcast integration
- **Location Management**: Define and reuse solar installation locations
- **Flexible Queries**: Select specific metrics and time periods
- **API Key Support**: Optional for Forecast.Solar, required for Solcast
- **Smart Caching**: Respects API rate limits
- **User-Friendly UI**: Intuitive configuration and query editors

### Technical Details
- Frontend-only implementation (TypeScript/React)
- Grafana 10.2.6+ compatibility
- Proxy-based API access for security and CORS handling
- No backend Go component required
- Automated build and deployment scripts

### Supported APIs
- **Forecast.Solar**
  - Free tier: 12 requests/hour
  - Paid tier: Higher limits with API key
  - Endpoints: `/estimate` (combined), `/history` (paid)
- **Solcast**
  - Hobbyist: 50 requests/day
  - Professional tiers available

### Metrics Available
- `watts`: Instantaneous power forecast
- `watt_hours`: Cumulative energy forecast  
- `watt_hours_period`: Energy per time period
- `watt_hours_day`: Daily energy totals
- `history_watthours`: Historical data (paid tiers)

### Installation
- Simple ZIP deployment to Grafana plugins directory
- Requires unsigned plugin configuration
- No external dependencies

## [1.0.0] - 2025-07-05

### Added
- Initial plugin structure and basic functionality
- Basic Forecast.Solar API integration
- Simple configuration interface

---

**Note**: This plugin is designed specifically for Grafana and requires Grafana 10.0 or later.
