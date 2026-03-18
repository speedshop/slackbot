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
- Tracks processed Slack users in Cloudflare R2 marker objects
- Handles "already in org" responses cleanly
- Responds to `export` or `archive` in DM with a presigned R2 download URL
- Presigned archive URLs expire after 7 days

## Installation

### 1) Prerequisites

- Node.js 20+
- A Slack workspace where you can install and configure apps
- A GitHub token with org invite permissions
- Cloudflare R2 S3 credentials (used for archive URL signing and processed-user markers)

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

Use one credential pair for both operations:

- Generate presigned download URLs for archive ZIPs
- Read/write processed-user markers

Configure:

- Account ID
- Access key ID + secret access key
- Export bucket name (example: `railsperf-exports`) and object key
- Marker bucket name (example: `railsperf-processed-users`)

The marker bucket is managed by Terraform in `terraform/`.

For backup safety, enable versioning on the marker bucket.

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
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET=railsperf-exports
R2_MARKERS_BUCKET=railsperf-processed-users
NODE_ENV=development
```

Optional:

```env
R2_OBJECT_KEY=railsperf-export-latest.zip
R2_REGION=auto
LOG_LEVEL=info
```

## Terraform (markers bucket)

This repo manages the processed-user markers bucket in `terraform/`.

```bash
cd terraform
export CLOUDFLARE_API_TOKEN=...
terraform init
terraform apply -var="cloudflare_account_id=<ACCOUNT_ID>"
```

The monthly export bucket (`railsperf-exports`) is intentionally not managed by this repo.

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

The bot only responds to Slack direct messages. All commands are case-insensitive.

### Commands

#### GitHub invite

Send a GitHub username to get an invite to the GitHub organization:

```
<username>
```

or with the explicit prefix:

```
github join <username>
```

The bot looks up the username on GitHub and shows a confirmation prompt with Yes/No buttons. Clicking Yes sends the org invite. Each Slack user can only use this once.

#### Slack archive download

Any of the following messages will return a presigned R2 download URL (valid for 7 days) for the latest Slack archive ZIP:

```
export
archive
slack export
slack archive
export please
archive please
please export
please archive
```

Trailing punctuation (`!`, `?`, `.`, `,`) is stripped before matching, so `export!` and `archive?` also work.

## Migration and backfill

If you have historical IDs in `data/processed_users.txt`, backfill them to R2 markers before deploying this version:

```bash
npm run backfill:processed-users
```

Useful options:

```bash
# Preview without writing markers
npm run backfill:processed-users -- --dry-run

# Use a custom source file
npm run backfill:processed-users -- --file /path/to/processed_users.txt
```

The script is idempotent and skips users that already have markers.

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
- `src/services/userTracker.js` - processed user tracking via R2 marker objects
- `bin/backfill-processed-users-to-r2.js` - migration script from legacy file storage to R2 markers
- `terraform/` - Terraform config for managed Cloudflare resources (markers bucket)

## Contributing

Contributions are welcome. Open an issue or pull request.

## License

MIT (see `LICENSE`).
