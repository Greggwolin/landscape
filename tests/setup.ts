// Jest Test Setup
// Version: v1.0 (2025-10-13)

// Extend Jest matchers
import '@testing-library/jest-dom';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.POSTGRES_URL = process.env.TEST_DATABASE_URL || process.env.POSTGRES_URL;

// Global test timeout
jest.setTimeout(10000);

// Suppress console logs in tests (optional)
if (process.env.SUPPRESS_TEST_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  };
}
