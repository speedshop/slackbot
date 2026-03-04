# Rails Performance Slack GitHub Invite Bot

A Slack bot that helps community members join your GitHub org from Slack DMs.

It validates GitHub usernames, asks for confirmation, sends the org invite, and prevents duplicate processing.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org)
[![Tests](https://github.com/speedshop/slackbot/actions/workflows/test.yml/badge.svg)](https://github.com/speedshop/slackbot/actions/workflows/test.yml)
[![Lint](https://github.com/speedshop/slackbot/actions/workflows/lint.yml/badge.svg)](https://github.com/speedshop/slackbot/actions/workflows/lint.yml)

## Features

- Accepts GitHub usernames in Slack DMs
- Supports `github join <username>` command format
- Validates username format before API calls
- Confirms the matched GitHub profile with Yes/No buttons
- Sends GitHub org invites to a configured team
- Tracks processed Slack users in `data/processed_users.txt`
- Handles "already in org" responses cleanly

## Installation

### 1) Prerequisites

- Node.js 20+
- A Slack workspace where you can install and configure apps
- A GitHub token with org invite permissions

### 2) Clone and install

```bash
git clone https://github.com/speedshop/slackbot.git
cd slackbot
npm install
```

## Configuration

### Slack app setup

Create a Slack app at <https://api.slack.com/apps> and configure:

1. **Socket Mode**: enabled
2. **OAuth scopes**:
   - `chat:write`
   - `chat:write.public`
   - `im:history`
   - `im:read`
   - `im:write`
3. **Event Subscriptions**:
   - `message.im`
4. **Interactivity**: enabled (required for button actions)
5. Install app to workspace and collect:
   - Bot token (`xoxb-...`)
   - App token (`xapp-...`)
   - Signing secret
   - Slack admin user ID (`U...`)

### GitHub setup

Create a personal access token with:

- `admin:org`
- `read:user`

Also gather:

- GitHub org name
- Team ID (numeric)

### Environment variables

Copy the template:

```bash
cp .env.example .env
```

Set required values:

```env
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-token
SLACK_ADMIN_USER_ID=U0123456789
GITHUB_TOKEN=your-github-token
GITHUB_ORG=your-org
GITHUB_TEAM_ID=123456
NODE_ENV=development
```

Optional:

```env
LOG_LEVEL=info
```

## Quickstart

Run the bot:

```bash
npm start
```

Useful local variants:

```bash
LOG_LEVEL=debug npm start
NODE_ENV=development LOG_LEVEL=debug npm start
```

## Usage

1. DM the bot with a GitHub username (or `github join <username>`)
2. Bot validates and shows a confirmation prompt
3. Click **Yes** to send the invite, or **No** to retry
4. User receives the GitHub invite email

Notes:

- The bot only responds in DMs.
- If a Slack user was already processed, the bot will not invite again.

## Development

### Test and lint

```bash
npm test        # runs lint first via pretest
npm run lint
npm run lint:fix
```

### Docker

Use Docker Compose:

```bash
docker compose up -d
docker compose logs -f
docker compose down
```

Or run directly:

```bash
docker build -t rails-performance-slackbot .

docker run -d \
  --name slackbot \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  rails-performance-slackbot
```

## Project structure

- `src/index.js` - startup entrypoint
- `src/app.js` - Slack app initialization and handlers
- `src/config/envValidator.js` - environment validation
- `src/config/logger.js` - `pino` logger setup
- `src/handlers/messageHandler.js` - message and action handling
- `src/services/github.js` - GitHub API lookup + invite
- `src/services/userTracker.js` - processed user tracking

## Contributing

Contributions are welcome. Open an issue or pull request.

## License

MIT (see `LICENSE`).
