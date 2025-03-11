# Rails Performance Slack GitHub Invite Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org)
[![Slack](https://img.shields.io/badge/Slack-4A154B?logo=slack&logoColor=white)](https://slack.com)
[![GitHub](https://img.shields.io/badge/GitHub-100000?logo=github&logoColor=white)](https://github.com)
[![Tests](https://github.com/speedshop/slackbot/actions/workflows/test.yml/badge.svg)](https://github.com/speedshop/slackbot/actions/workflows/test.yml)
[![Lint](https://github.com/speedshop/slackbot/actions/workflows/lint.yml/badge.svg)](https://github.com/speedshop/slackbot/actions/workflows/lint.yml)

A Slack bot that validates GitHub usernames and automates organization invites for the Rails Performance Slack, built with the Slack Bolt framework.

<p align="center">
  <img width="560" alt="Bot preview in Slack showing how it prompts the user" src="https://github.com/user-attachments/assets/70f48015-df97-4935-8d32-4764a2e1c53a" />
</p>

Vibe coded in a few hours with Cursor.

## ✨ Features

- 🔍 Real-time GitHub username validation
- 🚀 One-click GitHub organization invites
- 🔄 Interactive button-based confirmation flow
- 🛡️ Prevents duplicate invites with user tracking
- 📝 Comprehensive logging with pino
- 🔌 Uses Slack's Socket Mode for simplified deployment

## 📋 Prerequisites

- Node.js 16+
- A Slack workspace with admin privileges
- A GitHub account with organization admin access

## 🛠️ Installation

### 1. Create a Slack App

1. Go to [Slack API Apps](https://api.slack.com/apps) and create a new app
2. Enable Socket Mode under "Socket Mode"
3. Add the following bot token scopes under "OAuth & Permissions":
   - `chat:write`
   - `chat:write.public`
   - `im:history`
   - `im:read`
   - `im:write`
4. Install the app to your workspace
5. Note your Bot Token (`xoxb-...`) and App-Level Token (`xapp-...`)

### 2. Create a GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Generate a new token with the following permissions:
   - `admin:org`
   - `read:user`
3. Copy your token for the next step

### 3. Configure Environment Variables

1. Clone this repository
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Fill in the following values in your `.env` file:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token
   SLACK_SIGNING_SECRET=your-signing-secret
   SLACK_APP_TOKEN=xapp-your-token
   SLACK_ADMIN_USER_ID=your-slack-user-id
   GITHUB_TOKEN=your-github-personal-access-token
   GITHUB_ORG=your-organization-name
   GITHUB_TEAM_ID=your-team-id
   NODE_ENV=development
   LOG_LEVEL=info
   ```

### 4. Install Dependencies and Start

```bash
# Install dependencies
npm install

# Start the bot
npm start

# Start with debug logging
LOG_LEVEL=debug npm start

# Start in development mode with pretty logging
NODE_ENV=development LOG_LEVEL=debug npm start
```

### 5. Running with Docker

This application can also be run using Docker, which simplifies deployment and ensures consistent environments.

#### Using Docker Compose (Recommended)

1. Make sure you have Docker and Docker Compose installed on your system
2. Configure your `.env` file as described in step 3 above
3. Build and start the container:

```bash
docker-compose up -d
```

4. View logs:

```bash
docker-compose logs -f
```

5. Stop the container:

```bash
docker-compose down
```

#### Using Docker Directly

1. Build the Docker image:

```bash
docker build -t rails-performance-slackbot .
```

2. Run the container:

```bash
docker run -d \
  --name slackbot \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  rails-performance-slackbot
```

3. View logs:

```bash
docker logs -f slackbot
```

4. Stop the container:

```bash
docker stop slackbot
docker rm slackbot
```

## 🚀 Usage

1. Direct message the bot with a GitHub username
2. The bot will verify if the username exists and ask for confirmation
3. Click "Yes" to receive an organization invite or "No" to try again
4. Check your GitHub email for the invite

## 🧩 Architecture

The bot is built with a modular architecture:

- `src/app.js` - Main application setup and Slack event handling
- `src/handlers/messageHandler.js` - Processes incoming messages and button clicks
- `src/services/github.js` - Handles GitHub API interactions
- `src/services/userTracker.js` - Tracks which users have been processed
- `src/config/logger.js` - Configures pino logging with pretty printing in development

## 📝 Logging

The bot uses pino for structured logging:

- Set `LOG_LEVEL=debug` for detailed logs
- Set `NODE_ENV=development` to enable pretty-printed logs
- All Slack framework logs are integrated with the application logger

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Slack Bolt Framework](https://slack.dev/bolt-js/concepts)
- [GitHub API](https://docs.github.com/en/rest)
- [Pino Logger](https://getpino.io/)
- [Cursor](https://cursor.sh/) - Used for AI-assisted development
