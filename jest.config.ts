// Jest Configuration for Financial Engine Tests
// Version: v1.0 (2025-10-13)

import type { Config } from 'jest';
import nextJest from 'next/jest';

// Create Jest config with Next.js
const createJestConfig = nextJest({
  dir: './'
});

const config: Config = {
  // Test environment
  testEnvironment: 'node',

  // Transform files
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest'
  },

  // Test roots
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],

  // Module paths
  modulePaths: ['<rootDir>'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1'
  },

  // Coverage
  collectCoverageFrom: [
    'src/lib/financial-engine/**/*.{ts,tsx}',
    'src/app/api/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**'
  ],

  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Display options
  verbose: true
};

export default createJestConfig(config);
