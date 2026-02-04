// Jest Setup File
import 'jest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

// Increase test timeout for async operations
jest.setTimeout(10000);

// Global mocks can go here if needed
