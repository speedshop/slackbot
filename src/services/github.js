const fetch = require('node-fetch');

class GitHubService {
  constructor(token, orgName, teamId) {
    this.token = token;
    this.orgName = orgName;
    this.teamId = parseInt(teamId, 10);
  }

  async checkUsername(username) {
    try {
      const response = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      return response.status === 200 ? await response.json() : null;
    } catch (error) {
      console.error('Error checking GitHub username:', error);
      return null;
    }
  }

  async sendInvite(username) {
    try {
      // First get the user's GitHub ID
      const userResponse = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (userResponse.status !== 200) {
        console.error('Error getting GitHub user ID');
        return { success: false, error: 'GITHUB_ERROR' };
      }

      const userData = await userResponse.json();
      const userId = userData.id;

      const response = await fetch(
        `https://api.github.com/orgs/${this.orgName}/invitations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${this.token}`,
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
          return { success: false, error: 'ALREADY_IN_ORG' };
        }
      }

      return {
        success: response.status === 201,
        error: response.status !== 201 ? 'GITHUB_ERROR' : null
      };
    } catch (error) {
      console.error('Error sending GitHub invite:', error);
      return { success: false, error: 'GITHUB_ERROR' };
    }
  }
}

module.exports = GitHubService;
