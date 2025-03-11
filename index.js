require('dotenv').config();
const { App } = require('@slack/bolt');
const GitHubService = require('./src/services/github');
const UserTracker = require('./src/services/userTracker');
const MessageHandler = require('./src/handlers/messageHandler');

// Initialize services
const github = new GitHubService(
  process.env.GITHUB_TOKEN,
  process.env.GITHUB_ORG,
  process.env.GITHUB_TEAM_ID
);

const userTracker = new UserTracker('processed_users.txt');

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: 'DEBUG'
});

// Initialize message handler
const messageHandler = new MessageHandler(github, userTracker);

// Add global middleware to log all incoming events
app.use(async (args) => {
  const { event, body } = args;
  console.log('⚡️ Received event:', {
    type: event?.type,
    subtype: event?.subtype,
    body: body
  });
  const result = await args.next();
  return result;
});

// Set up event handlers
app.message(async ({ message, say }) => {
  await messageHandler.handleMessage(message, say);
});

app.action('confirm_github_yes', async (args) => {
  await messageHandler.handleConfirmYes(args);
});

app.action('confirm_github_no', async (args) => {
  await messageHandler.handleConfirmNo(args);
});

// Error handler
app.error(async (error) => {
  console.error('Slack error:', error);
});

// Start the app
(async () => {
  await userTracker.initialize();
  await app.start();

  console.log('⚡️ Bolt app is running!');
  console.log('Environment check:');
  console.log('- SLACK_BOT_TOKEN exists:', !!process.env.SLACK_BOT_TOKEN);
  console.log('- SLACK_SIGNING_SECRET exists:', !!process.env.SLACK_SIGNING_SECRET);
  console.log('- SLACK_APP_TOKEN exists:', !!process.env.SLACK_APP_TOKEN);
  console.log('- GITHUB_TOKEN exists:', !!process.env.GITHUB_TOKEN);
  console.log('- GITHUB_ORG exists:', !!process.env.GITHUB_ORG);
  console.log('- GITHUB_TEAM_ID exists:', !!process.env.GITHUB_TEAM_ID);
})();
