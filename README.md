# GitHub Invite Slack Bot

A Slack bot that validates GitHub usernames and sends organization invites.

## Features

- Validates GitHub usernames
- Sends GitHub organization invites
- Prevents duplicate invites by tracking processed users
- Interactive button-based confirmation

## Setup

1. Create a Slack App at https://api.slack.com/apps
   - Enable Socket Mode
   - Add the following bot token scopes:
     - `chat:write`
     - `chat:write.public`
   - Install the app to your workspace

2. Create a GitHub Personal Access Token with the following permissions:
   - `admin:org`
   - `read:user`

3. Copy `.env.example` to `.env` and fill in the following values:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token
   SLACK_SIGNING_SECRET=your-signing-secret
   SLACK_APP_TOKEN=xapp-your-token
   GITHUB_TOKEN=your-github-personal-access-token
   GITHUB_ORG=your-organization-name
   GITHUB_TEAM_ID=your-team-id
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start the bot:
   ```bash
   npm start
   ```

## Usage

1. Direct message the bot with a GitHub username
2. The bot will verify if the username exists and ask for confirmation
3. Click "Yes" to receive an organization invite or "No" to try again
4. Check your GitHub email for the invite

## Notes

- Users can only request one invite (tracked in `processed_users.txt`)
- The bot uses GitHub's API to validate usernames and send invites
- All interactions are threaded for better conversation tracking
