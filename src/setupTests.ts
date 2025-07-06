// Jest setup file for testing environment
import '@testing-library/jest-dom';

// Mock Grafana runtime
Object.defineProperty(window, 'grafanaBootData', {
  value: {
    user: { orgId: 1 },
    settings: {},
  },
  writable: true,
});

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
