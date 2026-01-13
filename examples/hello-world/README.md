# Hello World Example

Simple bot examples demonstrating Switchboard SDK's cross-platform capabilities.

## Overview

This directory contains three example bots:

- **discord.ts** - Basic Discord bot
- **slack.ts** - Basic Slack bot
- **one-line-swap.ts** - Demonstrates platform switching with minimal code changes

All bots respond to "ping" and "hello" messages, showcasing identical functionality across different platforms.

## Prerequisites

- Node.js 18+ and pnpm installed
- Discord bot token (for Discord examples)
- Slack bot token and app token (for Slack examples)

## Setup

### 1. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

### 2. Set Up Discord Bot (Optional)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Navigate to "Bot" section and click "Add Bot"
4. Under "Privileged Gateway Intents", enable:
   - Message Content Intent
5. Click "Reset Token" and copy your bot token
6. Add it to `.env`:
   ```
   DISCORD_TOKEN=your_discord_token_here
   ```

7. Invite bot to your server:
   - Go to "OAuth2" → "URL Generator"
   - Select scopes: `bot`
   - Select permissions: `Send Messages`, `Read Message History`, `Add Reactions`
   - Copy the generated URL and open it in your browser
   - Select your server and authorize

### 3. Set Up Slack Bot (Optional)

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app and select your workspace

4. Configure OAuth scopes:
   - Go to "OAuth & Permissions"
   - Add these Bot Token Scopes:
     - `chat:write`
     - `channels:history`
     - `groups:history`
     - `im:history`
     - `mpim:history`
     - `channels:read`
     - `groups:read`
     - `im:read`
     - `mpim:read`
     - `users:read`
     - `reactions:write`

5. Install app to workspace:
   - Click "Install to Workspace"
   - Copy the "Bot User OAuth Token" (starts with `xoxb-`)
   - Add it to `.env`:
     ```
     SLACK_BOT_TOKEN=your_slack_bot_token_here
     ```

6. Enable Socket Mode:
   - Go to "Socket Mode" and enable it
   - Generate an app-level token with `connections:write` scope
   - Copy the token (starts with `xapp-`)
   - Add it to `.env`:
     ```
     SLACK_APP_TOKEN=your_slack_app_token_here
     ```

7. Subscribe to events:
   - Go to "Event Subscriptions"
   - Subscribe to these bot events:
     - `message.channels`
     - `message.groups`
     - `message.im`
     - `message.mpim`

## Running the Examples

### Discord Bot

```bash
pnpm tsx discord.ts
```

Test in Discord by sending:
- "ping" → Bot replies with "pong!"
- "hello" → Bot mentions you

### Slack Bot

```bash
pnpm tsx slack.ts
```

Test in Slack by:
1. Inviting the bot to a channel: `/invite @YourBotName`
2. Sending messages:
   - "ping" → Bot replies with "pong!"
   - "hello" → Bot mentions you

### One-Line Swap Demo

This example demonstrates Switchboard's core promise: change platforms with one line.

Run with Discord:
```bash
PLATFORM=discord pnpm tsx one-line-swap.ts
```

Run with Slack:
```bash
PLATFORM=slack pnpm tsx one-line-swap.ts
```

The same code handles both platforms! Test commands:
- "ping" → Simple reply
- "hello" → User mention
- "edit" → Message editing
- "react" → Add reaction
- "thread" → Create thread

## What's Next?

Explore the source code to see how Switchboard provides a unified API across platforms:

- **Cross-platform messaging**: Same API for Discord and Slack
- **Intelligent abstractions**: Platform differences handled transparently
- **Type-safe**: Full TypeScript support with autocompletion
- **Result types**: Explicit error handling with `Result<T>` pattern

For more advanced examples and documentation, see:
- [Core Package README](../../packages/core/README.md)
- [Discord Adapter README](../../packages/discord/README.md)
- [Slack Adapter README](../../packages/slack/README.md)

## Troubleshooting

### Discord Bot Not Responding

- Verify bot token is correct in `.env`
- Check that "Message Content Intent" is enabled
- Ensure bot has proper permissions in the channel

### Slack Bot Not Responding

- Verify both `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` are set
- Check that all OAuth scopes are added
- Ensure bot is invited to the channel (`/invite @BotName`)
- Verify Socket Mode is enabled
- Check all event subscriptions are configured

### Bot Connects But Doesn't Reply

- Make sure you're typing "ping" or "hello" (case-insensitive)
- Check terminal output for error messages
- Verify bot has permission to send messages in the channel
