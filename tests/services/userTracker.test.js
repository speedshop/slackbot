const fs = require('fs').promises;
const path = require('path');
const UserTracker = require('../../src/services/userTracker');

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    appendFile: jest.fn()
  }
}));

describe('UserTracker', () => {
  let userTracker;
  const testFile = 'test-processed-users.txt';

  beforeEach(() => {
    jest.clearAllMocks();
    userTracker = new UserTracker(testFile);
  });

  describe('initialize', () => {
    test('creates file if it does not exist', async () => {
      fs.access.mockRejectedValueOnce(new Error('File not found'));

      await userTracker.initialize();

      expect(fs.access).toHaveBeenCalledWith(testFile);
      expect(fs.writeFile).toHaveBeenCalledWith(testFile, '');
    });

    test('does nothing if file exists', async () => {
      fs.access.mockResolvedValueOnce();

      await userTracker.initialize();

      expect(fs.access).toHaveBeenCalledWith(testFile);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('hasBeenProcessed', () => {
    test('returns true if user ID is in file', async () => {
      fs.readFile.mockResolvedValueOnce('user1\nuser2\nuser3\n');

      const result = await userTracker.hasBeenProcessed('user2');

      expect(result).toBe(true);
      expect(fs.readFile).toHaveBeenCalledWith(testFile, 'utf8');
    });

    test('returns false if user ID is not in file', async () => {
      fs.readFile.mockResolvedValueOnce('user1\nuser2\nuser3\n');

      const result = await userTracker.hasBeenProcessed('user4');

      expect(result).toBe(false);
      expect(fs.readFile).toHaveBeenCalledWith(testFile, 'utf8');
    });

    test('handles file read errors', async () => {
      fs.readFile.mockRejectedValueOnce(new Error('Read error'));

      const result = await userTracker.hasBeenProcessed('user1');

      expect(result).toBe(false);
      expect(fs.readFile).toHaveBeenCalledWith(testFile, 'utf8');
    });
  });

  describe('markAsProcessed', () => {
    test('successfully adds user ID to file', async () => {
      fs.appendFile.mockResolvedValueOnce();

      const result = await userTracker.markAsProcessed('user1');

      expect(result).toBe(true);
      expect(fs.appendFile).toHaveBeenCalledWith(testFile, 'user1\n');
    });

    test('handles file write errors', async () => {
      fs.appendFile.mockRejectedValueOnce(new Error('Write error'));

      const result = await userTracker.markAsProcessed('user1');

      expect(result).toBe(false);
      expect(fs.appendFile).toHaveBeenCalledWith(testFile, 'user1\n');
    });
  });
});
