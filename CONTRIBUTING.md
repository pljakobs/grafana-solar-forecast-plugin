# Contributing to Solar Forecast Grafana Plugin

Thank you for your interest in contributing to the Solar Forecast Grafana Plugin! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (version 18 or later)
- **npm** (comes with Node.js)
- **Grafana** (version 10.0 or later for testing)
- **Git**

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/solar-forecast-datasource.git
   cd solar-forecast-datasource
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

4. **Build Plugin**
   ```bash
   npm run build
   ```

## 🛠️ Development Workflow

### Code Structure

```
src/
├── ConfigEditor.tsx    # Data source configuration UI
├── QueryEditor.tsx     # Query builder UI
├── datasource_proxy.ts # Main data source logic
├── types.ts           # TypeScript type definitions
└── module.ts          # Plugin entry point
```

### Key Files

- **`plugin.json`**: Plugin metadata and proxy routes
- **`package.json`**: Dependencies and build scripts
- **`webpack.config.js`**: Build configuration
- **`tsconfig.json`**: TypeScript configuration

### Available Scripts

```bash
npm run dev          # Development build with watch
npm run build        # Production build
npm run test         # Run tests
npm run lint         # Run linting
npm run lint:fix     # Fix linting issues
npm run typecheck    # TypeScript type checking
npm run package      # Build and package plugin
```

## 🧪 Testing

### Local Testing

1. **Build the plugin**
   ```bash
   npm run build
   ```

2. **Deploy to local Grafana**
   ```bash
   # Copy to Grafana plugins directory
   sudo cp -r dist/* /var/lib/grafana/plugins/solar-forecast-datasource/
   sudo chown -R grafana:grafana /var/lib/grafana/plugins/solar-forecast-datasource
   
   # Restart Grafana
   sudo systemctl restart grafana-server
   ```

3. **Configure Grafana** to allow unsigned plugins in `grafana.ini`:
   ```ini
   [plugins]
   allow_loading_unsigned_plugins = solar-forecast-datasource
   ```

### Test APIs

- **Forecast.Solar Free**: No API key required, 12 requests/hour
- **Forecast.Solar Paid**: Requires API key for higher limits
- **Solcast**: Requires API key, 50 requests/day for hobbyist tier

## 📝 Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Define proper interfaces for all data structures
- Avoid `any` types when possible
- Use meaningful variable and function names

### React/UI

- Use functional components with hooks
- Follow Grafana UI component patterns
- Implement proper error handling
- Add loading states for API calls

### Code Style

- Run `npm run lint` before committing
- Follow consistent indentation (2 spaces)
- Use meaningful commit messages
- Add comments for complex logic

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment Information**
   - Grafana version
   - Plugin version
   - Browser and version
   - Operating system

2. **Steps to Reproduce**
   - Detailed steps to reproduce the issue
   - Expected vs. actual behavior
   - Screenshots if applicable

3. **Configuration**
   - Data source configuration (API provider, settings)
   - Query configuration
   - Panel type and settings

4. **Logs**
   - Browser console errors
   - Grafana server logs (if relevant)
   - Network request details

## ✨ Feature Requests

We welcome feature requests! Please:

1. **Check existing issues** to avoid duplicates
2. **Describe the use case** clearly
3. **Explain the expected behavior**
4. **Consider implementation complexity**

### Popular Feature Ideas

- Additional solar forecast providers
- Advanced caching strategies
- More visualization options
- Historical data analysis tools
- Weather data integration

## 🔄 Pull Request Process

1. **Fork the repository** and create a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes** following coding standards

3. **Test thoroughly**
   - Run existing tests: `npm test`
   - Test manually with Grafana
   - Verify no linting errors: `npm run lint`

4. **Update documentation** if needed
   - Update README.md if adding features
   - Update CHANGELOG.md
   - Add JSDoc comments for new functions

5. **Commit with descriptive messages**
   ```bash
   git commit -m "feat: add support for new forecast provider"
   ```

6. **Push and create pull request**
   ```bash
   git push origin feature/amazing-feature
   ```

### Pull Request Guidelines

- **One feature per PR**: Keep changes focused
- **Descriptive title**: Summarize the change clearly
- **Detailed description**: Explain what, why, and how
- **Link issues**: Reference related issues
- **Update tests**: Add tests for new functionality

## 🏗️ Architecture Notes

### Plugin Design

- **Frontend-only**: No backend Go component required
- **Proxy-based**: Uses Grafana's proxy for API calls
- **Provider-agnostic**: Supports multiple forecast APIs
- **Time series optimized**: Returns data in Grafana time series format

### API Integration

- **Rate limiting aware**: Implements intelligent caching
- **Error handling**: Graceful degradation for API failures
- **Secure**: API keys handled server-side via proxy

### Data Flow

1. User configures data source (provider, API key, locations)
2. User creates query (location, metric, time period)
3. Plugin fetches data via Grafana proxy
4. Data is transformed to time series format
5. Grafana renders visualization

## 📊 Performance Considerations

- **Caching**: Minimize API calls through smart caching
- **Rate limits**: Respect provider rate limiting
- **Bundle size**: Keep plugin size minimal
- **Memory usage**: Efficient data handling

## 🔐 Security Guidelines

- **API keys**: Never expose in frontend code
- **Validation**: Validate all user inputs
- **Sanitization**: Sanitize data before processing
- **Dependencies**: Keep dependencies updated

## 📚 Resources

### Grafana Plugin Development
- [Grafana Plugin Documentation](https://grafana.com/developers/plugin-tools/)
- [Grafana UI Components](https://developers.grafana.com/ui/)
- [Data Source Plugin Tutorial](https://grafana.com/tutorials/build-a-data-source-plugin/)

### Solar Forecast APIs
- [Forecast.Solar Documentation](https://doc.forecast.solar/)
- [Solcast API Documentation](https://docs.solcast.com.au/)

### Development Tools
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Webpack Documentation](https://webpack.js.org/)

## 🤝 Community

- **Issues**: Use GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions and ideas
- **Code of Conduct**: Be respectful and inclusive

## 📄 License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

---

Thank you for contributing to the solar energy monitoring community! ☀️
