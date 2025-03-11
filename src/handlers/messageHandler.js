const logger = require('../config/logger');

class MessageHandler {
  constructor(github, userTracker) {
    this.github = github;
    this.userTracker = userTracker;
    this.adminUserId = process.env.SLACK_ADMIN_USER_ID || 'U01FGF5C91A'; // Default admin user ID
  }

  async handleMessage(message, say) {
    logger.info({ message }, 'Received message');

    // Validate message object and its properties
    if (!message || !message.text) {
      logger.warn({ message }, 'Received invalid message');
      await say({
        text: 'Sorry, I couldn\'t process that message. Please send me a GitHub username as text.',
        thread_ts: message?.ts
      });
      return;
    }

    // Only respond to direct messages
    if (message.channel_type !== 'im') {
      logger.info('Ignoring message - not a direct message');
      return;
    }

    // Check if user has already been processed
    const hasBeenProcessed = await this.userTracker.hasBeenProcessed(message.user);
    logger.info({ userId: message.user, hasBeenProcessed }, 'User processing status check');

    if (hasBeenProcessed) {
      await say({
        text: 'You\'ve already used this service to join the GitHub organization.',
        thread_ts: message.ts
      });
      return;
    }

    // Check if the message might be a GitHub username
    const potentialUsername = message.text.trim();

    // Check for empty username after trimming
    if (!potentialUsername) {
      await say({
        text: 'Please provide a GitHub username.',
        thread_ts: message.ts
      });
      return;
    }

    logger.info({ username: potentialUsername }, 'Checking potential GitHub username');
    const githubUser = await this.github.checkUsername(potentialUsername);

    if (githubUser) {
      logger.info({ githubUser }, 'Valid GitHub user found');
      try {
        await say({
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Did you mean this GitHub profile: <${githubUser.html_url}|${githubUser.login}>?`
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Yes'
                  },
                  style: 'primary',
                  action_id: 'confirm_github_yes',
                  value: githubUser.login
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'No'
                  },
                  style: 'danger',
                  action_id: 'confirm_github_no'
                }
              ]
            }
          ],
          thread_ts: message.ts
        });
      } catch (error) {
        logger.error({ error }, 'Error sending confirmation message');
        await say({
          text: 'Sorry, there was an error processing your request.',
          thread_ts: message.ts
        });
      }
    } else {
      logger.info({ username: potentialUsername }, 'Invalid GitHub username');
      await say({
        text: 'That doesn\'t appear to be a valid GitHub username. Please try again with a valid GitHub username.',
        thread_ts: message.ts
      });
    }
  }

  async handleConfirmYes({ body, ack, say }) {
    logger.info({ body }, 'Received confirmation');
    await ack();
    const githubUsername = body.actions[0].value;
    const slackUserId = body.user.id;

    const result = await this.github.sendInvite(githubUsername);

    if (result.success) {
      await this.userTracker.markAsProcessed(slackUserId);
      await say({
        text: `✅ Great! I've sent an invitation to join the GitHub organization. Please check your email associated with GitHub account: ${githubUsername}`,
        thread_ts: body.message.thread_ts
      });
    } else if (result.error === 'ALREADY_IN_ORG') {
      await say({
        text: 'Sorry - this user has already been added to the Github organization.',
        thread_ts: body.message.thread_ts
      });
    } else {
      logger.error({ result }, 'Error sending GitHub invitation');
      await say({
        text: `❌ Sorry, there was an error sending the GitHub invitation. Please contact <@${this.adminUserId}>.`,
        thread_ts: body.message.thread_ts
      });
    }
  }

  async handleConfirmNo({ body, ack, say }) {
    logger.info({ body }, 'User declined confirmation');
    await ack();
    await say({
      text: 'Okay, please send me the correct GitHub username.',
      thread_ts: body.message.thread_ts
    });
  }
}

module.exports = MessageHandler;
