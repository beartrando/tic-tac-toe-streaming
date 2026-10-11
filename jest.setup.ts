/// <reference types="jest" />

// Mock logger to avoid noise in tests
jest.mock('@shared/logger', () => ({
    log: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

// Global test timeout
jest.setTimeout(10000);
