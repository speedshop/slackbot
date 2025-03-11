const { App } = require('@slack/bolt');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
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
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return response.status === 200 ? await response.json() : null;
  } catch (error) {
    console.error('Error checking GitHub username:', error);
    return null;
  }
}

// Send GitHub organization invite
async function sendGithubInvite(username) {
  try {
    const response = await fetch(
      `https://api.github.com/orgs/${process.env.GITHUB_ORG}/invitations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          invitee_id: username,
          team_ids: [process.env.GITHUB_TEAM_ID]
        })
      }
    );
    return response.status === 201;
  } catch (error) {
    console.error('Error sending GitHub invite:', error);
    return false;
  }
}

// Message handler
app.message(async ({ message, say }) => {
  // Check if user has already been processed
  const hasBeenProcessed = await hasUserBeenProcessed(message.user);
  if (hasBeenProcessed) {
    await say({
      text: "You've already used this service to join the GitHub organization.",
      thread_ts: message.ts
    });
    return;
  }

  // Check if the message might be a GitHub username
  const potentialUsername = message.text.trim();
  const githubUser = await checkGithubUsername(potentialUsername);

  if (githubUser) {
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
    await say({
      text: "That doesn't appear to be a valid GitHub username. Please try again with a valid GitHub username.",
      thread_ts: message.ts
    });
  }
});

// Handle button actions
app.action('confirm_github_yes', async ({ body, ack, say }) => {
  await ack();
  const githubUsername = body.actions[0].value;
  const slackUserId = body.user.id;

  // Send GitHub invite
  const inviteSuccess = await sendGithubInvite(githubUsername);

  if (inviteSuccess) {
    await markUserAsProcessed(slackUserId);
    await say({
      text: `✅ Great! I've sent an invitation to join the GitHub organization. Please check your email associated with GitHub account: ${githubUsername}`,
      thread_ts: body.message.thread_ts
    });
  } else {
    await say({
      text: "❌ Sorry, there was an error sending the GitHub invitation. Please contact an administrator.",
      thread_ts: body.message.thread_ts
    });
  }
});

app.action('confirm_github_no', async ({ body, ack, say }) => {
  await ack();
  await say({
    text: "Okay, please send me the correct GitHub username.",
    thread_ts: body.message.thread_ts
  });
});

// Initialize and start the app
(async () => {
  await initializeProcessedUsersFile();
  await app.start();
  console.log('⚡️ Bolt app is running!');
})();
