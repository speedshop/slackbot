# Rails Performance Slack Bot

A general-purpose bot for the Rails Performance Slack.

Current capabilities:

- GitHub organization invites from Slack DMs
- Slack archive download links via presigned Cloudflare R2 URLs
- A built-in help command that lists every supported command

## Usage

The bot only responds to Slack direct messages. All commands are case-insensitive.

### Help

Send either of the following messages to get the complete command list:

```
help
h
```

### GitHub invite

Send a GitHub username to get an invite to the GitHub organization:

```
<username>
```

or with the explicit prefix:

```
github join <username>
```

The bot looks up the username on GitHub and shows a confirmation prompt with Yes/No buttons. Clicking Yes sends the org invite. Each Slack user can only use this once.

### Slack archive download

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

Trailing punctuation (`!`, `?`, `.`, `,`) is stripped before matching, so `export!`, `archive?`, and `help!` also work.

When the bot returns an error, it also reminds users that they can say `help` for the complete list of commands.

## Collaborators

- **A Slack workspace**, where you can install and configure apps
- **A GitHub org team and org**, for inviting people to.
- **Cloudflare R2**, which we use as a source of truth for "who's already been invited", and for the archive artifact.

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
   - App token (`xapp-...`) with only the `connections:write` scope
   - Slack admin user ID (`U...`)

### GitHub setup

Create a GitHub App owned by the org with the organization permission **Members: Read and write** and nothing else, then install it on the org. The bot signs a JWT with the app's private key and uses 1-hour installation tokens.

Gather:

- App ID
- Installation ID
- Private key (PEM)
- GitHub org name
- Team ID (numeric)

### Cloudflare R2 setup

Use one credential pair for both operations:

- Generate presigned download URLs for archive ZIPs
- Read/write processed-user markers

Configure:

- Account ID
- Access key ID + secret access key from an R2 token with **Object Read & Write** on only the export and marker buckets, with an expiry date
- Export bucket name (example: `railsperf-exports`) and object key
- Marker bucket name (example: `railsperf-processed-users`)

For backup safety, enable versioning on the marker bucket.

### Secrets at runtime

In production the container runs `op run --env-file=op.env`, which reads every secret from the 1Password vault `slackbot` at boot. The host only stores `OP_SERVICE_ACCOUNT_TOKEN`, for a read-only service account limited to that vault. Non-secret settings (`SLACK_ADMIN_USER_ID`, `GITHUB_ORG`, `GITHUB_TEAM_ID`, `R2_*` bucket names, `R2_ACCOUNT_ID`) are plain environment variables.

The vault holds these items and fields (see `op.env`):

| Item | Fields |
| --- | --- |
| `slack` | `bot_token`, `app_token` |
| `github-app` | `app_id`, `installation_id`, `private_key` |
| `r2` | `access_key_id`, `secret_access_key` |

### Environment variables

Copy the template:

```bash
cp .env.example .env
```

Set required values:

```env
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_APP_TOKEN=xapp-your-token
SLACK_ADMIN_USER_ID=U0123456789
GITHUB_APP_ID=123456
GITHUB_APP_INSTALLATION_ID=12345678
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
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

## Contributing

Contributions are welcome. Open an issue or pull request.

## License

MIT (see `LICENSE`).
