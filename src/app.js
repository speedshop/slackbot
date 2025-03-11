require('dotenv').config();
const { App } = require('@slack/bolt');
const GitHubService = require('./services/github');
const UserTracker = require('./services/userTracker');
const MessageHandler = require('./handlers/messageHandler');
const EnvValidator = require('./config/envValidator');
const logger = require('./config/logger');

async function initializeApp() {
  try {
    // Validate environment variables before proceeding
    EnvValidator.validate();

    const app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
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
    const userTracker = new UserTracker('./data/processed_users.txt');
    await userTracker.initialize();

    const githubService = new GitHubService(
      process.env.GITHUB_TOKEN,
      process.env.GITHUB_ORG,
      process.env.GITHUB_TEAM_ID
    );

    const messageHandler = new MessageHandler(githubService, userTracker);

    app.message(async ({ message, say }) => {
      try {
        // Log every incoming message at debug level
        logger.debug({ message }, 'Incoming Slack message received');

        // Check if user has been processed before
        if (await userTracker.hasBeenProcessed(message.user)) {
          await say('You have already been processed.');
          return;
        }

        await messageHandler.handleMessage(message, say);
      } catch (error) {
        logger.error('Error processing message:', error);
        await say('An error occurred while processing your request.');
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
