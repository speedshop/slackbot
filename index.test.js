const nock = require('nock');
const fs = require('fs').promises;
const path = require('path');

// Mock the Slack Bolt app
jest.mock('@slack/bolt', () => ({
  App: jest.fn().mockImplementation(() => ({
    message: jest.fn(),
    action: jest.fn(),
    error: jest.fn(),
    start: jest.fn(),
    use: jest.fn()
  }))
}));

// Import after mocks
const { checkGithubUsername, sendGithubInvite } = require('./index');

describe('GitHub Username Validation', () => {
  beforeEach(() => {
    // Clear all nock interceptors
    nock.cleanAll();
    // Clear environment variables
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_ORG = 'test-org';
    process.env.GITHUB_TEAM_ID = '12345';
  });

  afterEach(() => {
    // Ensure all nock interceptors were used
    expect(nock.isDone()).toBe(true);
  });

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

    const result = await checkGithubUsername(username);
    expect(result).toEqual(mockResponse);
  });

  test('returns null for non-existent GitHub username', async () => {
    const username = 'nonexistentuser';

    nock('https://api.github.com')
      .get(`/users/${username}`)
      .matchHeader('Authorization', 'token test-token')
      .reply(404);

    const result = await checkGithubUsername(username);
    expect(result).toBeNull();
  });
});

describe('GitHub Organization Invites', () => {
  beforeEach(() => {
    nock.cleanAll();
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_ORG = 'test-org';
    process.env.GITHUB_TEAM_ID = '12345';
  });

  afterEach(() => {
    expect(nock.isDone()).toBe(true);
  });

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

    const result = await sendGithubInvite(username);
    expect(result).toEqual({ success: true });
  });

  test('handles already-in-org error', async () => {
    const username = 'existinguser';
    const userId = 12345;

    // Mock the user lookup
    nock('https://api.github.com')
      .get(`/users/${username}`)
      .reply(200, { id: userId });

    // Mock the invitation request with already-in-org error
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

    const result = await sendGithubInvite(username);
    expect(result).toEqual({ success: false, error: 'ALREADY_IN_ORG' });
  });

  test('handles GitHub API errors', async () => {
    const username = 'testuser';
    const userId = 12345;

    // Mock the user lookup
    nock('https://api.github.com')
      .get(`/users/${username}`)
      .reply(200, { id: userId });

    // Mock the invitation request with an error
    nock('https://api.github.com')
      .post(`/orgs/test-org/invitations`)
      .reply(500);

    const result = await sendGithubInvite(username);
    expect(result).toEqual({ success: false, error: 'GITHUB_ERROR' });
  });
});
