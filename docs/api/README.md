# Switchboard API Reference

Complete API documentation for Switchboard SDK.

## Core Packages

- [@aarekaz/switchboard-core](#switchboardcore) - Core types, client, and interfaces
- [@aarekaz/switchboard-discord](#switchboarddiscord) - Discord adapter
- [@aarekaz/switchboard-slack](#switchboardslack) - Slack adapter

---

## @aarekaz/switchboard-core

The core package provides platform-agnostic interfaces and types.

### createBot()

Creates a new bot instance for the specified platform.

```typescript
function createBot<P extends PlatformType>(
  config: BotConfig<P>
): Bot
```

**Parameters:**
- `config`: Bot configuration object
  - `platform`: Platform name ('discord' | 'slack')
  - `credentials`: Platform-specific credentials
  - `adapter?`: Optional custom adapter instance

**Returns:** `Bot` instance

**Example:**
```typescript
import { createBot } from '@aarekaz/switchboard-core';
import '@aarekaz/switchboard-discord';

const bot = createBot({
  platform: 'discord',
  credentials: {
    token: process.env.DISCORD_TOKEN,
  },
});
```

---

### Bot Interface

The main bot client interface.

#### Methods

##### start()

```typescript
async start(): Promise<void>
```

Connects to the platform and starts the bot.

**Throws:** `ConnectionError` if connection fails

**Example:**
```typescript
await bot.start();
console.log('Bot is running!');
```

---

##### stop()

```typescript
async stop(): Promise<void>
```

Disconnects from the platform and stops the bot.

**Example:**
```typescript
await bot.stop();
```

---

##### onMessage()

```typescript
onMessage(handler: (message: UnifiedMessage) => void | Promise<void>): void
```

Register a handler for incoming messages.

**Parameters:**
- `handler`: Function to call when messages are received

**Example:**
```typescript
bot.onMessage(async (message) => {
  console.log(`Message from ${message.userId}: ${message.text}`);

  if (message.text.includes('ping')) {
    await bot.reply(message, 'pong!');
  }
});
```

---

##### sendMessage()

```typescript
async sendMessage(
  channelId: string,
  text: string,
  options?: SendMessageOptions
): Promise<Result<UnifiedMessage>>
```

Send a message to a channel.

**Parameters:**
- `channelId`: ID of the channel to send to
- `text`: Message text
- `options?`: Optional message options

**Returns:** `Result<UnifiedMessage>` - The sent message or an error

**Example:**
```typescript
const result = await bot.sendMessage('channel-id', 'Hello, world!');

if (result.ok) {
  console.log('Message sent:', result.value.id);
} else {
  console.error('Failed to send:', result.error.message);
}
```

---

##### reply()

```typescript
async reply(
  message: UnifiedMessage,
  text: string,
  options?: SendMessageOptions
): Promise<Result<UnifiedMessage>>
```

Reply to a message.

**Parameters:**
- `message`: Message to reply to
- `text`: Reply text
- `options?`: Optional message options

**Returns:** `Result<UnifiedMessage>`

**Example:**
```typescript
bot.onMessage(async (message) => {
  const result = await bot.reply(message, 'Got your message!');

  if (!result.ok) {
    console.error('Failed to reply:', result.error);
  }
});
```

---

##### editMessage()

```typescript
async editMessage(
  messageRef: MessageRef,
  newText: string
): Promise<Result<UnifiedMessage>>
```

Edit an existing message.

**Parameters:**
- `messageRef`: Message to edit (string ID or UnifiedMessage object)
- `newText`: New text for the message

**Returns:** `Result<UnifiedMessage>`

**Example:**
```typescript
const sendResult = await bot.sendMessage('channel-id', 'Original');

if (sendResult.ok) {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const editResult = await bot.editMessage(sendResult.value, 'Edited!');

  if (!editResult.ok) {
    console.error('Edit failed:', editResult.error);
  }
}
```

---

##### deleteMessage()

```typescript
async deleteMessage(messageRef: MessageRef): Promise<Result<void>>
```

Delete a message.

**Parameters:**
- `messageRef`: Message to delete (string ID or UnifiedMessage object)

**Returns:** `Result<void>`

**Example:**
```typescript
const result = await bot.deleteMessage(message);

if (!result.ok) {
  console.error('Delete failed:', result.error);
}
```

---

##### addReaction()

```typescript
async addReaction(
  messageRef: MessageRef,
  emoji: string
): Promise<Result<void>>
```

Add a reaction to a message.

**Parameters:**
- `messageRef`: Message to react to
- `emoji`: Emoji to add (Unicode or Slack name format)

**Returns:** `Result<void>`

**Example:**
```typescript
// Unicode emoji (works on Discord, converted on Slack)
await bot.addReaction(message, '👍');

// Slack named format (works everywhere)
await bot.addReaction(message, 'thumbsup');
```

---

##### removeReaction()

```typescript
async removeReaction(
  messageRef: MessageRef,
  emoji: string
): Promise<Result<void>>
```

Remove a reaction from a message.

**Parameters:**
- `messageRef`: Message to remove reaction from
- `emoji`: Emoji to remove

**Returns:** `Result<void>`

---

##### createThread()

```typescript
async createThread(
  messageRef: MessageRef,
  text: string
): Promise<Result<UnifiedMessage>>
```

Create a thread on a message.

**Parameters:**
- `messageRef`: Message to create thread on
- `text`: First message in the thread

**Returns:** `Result<UnifiedMessage>` - The thread message

**Example:**
```typescript
bot.onMessage(async (message) => {
  if (message.text.includes('discuss')) {
    const result = await bot.createThread(message, 'Let\'s discuss this!');

    if (result.ok) {
      console.log('Thread created:', result.value.threadId);
    }
  }
});
```

---

##### getChannels()

```typescript
async getChannels(): Promise<Result<Channel[]>>
```

Get list of available channels.

**Returns:** `Result<Channel[]>`

---

##### getUsers()

```typescript
async getUsers(): Promise<Result<User[]>>
```

Get list of users.

**Returns:** `Result<User[]>`

---

### Core Types

#### UnifiedMessage

Normalized message format across all platforms.

```typescript
interface UnifiedMessage {
  /** Unique message ID */
  id: string;

  /** Channel ID where message was sent */
  channelId: string;

  /** User ID who sent the message */
  userId: string;

  /** Message text content */
  text: string;

  /** Message timestamp */
  timestamp: Date;

  /** Thread ID if message is in a thread */
  threadId?: string;

  /** File attachments */
  attachments?: Attachment[];

  /** Platform this message is from */
  platform: PlatformType;

  /** Original platform message (escape hatch) */
  _raw: unknown;
}
```

---

#### MessageRef

Reference to a message - can be either a string ID or full message object.

```typescript
type MessageRef = string | UnifiedMessage;
```

**Usage:**
- Passing `UnifiedMessage` works reliably on ALL platforms
- Passing string ID works on Discord, works on Slack if cached (~95% of cases)

**See:** [ADR-001](../adr/001-message-ref-pattern.md) for architecture details

---

#### Result<T>

Explicit error handling type inspired by Rust.

```typescript
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };
```

**Example:**
```typescript
const result = await bot.sendMessage('channel', 'Hello!');

if (result.ok) {
  // TypeScript knows: result.value is UnifiedMessage
  console.log('Success:', result.value.id);
} else {
  // TypeScript knows: result.error is Error
  console.error('Failed:', result.error.message);
}
```

**See:** [ADR-004](../adr/004-result-type-pattern.md) for rationale

---

#### Channel

```typescript
interface Channel {
  /** Unique channel ID */
  id: string;

  /** Channel name */
  name: string;

  /** Channel type */
  type: ChannelType;

  /** Whether channel is private */
  isPrivate: boolean;

  /** Channel topic/description */
  topic?: string;
}

type ChannelType = 'text' | 'voice' | 'dm' | 'group_dm' | 'category' | 'unknown';
```

---

#### User

```typescript
interface User {
  /** Unique user ID */
  id: string;

  /** Username */
  username: string;

  /** Display name (may differ from username) */
  displayName?: string;

  /** Whether user is a bot */
  isBot: boolean;

  /** Avatar URL */
  avatarUrl?: string;
}
```

---

#### Attachment

```typescript
interface Attachment {
  /** Attachment ID */
  id: string;

  /** Filename */
  filename: string;

  /** Download URL */
  url: string;

  /** MIME type */
  mimeType: string;

  /** File size in bytes */
  size: number;
}
```

---

#### SendMessageOptions

```typescript
interface SendMessageOptions {
  /** Thread ID to send message in */
  threadId?: string;

  /** Platform-specific options (escape hatch) */
  [platform: string]: unknown;
}
```

**Example with platform-specific options:**
```typescript
// Slack Block Kit
await bot.sendMessage('channel-id', 'Hello!', {
  slack: {
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*Bold* message' }
      }
    ]
  }
});
```

---

#### Errors

Switchboard provides specific error classes:

```typescript
class ConnectionError extends Error {
  constructor(public platform: string, public cause: Error);
}

class MessageSendError extends Error {
  constructor(public platform: string, public channelId: string, public cause: Error);
}

class MessageEditError extends Error {
  constructor(public platform: string, public messageId: string, public cause: Error);
}

class MessageDeleteError extends Error {
  constructor(public platform: string, public messageId: string, public cause: Error);
}

class ReactionError extends Error {
  constructor(public platform: string, public messageId: string, public cause: Error);
}
```

---

### PlatformAdapter Interface

Interface that all platform adapters must implement.

```typescript
interface PlatformAdapter {
  /** Adapter name */
  readonly name: string;

  /** Platform type */
  readonly platform: PlatformType;

  /** Connect to platform */
  connect(credentials: unknown): Promise<void>;

  /** Disconnect from platform */
  disconnect(): Promise<void>;

  /** Check if connected */
  isConnected(): boolean;

  /** Register event handler */
  on(handler: (event: UnifiedEvent) => void): void;

  /** Send message */
  sendMessage(channelId: string, text: string, options?: SendMessageOptions): Promise<Result<UnifiedMessage>>;

  /** Edit message */
  editMessage(messageRef: MessageRef, newText: string): Promise<Result<UnifiedMessage>>;

  /** Delete message */
  deleteMessage(messageRef: MessageRef): Promise<Result<void>>;

  /** Add reaction */
  addReaction(messageRef: MessageRef, emoji: string): Promise<Result<void>>;

  /** Remove reaction */
  removeReaction(messageRef: MessageRef, emoji: string): Promise<Result<void>>;

  /** Create thread */
  createThread(messageRef: MessageRef, text: string): Promise<Result<UnifiedMessage>>;

  /** Get channels */
  getChannels(): Promise<Result<Channel[]>>;

  /** Get users */
  getUsers(): Promise<Result<User[]>>;

  /** Upload file */
  uploadFile(channelId: string, file: UploadOptions): Promise<Result<UnifiedMessage>>;
}
```

---

## @aarekaz/switchboard-discord

Discord platform adapter.

### Auto-Registration

```typescript
import '@aarekaz/switchboard-discord';
```

Side-effect import automatically registers the Discord adapter.

### Credentials

```typescript
interface DiscordCredentials {
  /** Discord bot token */
  token: string;

  /** Gateway intents (optional) */
  intents?: number[];
}
```

### Example

```typescript
import { createBot } from '@aarekaz/switchboard-core';
import '@aarekaz/switchboard-discord';

const bot = createBot({
  platform: 'discord',
  credentials: {
    token: process.env.DISCORD_TOKEN,
  },
});

await bot.start();
```

### Platform-Specific Features

Discord adapter supports all core operations. See [Discord README](../../packages/discord/README.md) for platform-specific details.

---

## @aarekaz/switchboard-slack

Slack platform adapter with LRU caching for message operations.

### Auto-Registration

```typescript
import '@aarekaz/switchboard-slack';
```

### Credentials

```typescript
interface SlackCredentials {
  /** Slack bot token (xoxb-...) */
  botToken: string;

  /** App token for Socket Mode (xapp-...) */
  appToken?: string;

  /** Signing secret for Events API */
  signingSecret?: string;
}
```

### Configuration

```typescript
interface SlackConfig {
  /** Message cache size (default: 1000) */
  cacheSize?: number;

  /** Cache TTL in milliseconds (default: 3600000 = 1 hour) */
  cacheTTL?: number;

  /** Force Socket Mode (auto-detected by default) */
  socketMode?: boolean;

  /** Port for Events API (default: 3000) */
  port?: number;
}
```

### Example

**Socket Mode** (recommended for development):
```typescript
import { createBot } from '@aarekaz/switchboard-core';
import '@aarekaz/switchboard-slack';

const bot = createBot({
  platform: 'slack',
  credentials: {
    botToken: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
  },
});

await bot.start();
```

**Events API** (recommended for production):
```typescript
const bot = createBot({
  platform: 'slack',
  credentials: {
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
  },
});
```

**Custom Configuration**:
```typescript
import { SlackAdapter } from '@aarekaz/switchboard-slack';

const adapter = new SlackAdapter({
  cacheSize: 5000,
  cacheTTL: 1000 * 60 * 60 * 2, // 2 hours
});

const bot = createBot({
  platform: 'slack',
  adapter,
  credentials: { /* ... */ },
});
```

### Message Context Caching

Slack adapter uses an LRU cache to enable string message IDs:
- **Cache size**: 1000 messages (configurable)
- **TTL**: 1 hour (configurable)
- **Hit rate**: ~95% for typical usage

**See:** [ADR-002](../adr/002-lru-cache-strategy.md) for details

### Emoji Handling

Slack requires named emoji format (`:thumbsup:`), but Switchboard automatically converts 30+ common Unicode emojis:

```typescript
// These work automatically:
await bot.addReaction(message, '👍');  // Converted to 'thumbsup'
await bot.addReaction(message, '🎉');  // Converted to 'tada'

// Or use named format directly:
await bot.addReaction(message, 'thumbsup');  // Works everywhere
```

**See:** [ADR-005](../adr/005-emoji-mapping-strategy.md) for emoji mapping

### Platform-Specific Features

Slack adapter supports Slack Block Kit for rich messages:

```typescript
await bot.sendMessage('channel-id', 'Hello!', {
  slack: {
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*Bold* message' }
      }
    ]
  }
});
```

See [Slack README](../../packages/slack/README.md) for complete documentation.

---

## Helper Functions

### ok()

Create a successful Result.

```typescript
function ok<T>(value: T): Result<T>
```

**Example:**
```typescript
return ok({ id: '123', text: 'Hello' });
```

### err()

Create an error Result.

```typescript
function err<T>(error: Error): Result<T>
```

**Example:**
```typescript
return err(new Error('Connection failed'));
```

---

## Best Practices

### 1. Always Check Result Status

```typescript
const result = await bot.sendMessage('channel', 'Hello!');

if (!result.ok) {
  console.error('Failed to send:', result.error);
  return;
}

// Safe to use result.value here
console.log('Sent:', result.value.id);
```

### 2. Use Full Message Objects

For guaranteed reliability across platforms:

```typescript
// Recommended
bot.onMessage(async (message) => {
  await bot.editMessage(message, 'Updated'); // Always works
  await bot.addReaction(message, '👍');       // Always works
});

// Works, but may fail on Slack if cached
await bot.editMessage(messageId, 'Updated');
```

### 3. Handle Platform-Specific Errors

```typescript
const result = await bot.sendMessage('channel', 'Hello!');

if (!result.ok) {
  if (result.error instanceof RateLimitError) {
    // Wait and retry
  } else if (result.error instanceof PermissionError) {
    // Log and skip
  } else {
    // Unknown error
    throw result.error;
  }
}
```

### 4. Use TypeScript

Switchboard is written in TypeScript and provides excellent type safety:

```typescript
import { UnifiedMessage, Result } from '@aarekaz/switchboard-core';

bot.onMessage(async (message: UnifiedMessage) => {
  // Full autocomplete and type checking
  console.log(message.text);
});
```

---

## Additional Resources

- [Architecture Decision Records](../adr/)
- [Contributing Guide](../../CONTRIBUTING.md)
- [Discord Adapter README](../../packages/discord/README.md)
- [Slack Adapter README](../../packages/slack/README.md)
- [Examples](../../examples/)
