// Mock Pino logger
jest.mock('./src/config/logger', () => {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
