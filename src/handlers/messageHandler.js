class MessageHandler {
  constructor(github, userTracker) {
    this.github = github;
    this.userTracker = userTracker;
  }

  async handleMessage(message, say) {
    console.log('Received message:', message);

    // Only respond to direct messages
    if (message.channel_type !== 'im') {
      console.log('Ignoring message - not a direct message');
      return;
    }

    // Check if user has already been processed
    const hasBeenProcessed = await this.userTracker.hasBeenProcessed(message.user);
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
    const githubUser = await this.github.checkUsername(potentialUsername);

    if (githubUser) {
      console.log('Valid GitHub user found:', githubUser.login);
      try {
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
  }

  async handleConfirmYes({ body, ack, say }) {
    console.log('Received confirmation:', body);
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
        text: "Sorry - this user has already been added to the Github organization.",
        thread_ts: body.message.thread_ts
      });
    } else {
      await say({
        text: "❌ Sorry, there was an error sending the GitHub invitation. Please contact an administrator.",
        thread_ts: body.message.thread_ts
      });
    }
  }

  async handleConfirmNo({ body, ack, say }) {
    console.log('User declined confirmation:', body);
    await ack();
    await say({
      text: "Okay, please send me the correct GitHub username.",
      thread_ts: body.message.thread_ts
    });
  }
}

module.exports = MessageHandler;
