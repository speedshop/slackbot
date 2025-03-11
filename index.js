const { App } = require('@slack/bolt');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Log all environment variables at startup
console.log('Bot token prefix:', process.env.SLACK_BOT_TOKEN?.substring(0, 4));
console.log('App token prefix:', process.env.SLACK_APP_TOKEN?.substring(0, 4));

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: 'DEBUG'
});

// Add global middleware to log all incoming events
app.use(async (args) => {
  const { logger, event, client, body } = args;
  console.log('⚡️ Received event:', {
    type: event?.type,
    subtype: event?.subtype,
    body: body
  });
  const result = await args.next();
  return result;
});

const PROCESSED_USERS_FILE = 'processed_users.txt';

// Initialize the processed users file if it doesn't exist
async function initializeProcessedUsersFile() {
  try {
    await fs.access(PROCESSED_USERS_FILE);
  } catch {
    await fs.writeFile(PROCESSED_USERS_FILE, '');
  }
}

// Check if a user has already been processed
async function hasUserBeenProcessed(slackUserId) {
  const content = await fs.readFile(PROCESSED_USERS_FILE, 'utf8');
  return content.split('\n').includes(slackUserId);
}

// Add user to processed users file
async function markUserAsProcessed(slackUserId) {
  await fs.appendFile(PROCESSED_USERS_FILE, `${slackUserId}\n`);
}

// Check if GitHub username exists
async function checkGithubUsername(username) {
  console.log(`Checking GitHub username: ${username}`);
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    const result = response.status === 200 ? await response.json() : null;
    console.log(`GitHub API response status: ${response.status}`);
    return result;
  } catch (error) {
    console.error('Error checking GitHub username:', error);
    return null;
  }
}

// Send GitHub organization invite
async function sendGithubInvite(username) {
  console.log(`Attempting to send GitHub invite to: ${username}`);
  try {
    // First get the user's GitHub ID
    const userResponse = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (userResponse.status !== 200) {
      console.error('Error getting GitHub user ID');
      return { success: false, error: 'GITHUB_ERROR' };
    }

    const userData = await userResponse.json();
    const userId = userData.id;
    console.log(`Found GitHub user ID: ${userId} for username: ${username}`);

    const response = await fetch(
      `https://api.github.com/orgs/${process.env.GITHUB_ORG}/invitations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          invitee_id: userId,
          team_ids: [parseInt(process.env.GITHUB_TEAM_ID, 10)]
        })
      }
    );
    console.log(`GitHub invite API response status: ${response.status}`);
    if (response.status !== 201) {
      const errorData = await response.text();
      console.error('GitHub API error response:', errorData);

      // Check if the error is because user is already in org
      if (response.status === 422 && errorData.includes('already a part of this organization')) {
        return { success: false, error: 'ALREADY_IN_ORG' };
      }

      return { success: false, error: 'GITHUB_ERROR' };
    }
    return { success: true };
  } catch (error) {
    console.error('Error sending GitHub invite:', error);
    return { success: false, error: 'GITHUB_ERROR' };
  }
}

// Message handler
app.message(async ({ message, say }) => {
  console.log('Received message:', message);

  // Only respond to direct messages
  if (message.channel_type !== 'im') {
    console.log('Ignoring message - not a direct message');
    return;
  }

  // Check if user has already been processed
  const hasBeenProcessed = await hasUserBeenProcessed(message.user);
  console.log(`User ${message.user} has been processed before: ${hasBeenProcessed}`);

  if (hasBeenProcessed) {
    await say({
      text: "You've already used this service to join the GitHub organization.",
      thread_ts: message.ts
    });
    return;
  }

  // Check if the message might be a GitHub username
  const potentialUsername = message.text.trim();
  console.log(`Checking potential GitHub username: ${potentialUsername}`);
  const githubUser = await checkGithubUsername(potentialUsername);

  if (githubUser) {
    console.log('Valid GitHub user found:', githubUser.login);
    try {
      // Ask for confirmation
      await say({
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Did you mean this GitHub profile: <${githubUser.html_url}|${githubUser.login}>?`
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Yes"
                },
                style: "primary",
                action_id: "confirm_github_yes",
                value: githubUser.login
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "No"
                },
                style: "danger",
                action_id: "confirm_github_no"
              }
            ]
          }
        ],
        thread_ts: message.ts
      });
    } catch (error) {
      console.error('Error sending confirmation message:', error);
      await say({
        text: "Sorry, there was an error processing your request.",
        thread_ts: message.ts
      });
    }
  } else {
    console.log(`Invalid GitHub username: ${potentialUsername}`);
    await say({
      text: "That doesn't appear to be a valid GitHub username. Please try again with a valid GitHub username.",
      thread_ts: message.ts
    });
  }
});

// Handle button actions
app.action('confirm_github_yes', async ({ body, ack, say }) => {
  console.log('Received confirmation:', body);
  await ack();
  const githubUsername = body.actions[0].value;
  const slackUserId = body.user.id;

  // Send GitHub invite
  const result = await sendGithubInvite(githubUsername);

  if (result.success) {
    await markUserAsProcessed(slackUserId);
    await say({
      text: `✅ Great! I've sent an invitation to join the GitHub organization. Please check your email associated with GitHub account: ${githubUsername}`,
      thread_ts: body.message.thread_ts
    });
  } else if (result.error === 'ALREADY_IN_ORG') {
    await say({
      text: "Sorry - this user has already been added to the Github organization.",
      thread_ts: body.message.thread_ts
    });
  } else {
    await say({
      text: "❌ Sorry, there was an error sending the GitHub invitation. Please contact @nateberkopec.",
      thread_ts: body.message.thread_ts
    });
  }
});

app.action('confirm_github_no', async ({ body, ack, say }) => {
  console.log('User declined confirmation:', body);
  await ack();
  await say({
    text: "Okay, please send me the correct GitHub username.",
    thread_ts: body.message.thread_ts
  });
});

// Add connection event handlers
app.error(async (error) => {
  console.error('Slack error:', error);
});

// Initialize and start the app
(async () => {
  await initializeProcessedUsersFile();
  await app.start();
  console.log('⚡️ Bolt app is running!');

  // Log environment check
  console.log('Environment check:');
  console.log('- SLACK_BOT_TOKEN exists:', !!process.env.SLACK_BOT_TOKEN);
  console.log('- SLACK_SIGNING_SECRET exists:', !!process.env.SLACK_SIGNING_SECRET);
  console.log('- SLACK_APP_TOKEN exists:', !!process.env.SLACK_APP_TOKEN);
  console.log('- GITHUB_TOKEN exists:', !!process.env.GITHUB_TOKEN);
  console.log('- GITHUB_ORG exists:', !!process.env.GITHUB_ORG);
  console.log('- GITHUB_TEAM_ID exists:', !!process.env.GITHUB_TEAM_ID);
})();

// Export functions for testing
module.exports = {
  checkGithubUsername,
  sendGithubInvite,
  hasUserBeenProcessed,
  markUserAsProcessed
};
