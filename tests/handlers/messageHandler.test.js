const MessageHandler = require('../../src/handlers/messageHandler');

describe('MessageHandler', () => {
  let messageHandler;
  let mockGithub;
  let mockUserTracker;
  let mockSay;

  beforeEach(() => {
    mockGithub = {
      checkUsername: jest.fn(),
      sendInvite: jest.fn()
    };

    mockUserTracker = {
      hasBeenProcessed: jest.fn(),
      markAsProcessed: jest.fn()
    };

    mockSay = jest.fn();

    messageHandler = new MessageHandler(mockGithub, mockUserTracker);
  });

  describe('handleMessage', () => {
    test('ignores non-DM messages', async () => {
      const message = {
        channel_type: 'channel',
        text: 'testuser'
      };

      await messageHandler.handleMessage(message, mockSay);

      expect(mockGithub.checkUsername).not.toHaveBeenCalled();
      expect(mockSay).not.toHaveBeenCalled();
    });

    test('handles already processed users', async () => {
      const message = {
        channel_type: 'im',
        user: 'U123',
        ts: '123.456',
        text: 'testuser'
      };

      mockUserTracker.hasBeenProcessed.mockResolvedValueOnce(true);

      await messageHandler.handleMessage(message, mockSay);

      expect(mockUserTracker.hasBeenProcessed).toHaveBeenCalledWith('U123');
      expect(mockSay).toHaveBeenCalledWith({
        text: 'You\'ve already used this service to join the GitHub organization.',
        thread_ts: '123.456'
      });
      expect(mockGithub.checkUsername).not.toHaveBeenCalled();
    });

    test('handles invalid GitHub usernames', async () => {
      const message = {
        channel_type: 'im',
        user: 'U123',
        ts: '123.456',
        text: 'testuser'
      };

      mockUserTracker.hasBeenProcessed.mockResolvedValueOnce(false);
      mockGithub.checkUsername.mockResolvedValueOnce(null);

      await messageHandler.handleMessage(message, mockSay);

      expect(mockGithub.checkUsername).toHaveBeenCalledWith('testuser');
      expect(mockSay).toHaveBeenCalledWith({
        text: 'That doesn\'t appear to be a valid GitHub username. Please try again with a valid GitHub username.',
        thread_ts: '123.456'
      });
    });

    test('sends confirmation for valid GitHub usernames', async () => {
      const message = {
        channel_type: 'im',
        user: 'U123',
        ts: '123.456',
        text: 'testuser'
      };

      const githubUser = {
        login: 'testuser',
        html_url: 'https://github.com/testuser'
      };

      mockUserTracker.hasBeenProcessed.mockResolvedValueOnce(false);
      mockGithub.checkUsername.mockResolvedValueOnce(githubUser);

      await messageHandler.handleMessage(message, mockSay);

      expect(mockGithub.checkUsername).toHaveBeenCalledWith('testuser');
      expect(mockSay).toHaveBeenCalledWith({
        blocks: expect.arrayContaining([
          expect.objectContaining({
            text: expect.objectContaining({
              text: expect.stringContaining(githubUser.html_url)
            })
          })
        ]),
        thread_ts: '123.456'
      });
    });

    test('extracts username correctly from github join command', async () => {
      const message = {
        channel_type: 'im',
        user: 'U123',
        ts: '123.456',
        text: 'github join myusername'
      };

      const githubUser = {
        login: 'myusername',
        html_url: 'https://github.com/myusername'
      };

      mockUserTracker.hasBeenProcessed.mockResolvedValueOnce(false);
      mockGithub.checkUsername.mockResolvedValueOnce(githubUser);

      await messageHandler.handleMessage(message, mockSay);

      // Verify that only the username part was extracted and used
      expect(mockGithub.checkUsername).toHaveBeenCalledWith('myusername');
      expect(mockSay).toHaveBeenCalledWith({
        blocks: expect.arrayContaining([
          expect.objectContaining({
            text: expect.objectContaining({
              text: expect.stringContaining(githubUser.html_url)
            })
          })
        ]),
        thread_ts: '123.456'
      });
    });
  });

  describe('handleConfirmYes', () => {
    test('successfully processes GitHub invite', async () => {
      const body = {
        actions: [{ value: 'testuser' }],
        user: { id: 'U123' },
        message: { thread_ts: '123.456' }
      };
      const mockAck = jest.fn();

      mockGithub.sendInvite.mockResolvedValueOnce({ success: true });
      mockUserTracker.markAsProcessed.mockResolvedValueOnce(true);

      await messageHandler.handleConfirmYes({ body, ack: mockAck, say: mockSay });

      expect(mockAck).toHaveBeenCalled();
      expect(mockGithub.sendInvite).toHaveBeenCalledWith('testuser');
      expect(mockUserTracker.markAsProcessed).toHaveBeenCalledWith('U123');
      expect(mockSay).toHaveBeenCalledWith({
        text: expect.stringContaining('Great!'),
        thread_ts: '123.456'
      });
    });

    test('handles already-in-org error', async () => {
      const body = {
        actions: [{ value: 'testuser' }],
        user: { id: 'U123' },
        message: { thread_ts: '123.456' }
      };
      const mockAck = jest.fn();

      mockGithub.sendInvite.mockResolvedValueOnce({
        success: false,
        error: 'ALREADY_IN_ORG'
      });
      mockUserTracker.markAsProcessed.mockResolvedValueOnce(true);

      await messageHandler.handleConfirmYes({ body, ack: mockAck, say: mockSay });

      expect(mockAck).toHaveBeenCalled();
      expect(mockGithub.sendInvite).toHaveBeenCalledWith('testuser');
      expect(mockUserTracker.markAsProcessed).toHaveBeenCalledWith('U123');
      expect(mockSay).toHaveBeenCalledWith({
        text: expect.stringContaining('already been added'),
        thread_ts: '123.456'
      });
    });
  });

  describe('handleConfirmNo', () => {
    test('sends correct response', async () => {
      const body = {
        message: { thread_ts: '123.456' }
      };
      const mockAck = jest.fn();

      await messageHandler.handleConfirmNo({ body, ack: mockAck, say: mockSay });

      expect(mockAck).toHaveBeenCalled();
      expect(mockSay).toHaveBeenCalledWith({
        text: expect.stringContaining('correct GitHub username'),
        thread_ts: '123.456'
      });
    });
  });
});
