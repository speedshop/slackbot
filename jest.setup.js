// Mock console.error before all tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Restore console.error after each test
afterEach(() => {
  console.error.mockRestore();
});
