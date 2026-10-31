const fetch = require('node-fetch');
const logger = require('../config/logger');

class GitHubService {
  constructor(getToken, orgName, teamId) {
    this.getToken = getToken;
    this.orgName = orgName;
    this.teamId = parseInt(teamId, 10);
  }

  validateGitHubUsername(username) {
    // Return false for null, undefined, or non-string values
    if (!username || typeof username !== 'string') {
      return false;
    }

    // GitHub username requirements:
    // - Only alphanumeric characters or hyphens
    // - Cannot have multiple consecutive hyphens
    // - Cannot begin or end with a hyphen
    // - Maximum is 39 characters
    const pattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
    return pattern.test(username);
  }

  async verifyToken() {
    await this.getToken();
  }

  async checkUsername(username) {
    if (!this.validateGitHubUsername(username)) {
      logger.info({ username }, 'Invalid GitHub username format');
      return null;
    }

    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Authorization': `token ${await this.getToken()}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.status === 200) {
      const userData = await response.json();
      logger.info({ username, userId: userData.id }, 'GitHub user found');
      return userData;
    }

    if (response.status === 404) {
      logger.info({ username }, 'GitHub user not found');
      return null;
    }

    throw new Error(`GitHub user lookup failed with status ${response.status}`);
  }

  async sendInvite(username) {
    if (!this.validateGitHubUsername(username)) {
      logger.info({ username }, 'Invalid GitHub username format for invite');
      return { success: false, error: 'INVALID_USERNAME' };
    }

    try {
      // First get the user's GitHub ID
      const userResponse = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
          'Authorization': `token ${await this.getToken()}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (userResponse.status !== 200) {
        logger.error({ username, status: userResponse.status }, 'Error getting GitHub user ID');
        return { success: false, error: 'GITHUB_ERROR' };
      }

      const userData = await userResponse.json();
      const userId = userData.id;

      logger.info({ username, userId }, 'Sending GitHub organization invite');
      const response = await fetch(
        `https://api.github.com/orgs/${this.orgName}/invitations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${await this.getToken()}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            invitee_id: userId,
            team_ids: [this.teamId]
          })
        }
      );

      if (response.status === 422) {
        const errorData = await response.text();
        if (errorData.includes('already a part of this organization')) {
          logger.info({ username }, 'User already in organization');
          return { success: false, error: 'ALREADY_IN_ORG' };
        }
      }

      if (response.status !== 201) {
        const body = await response.text();
        logger.error({ username, status: response.status, body }, 'GitHub invite failed');
        return { success: false, error: 'GITHUB_ERROR' };
      }

      logger.info({ username }, 'GitHub invite sent');
      return { success: true, error: null };
    } catch (error) {
      logger.error({ err: error, username }, 'Error sending GitHub invite');
      return { success: false, error: 'GITHUB_ERROR' };
    }
  }
}

module.exports = GitHubService;
