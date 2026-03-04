# Rails Performance Slack Bot

A general-purpose bot for the Rails Performance Slack.

Current capabilities:

- GitHub organization invites from Slack DMs
- Slack archive download links via presigned Cloudflare R2 URLs

## Features

- Accepts GitHub usernames in Slack DMs
- Supports `github join <username>` command format
- Validates username format before API calls
- Confirms the matched GitHub profile with Yes/No buttons
- Sends GitHub org invites to a configured team
- Tracks processed Slack users in `data/processed_users.txt`
- Handles "already in org" responses cleanly
- Responds to `export` or `archive` in DM with a presigned R2 download URL
- Presigned archive URLs expire after 7 days

## Installation

### 1) Prerequisites

- Node.js 20+
- A Slack workspace where you can install and configure apps
- A GitHub token with org invite permissions
- Cloudflare R2 read-only S3 credentials for presigning

### 2) Clone and install

```bash
git clone https://github.com/speedshop/slackbot.git
cd slackbot
npm install
```

## Configuration

### Slack app setup

Create a Slack app at <https://api.slack.com/apps> and configure:

1. Socket Mode: enabled
2. OAuth scopes:
   - `chat:write`
   - `chat:write.public`
   - `im:history`
   - `im:read`
   - `im:write`
3. Event Subscriptions:
   - `message.im`
4. Interactivity: enabled (required for button actions)
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

### Cloudflare R2 setup

Create an R2 API token with Object Read permission for the bot. Configure:

- Account ID
- Access key ID
- Secret access key
- Bucket name (example: `railsperf-exports`)
- Object key (example: `railsperf-export-latest.zip`)

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
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-readonly-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-readonly-secret-access-key
R2_BUCKET=railsperf-exports
NODE_ENV=development
```

Optional:

```env
R2_OBJECT_KEY=railsperf-export-latest.zip
R2_REGION=auto
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

### GitHub invite flow

1. DM the bot with a GitHub username (or `github join <username>`)
2. Bot validates and shows a confirmation prompt
3. Click Yes to send the invite, or No to retry
4. User receives the GitHub invite email

### Archive delivery flow

1. DM the bot with `export` or `archive`
2. Bot returns a presigned URL for the latest ZIP archive in R2
3. URL expires after 7 days

Notes:

- The bot only responds in DMs.
- GitHub invite deduping applies to invite flow only.

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
- `src/services/github.js` - GitHub API lookup and invite
- `src/services/exportUrl.js` - Cloudflare R2 presigned URL generation
- `src/services/userTracker.js` - processed user tracking

## Contributing

Contributions are welcome. Open an issue or pull request.

## License

MIT (see `LICENSE`).
