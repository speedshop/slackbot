const UserTracker = require('../../src/services/userTracker');

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockSend
  })),
  HeadObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input }))
}));

describe('UserTracker', () => {
  let userTracker;

  beforeEach(() => {
    jest.clearAllMocks();
    userTracker = new UserTracker({
      accountId: 'acc123',
      accessKeyId: 'key123',
      secretAccessKey: 'secret123',
      bucket: 'railsperf-processed-users',
      region: 'auto'
    });
  });

  describe('initialize', () => {
    test('returns true', async () => {
      const result = await userTracker.initialize();
      expect(result).toBe(true);
    });
  });

  describe('hasBeenProcessed', () => {
    test('returns true when marker exists', async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await userTracker.hasBeenProcessed('U123');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'railsperf-processed-users',
          Key: 'U123.json'
        })
      }));
    });

    test('returns false when marker does not exist', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 }
      });

      const result = await userTracker.hasBeenProcessed('U123');

      expect(result).toBe(false);
    });

    test('returns false on unexpected errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('boom'));

      const result = await userTracker.hasBeenProcessed('U123');

      expect(result).toBe(false);
    });
  });

  describe('markAsProcessed', () => {
    test('writes marker object and returns true', async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await userTracker.markAsProcessed('U123');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'railsperf-processed-users',
          Key: 'U123.json',
          ContentType: 'application/json'
        })
      }));
    });

    test('returns false when marker write fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('write failed'));

      const result = await userTracker.markAsProcessed('U123');

      expect(result).toBe(false);
    });
  });
});
