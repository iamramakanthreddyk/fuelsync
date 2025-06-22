import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 10000,
  roots: ['<rootDir>/tests'],
  globalSetup: '<rootDir>/jest.setup.js',
  globalTeardown: '<rootDir>/tests/teardown.ts',
};

export default config;
