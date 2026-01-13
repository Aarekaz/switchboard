# @switchboard/slack

Slack adapter for [Switchboard SDK](https://github.com/yourusername/switchboard).

Build chat bots once, deploy everywhere. This adapter enables your Switchboard bot to work seamlessly with Slack.

## Installation

```bash
pnpm add @switchboard/slack
```

## Quick Start

```typescript
import { createBot } from '@switchboard/core';
import '@switchboard/slack';

const bot = createBot({
  platform: 'slack',
  credentials: {
    botToken: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,  // For Socket Mode
  },
});

bot.onMessage(async (message) => {
  if (message.text.includes('hello')) {
    await bot.reply(message, 'Hello from Slack! 👋');
  }
});

await bot.start();
```

## Setup Guide

### 1. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app and select your workspace

### 2. Configure Bot Token Scopes

In your app settings, go to **OAuth & Permissions** and add these scopes:

**Required scopes:**
- `chat:write` - Send messages
- `channels:read` - View channels
- `groups:read` - View private channels
- `im:read` - View direct messages
- `mpim:read` - View group direct messages
- `users:read` - View users

**Optional scopes (for additional features):**
- `chat:write.customize` - Customize message appearance
- `reactions:write` - Add reactions
- `files:write` - Upload files
- `channels:history` - Read channel messages
- `groups:history` - Read private channel messages
- `im:history` - Read DM messages

### 3. Install App to Workspace

1. In **OAuth & Permissions**, click "Install to Workspace"
2. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
3. Save it as `SLACK_BOT_TOKEN`

### 4. Enable Socket Mode (Recommended for Development)

1. Go to **Socket Mode** in your app settings
2. Enable Socket Mode
3. Generate an app-level token with `connections:write` scope
4. Copy the token (starts with `xapp-`)
5. Save it as `SLACK_APP_TOKEN`

> **Note:** Socket Mode is great for development but for production, consider using the Events API instead.

### 5. Subscribe to Events

1. Go to **Event Subscriptions**
2. Enable Events
3. If using Socket Mode, events will be delivered through the socket
4. If using Events API (production), provide your server URL
5. Subscribe to these bot events:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`
   - `reaction_added`
   - `reaction_removed`

## Authentication Modes

The Slack adapter supports two authentication modes:

### Socket Mode (Development)

Best for development and testing. No public URL required.

```typescript
const bot = createBot({
  platform: 'slack',
  credentials: {
    botToken: process.env.SLACK_BOT_TOKEN,    // xoxb-...
    appToken: process.env.SLACK_APP_TOKEN,    // xapp-...
  },
});
```

### Events API (Production)

Best for production deployments.

```typescript
const bot = createBot({
  platform: 'slack',
  credentials: {
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
  },
});
```

The adapter automatically detects which mode to use based on the credentials provided.

## Usage

### Basic Message Operations

```typescript
// Send a message
await bot.sendMessage('C1234567890', 'Hello, Slack!');

// Reply to a message
bot.onMessage(async (message) => {
  await bot.reply(message, 'Got your message!');
});

// Edit a message
const result = await bot.sendMessage('C1234567890', 'Original');
if (result.ok) {
  await bot.editMessage(result.value, 'Edited!');
}

// Delete a message
await bot.deleteMessage(message);
```

### Reactions

```typescript
bot.onMessage(async (message) => {
  // Add reaction
  await bot.addReaction(message, '👍');

  // Remove reaction
  await bot.removeReaction(message, '👍');
});
```

### Threads

```typescript
bot.onMessage(async (message) => {
  // Create a thread
  await bot.createThread(message, 'Starting a thread!');

  // Reply in existing thread
  await bot.sendMessage(message.channelId, 'Thread reply', {
    threadId: message.threadId,
  });
});
```

### Platform-Specific Features

Use Slack's Block Kit for rich messages:

```typescript
await bot.sendMessage('C1234567890', 'Hello!', {
  slack: {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Hello* from Slack Block Kit!',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Click Me',
            },
            action_id: 'button_click',
          },
        ],
      },
    ],
  },
});
```

## Important: MessageRef Pattern

Slack requires channel context for message operations (edit, delete, reactions). The adapter uses a cache to store this context, but for guaranteed reliability, **always pass the full message object**:

```typescript
// ✅ RECOMMENDED: Always works
bot.onMessage(async (message) => {
  await bot.editMessage(message, 'Updated');
  await bot.addReaction(message, '👍');
});

// ⚠️ Works if message is in cache (last 1000 messages, 1 hour)
await bot.editMessage(messageId, 'Updated');
```

### How the Cache Works

- **Capacity:** Stores last 1000 messages
- **TTL:** Messages expire after 1 hour
- **Hit Rate:** ~95% for typical interactive bots
- **When it fails:**
  - Message older than 1 hour
  - Bot restarted
  - Message sent by another instance

### Error Messages Guide You

If cache lookup fails, you'll get a helpful error:

```
Cannot edit message: channel context not found.

This happens when:
1. The message is older than 1 hour (cache expired)
2. The bot restarted since the message was sent
3. The message was sent by another bot instance

Solution: Pass the full message object instead:
  bot.editMessage(message, "text")  // ✅ Works reliably
  bot.editMessage(message.id, "text")  // ❌ May fail on Slack
```

## Known Limitations

### 1. Message Context Requirement

Unlike Discord, Slack requires both channel ID and message timestamp for operations. This is handled transparently via caching, but long-lived message references should use the full message object.

### 2. Timestamps as IDs

Slack uses timestamps as message IDs (e.g., `"1503435956.000247"`). These are unique but may look unusual compared to typical IDs.

### 3. File Uploads

File uploads are not yet implemented in this version. Coming in Phase 5.

### 4. Message Formatting

Slack uses `mrkdwn` (their own Markdown variant), not standard Markdown. The adapter does minimal conversion. For rich formatting, use Block Kit.

## Configuration

### Cache Settings

```typescript
import { SlackAdapter } from '@switchboard/slack';

const adapter = new SlackAdapter({
  cacheSize: 5000,              // Store more messages
  cacheTTL: 1000 * 60 * 60 * 2, // 2 hour TTL
});

const bot = createBot({
  platform: 'slack',
  adapter,
  credentials: { ... },
});
```

### Events API Port

```typescript
const adapter = new SlackAdapter({
  socketMode: false,
  port: 3000,  // Custom port for Events API
});
```

## Monitoring

The adapter logs cache hit rates every 1000 operations:

```
📊 Slack cache hit rate: 96.8% (968/1000)
```

High hit rates (>90%) indicate good performance. Lower rates suggest:
- Long-lived message references (consider using message objects)
- Frequent bot restarts (consider persistent cache in production)
- Multi-instance deployment (consider Redis cache)

## Examples

See the [examples directory](../../examples) for complete examples:

- `hello-world/slack.ts` - Basic Slack bot
- `hello-world/one-line-swap.ts` - Demonstrates platform switching

## API Reference

See [@switchboard/core](../core/README.md) for the full API reference. The Slack adapter implements the complete `PlatformAdapter` interface.

## License

MIT
