require('dotenv').config();
const { App } = require('@slack/bolt');
const GitHubService = require('./services/github');
const GitHubAppAuth = require('./services/githubAppAuth');
const UserTracker = require('./services/userTracker');
const ExportUrlService = require('./services/exportUrl');
const MessageHandler = require('./handlers/messageHandler');
const EnvValidator = require('./config/envValidator');
const logger = require('./config/logger');

async function initializeApp() {
  try {
    // Validate environment variables before proceeding
    EnvValidator.validate();

    const app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      socketMode: true,
      appToken: process.env.SLACK_APP_TOKEN,
      // Configure Slack's logger to use our pino logger
      logger: {
        debug: (...msgs) => logger.debug({ source: 'slack', message: msgs.join(' ') }),
        info: (...msgs) => logger.info({ source: 'slack', message: msgs.join(' ') }),
        warn: (...msgs) => logger.warn({ source: 'slack', message: msgs.join(' ') }),
        error: (...msgs) => logger.error({ source: 'slack', message: msgs.join(' ') }),
        getLevel: () => logger.level,
        setLevel: () => {} // No-op as we control the level through LOG_LEVEL env var
      }
    });

    // Initialize services
    const userTracker = new UserTracker({
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucket: process.env.R2_MARKERS_BUCKET,
      region: process.env.R2_REGION || 'auto'
    });
    await userTracker.initialize();

    const githubAppAuth = new GitHubAppAuth({
      appId: process.env.GITHUB_APP_ID,
      installationId: process.env.GITHUB_APP_INSTALLATION_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY
    });

    const githubService = new GitHubService(
      () => githubAppAuth.getToken(),
      process.env.GITHUB_ORG,
      process.env.GITHUB_TEAM_ID
    );
    await githubService.verifyToken();

    const exportUrlService = new ExportUrlService({
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucket: process.env.R2_BUCKET,
      objectKey: process.env.R2_OBJECT_KEY || 'railsperf-export-latest.zip',
      region: process.env.R2_REGION || 'auto',
      expiresInSeconds: 604800
    });

    const messageHandler = new MessageHandler(githubService, userTracker, exportUrlService);

    app.message(async ({ message, say }) => {
      try {
        await messageHandler.handleMessage(message, say);
      } catch (error) {
        logger.error({ err: error }, 'Error processing message');
        await say({
          text: messageHandler.errorText(`Sorry, something went wrong on our end. Please contact <@${messageHandler.adminUserId}>.`),
          thread_ts: message.ts
        });
      }
    });

    app.action('confirm_github_yes', async (body) => {
      await messageHandler.handleConfirmYes(body);
    });

    app.action('confirm_github_no', async (body) => {
      await messageHandler.handleConfirmNo(body);
    });

    return app;
  } catch (error) {
    logger.error({ error: error.toString(), stack: error.stack }, 'Failed to initialize application');
    throw error;
  }
}

module.exports = { initializeApp };
