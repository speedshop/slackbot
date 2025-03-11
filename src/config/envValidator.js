class EnvValidator {
  static validate() {
    const requiredVars = [
      'SLACK_BOT_TOKEN',
      'SLACK_SIGNING_SECRET',
      'SLACK_APP_TOKEN',
      'GITHUB_TOKEN',
      'GITHUB_ORG',
      'GITHUB_TEAM_ID',
      'SLACK_ADMIN_USER_ID',
      'NODE_ENV'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate token formats
    if (!process.env.SLACK_BOT_TOKEN.startsWith('xoxb-')) {
      throw new Error('Invalid SLACK_BOT_TOKEN format');
    }

    if (!process.env.SLACK_APP_TOKEN.startsWith('xapp-')) {
      throw new Error('Invalid SLACK_APP_TOKEN format');
    }

    if (process.env.GITHUB_TOKEN.length < 30) {
      throw new Error('GITHUB_TOKEN appears to be invalid');
    }

    // Validate GITHUB_TEAM_ID is a number
    if (isNaN(parseInt(process.env.GITHUB_TEAM_ID, 10))) {
      throw new Error('GITHUB_TEAM_ID must be a number');
    }

    // Validate Slack User ID format (starts with 'U' followed by 8-11 characters)
    if (!/^U[A-Z0-9]{8,11}$/.test(process.env.SLACK_ADMIN_USER_ID)) {
      throw new Error('SLACK_ADMIN_USER_ID must be a valid Slack user ID (starts with U followed by 8-11 characters)');
    }

    // Validate NODE_ENV
    const validEnvs = ['development', 'production', 'test'];
    if (!validEnvs.includes(process.env.NODE_ENV)) {
      throw new Error(`Invalid NODE_ENV. Must be one of: ${validEnvs.join(', ')}`);
    }

    return true;
  }
}

module.exports = EnvValidator;
