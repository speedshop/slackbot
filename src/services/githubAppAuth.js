const crypto = require('crypto');
const fetch = require('node-fetch');

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

class GitHubAppAuth {
  constructor({ appId, installationId, privateKey }) {
    this.appId = appId;
    this.installationId = installationId;
    this.privateKey = privateKey.replace(/\\n/g, '\n');
    this.token = null;
    this.expiresAt = 0;
  }

  appJwt() {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: now - 60, exp: now + 540, iss: this.appId })}`;
    const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(this.privateKey, 'base64url');
    return `${unsigned}.${signature}`;
  }

  async getToken() {
    if (this.token && Date.now() < this.expiresAt - REFRESH_MARGIN_MS) {
      return this.token;
    }

    const response = await fetch(
      `https://api.github.com/app/installations/${this.installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.appJwt()}`,
          'Accept': 'application/vnd.github+json'
        }
      }
    );

    if (response.status !== 201) {
      throw new Error(`GitHub App installation token request failed with status ${response.status}`);
    }

    const { token, expires_at: expiresAt } = await response.json();
    this.token = token;
    this.expiresAt = Date.parse(expiresAt);
    return token;
  }
}

module.exports = GitHubAppAuth;
