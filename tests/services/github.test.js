const nock = require('nock');
const GitHubService = require('../../src/services/github');

describe('GitHubService', () => {
  let github;

  beforeEach(() => {
    nock.cleanAll();
    github = new GitHubService('test-token', 'test-org', '12345');
  });

  afterEach(() => {
    expect(nock.isDone()).toBe(true);
  });

  describe('checkUsername', () => {
    test('validates existing GitHub username', async () => {
      const username = 'testuser';
      const mockResponse = {
        login: username,
        id: 12345,
        html_url: 'https://github.com/testuser'
      };

      nock('https://api.github.com')
        .get(`/users/${username}`)
        .matchHeader('Authorization', 'token test-token')
        .reply(200, mockResponse);

      const result = await github.checkUsername(username);
      expect(result).toEqual(mockResponse);
    });

    test('returns null for non-existent GitHub username', async () => {
      const username = 'nonexistentuser';

      nock('https://api.github.com')
        .get(`/users/${username}`)
        .reply(404);

      const result = await github.checkUsername(username);
      expect(result).toBeNull();
    });

    test('handles network errors gracefully', async () => {
      const username = 'testuser';

      nock('https://api.github.com')
        .get(`/users/${username}`)
        .replyWithError('Network error');

      const result = await github.checkUsername(username);
      expect(result).toBeNull();
    });
  });

  describe('sendInvite', () => {
    test('successfully sends GitHub organization invite', async () => {
      const username = 'testuser';
      const userId = 12345;

      // Mock the user lookup
      nock('https://api.github.com')
        .get(`/users/${username}`)
        .reply(200, { id: userId });

      // Mock the invitation request
      nock('https://api.github.com')
        .post(`/orgs/test-org/invitations`, {
          invitee_id: userId,
          team_ids: [12345]
        })
        .reply(201);

      const result = await github.sendInvite(username);
      expect(result).toEqual({ success: true, error: null });
    });

    test('handles already-in-org error', async () => {
      const username = 'existinguser';
      const userId = 12345;

      nock('https://api.github.com')
        .get(`/users/${username}`)
        .reply(200, { id: userId });

      nock('https://api.github.com')
        .post(`/orgs/test-org/invitations`)
        .reply(422, {
          message: 'Validation Failed',
          errors: [{
            resource: 'OrganizationInvitation',
            code: 'unprocessable',
            field: 'data',
            message: 'Invitee is already a part of this organization'
          }]
        });

      const result = await github.sendInvite(username);
      expect(result).toEqual({ success: false, error: 'ALREADY_IN_ORG' });
    });

    test('handles user lookup failure', async () => {
      const username = 'testuser';

      nock('https://api.github.com')
        .get(`/users/${username}`)
        .reply(404);

      const result = await github.sendInvite(username);
      expect(result).toEqual({ success: false, error: 'GITHUB_ERROR' });
    });

    test('handles invitation API errors', async () => {
      const username = 'testuser';
      const userId = 12345;

      nock('https://api.github.com')
        .get(`/users/${username}`)
        .reply(200, { id: userId });

      nock('https://api.github.com')
        .post(`/orgs/test-org/invitations`)
        .reply(500);

      const result = await github.sendInvite(username);
      expect(result).toEqual({ success: false, error: 'GITHUB_ERROR' });
    });
  });
});
