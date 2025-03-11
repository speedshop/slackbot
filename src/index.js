const { initializeApp } = require('./app');
const logger = require('./config/logger');

(async () => {
  try {
    const app = await initializeApp();

    await app.start();
    logger.info('⚡️ Slack bot is running in Socket Mode');
  } catch (error) {
    logger.error({ error: error.toString(), stack: error.stack }, 'Failed to start the application');
    process.exit(1);
  }
})();
