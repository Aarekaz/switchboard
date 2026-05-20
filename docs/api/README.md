# Switchboard API Reference

Complete API documentation for Switchboard SDK.

## Primary Package

Install the umbrella package to access all platforms with one dependency:

```bash
pnpm add @aarekaz/switchboard
```

Subpath exports for adapters:
- `@aarekaz/switchboard` - Core types, client, and interfaces
- `@aarekaz/switchboard/discord` - Discord adapter
- `@aarekaz/switchboard/slack` - Slack adapter
- `@aarekaz/switchboard/telegram` - Telegram adapter

---

## @aarekaz/switchboard

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
  - `platform`: Platform name (`'discord' | 'slack' | 'telegram'`)
  - `credentials`: Platform-specific credentials
  - `adapter?`: Optional custom adapter instance

**Returns:** `Bot` instance

**Example:**
```typescript
import { createBot } from '@aarekaz/switchboard';
import '@aarekaz/switchboard/discord';

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

##### Portable Conversations: conversationFor()

```typescript
conversationFor(
  message: UnifiedMessage,
  options?: ConversationOptions
): Conversation
```

Create a portable conversation helper for a normalized message. The helper derives a stable conversation key from the platform, channel, and thread/message IDs, then stores normalized history in a `ConversationStore`.

By default, conversations use the core in-memory store. That is useful for local bots, tests, and short-lived examples. Production bots should pass a durable `ConversationStore` implementation backed by their own database, cache, or runtime state service.

**Parameters:**
- `message`: Message to anchor the conversation to
- `options?`: Optional conversation key, identity key, store, or metadata

**Returns:** `Conversation`

**Example:**
```typescript
bot.onMessage(async (ctx) => {
  const conversation = bot.conversationFor(ctx.message);

  const appendResult = await conversation.append(ctx.message);
  if (!appendResult.ok) {
    console.error('Failed to save message:', appendResult.error.message);
    return;
  }

  const messagesResult = await conversation.toAISDKMessages({ limit: 20 });
  if (!messagesResult.ok) {
    console.error('Failed to load history:', messagesResult.error.message);
    return;
  }

  // Pass messagesResult.value to your AI SDK call.
});
```

For durable history, pass a store explicitly:

```typescript
import type { ConversationStore } from '@aarekaz/switchboard';

declare const store: ConversationStore;

bot.onMessage(async (ctx) => {
  const conversation = bot.conversationFor(ctx.message, { store });
  await conversation.append(ctx.message);
});
```

**Related APIs:**
- `Conversation.append(message, role?, metadata?)`
- `Conversation.toAISDKMessages({ limit?, since? })`
- `InMemoryConversationStore`
- `ConversationStore`

---

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
onMessage(handler: (ctx: MessageContext) => void | Promise<void>): () => void
```

Register a handler for incoming messages. Handlers receive a `MessageContext`, which exposes the normalized message plus convenience helpers like `ctx.reply()`, `ctx.react()`, and `ctx.createThread()`.

**Parameters:**
- `handler`: Function to call when messages are received

**Example:**
```typescript
bot.onMessage(async (ctx) => {
  console.log(`Message from ${ctx.userId}: ${ctx.text}`);

  if (ctx.text.includes('ping')) {
    await ctx.reply('pong!');
  }
});
```

---

##### sendMessage()

```typescript
async sendMessage(
  channelId: string,
  content: MessageContent,
  options?: SendMessageOptions
): Promise<Result<UnifiedMessage>>
```

Send a message to a channel.

**Parameters:**
- `channelId`: ID of the channel to send to
- `content`: Message text or text stream
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
  content: MessageContent,
  options?: SendMessageOptions
): Promise<Result<UnifiedMessage>>
```

Reply to a message.

**Parameters:**
- `message`: Message to reply to
- `content`: Reply text or text stream
- `options?`: Optional message options

**Returns:** `Result<UnifiedMessage>`

**Example:**
```typescript
bot.onMessage(async (ctx) => {
  const result = await ctx.reply('Got your message!');

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
  content: MessageContent
): Promise<Result<UnifiedMessage>>
```

Create a thread on a message.

**Parameters:**
- `messageRef`: Message to create thread on
- `content`: First message in the thread, as text or a text stream

**Returns:** `Result<UnifiedMessage>` - The thread message

**Example:**
```typescript
bot.onMessage(async (ctx) => {
  if (ctx.text.includes('discuss')) {
    const result = await ctx.createThread('Let\'s discuss this!');

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
async getUsers(channelId?: string): Promise<Result<User[]>>
```

Get list of users, optionally scoped to a channel.

**Parameters:**
- `channelId?`: Optional channel ID for platforms that support channel-scoped user lookup

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

  /** Options for streamed content */
  stream?: StreamOptions;

  /** Discord-specific options */
  discord?: {
    embeds?: unknown[];
    components?: unknown[];
  };

  /** Slack-specific options */
  slack?: {
    blocks?: unknown[];
    unfurl_links?: boolean;
    unfurl_media?: boolean;
  };

  /** Telegram-specific options */
  telegram?: {
    parse_mode?: 'HTML' | 'MarkdownV2';
    disable_web_page_preview?: boolean;
    disable_notification?: boolean;
    protect_content?: boolean;
    reply_markup?: unknown;
  };
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

  /** Subscribe to platform events */
  onEvent(handler: (event: UnifiedEvent) => void | Promise<void>): () => void;

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

  /** Upload file */
  uploadFile(channelId: string, file: unknown, options?: UploadOptions): Promise<Result<UnifiedMessage>>;

  /** Get channels */
  getChannels(): Promise<Result<Channel[]>>;

  /** Get users */
  getUsers(channelId?: string): Promise<Result<User[]>>;

  /** Normalize platform-specific message to UnifiedMessage */
  normalizeMessage(platformMessage: unknown): UnifiedMessage;

  /** Normalize platform-specific event to UnifiedEvent */
  normalizeEvent(platformEvent: unknown): UnifiedEvent | null;
}
```

---

## @aarekaz/switchboard/discord

Discord platform adapter.

### Auto-Registration

```typescript
import '@aarekaz/switchboard/discord';
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
import { createBot } from '@aarekaz/switchboard';
import '@aarekaz/switchboard/discord';

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

## @aarekaz/switchboard/slack

Slack platform adapter with LRU caching for message operations.

### Auto-Registration

```typescript
import '@aarekaz/switchboard/slack';
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
import { createBot } from '@aarekaz/switchboard';
import '@aarekaz/switchboard/slack';

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
import { SlackAdapter } from '@aarekaz/switchboard/slack';

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

## @aarekaz/switchboard/telegram

Telegram platform adapter.

### Auto-Registration

```typescript
import '@aarekaz/switchboard/telegram';
```

### Credentials

```typescript
interface TelegramCredentials {
  /** Telegram bot token from BotFather */
  token: string;
}
```

### Example

```typescript
import { createBot } from '@aarekaz/switchboard';
import '@aarekaz/switchboard/telegram';

const bot = createBot({
  platform: 'telegram',
  credentials: {
    token: process.env.TELEGRAM_BOT_TOKEN,
  },
});

await bot.start();
```

### Platform-Specific Features

Telegram options are available through `SendMessageOptions.telegram`:

```typescript
await bot.sendMessage(chatId, 'Hello **world**', {
  telegram: {
    parse_mode: 'MarkdownV2',
    disable_notification: true,
  },
});
```

See [Telegram README](../../packages/telegram/README.md) for complete documentation.

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
bot.onMessage(async (ctx) => {
  await bot.editMessage(ctx.message, 'Updated'); // Always works
  await ctx.react('👍');                         // Always works
});

// Works, but may fail on Slack if cached
await bot.editMessage(messageId, 'Updated');
```

### 3. Handle Platform-Specific Errors

```typescript
const result = await bot.sendMessage('channel', 'Hello!');

if (!result.ok) {
  console.error(result.error.message);
  return;
}
```

### 4. Use TypeScript

Switchboard is written in TypeScript and provides excellent type safety:

```typescript
import type { MessageContext, Result } from '@aarekaz/switchboard';

bot.onMessage(async (ctx: MessageContext) => {
  // Full autocomplete and type checking
  console.log(ctx.text);
});
```

---

## Additional Resources

- [Architecture Decision Records](../adr/)
- [Contributing Guide](../../CONTRIBUTING.md)
- [Discord Adapter README](../../packages/discord/README.md)
- [Slack Adapter README](../../packages/slack/README.md)
- [Telegram Adapter README](../../packages/telegram/README.md)
- [Examples](../../examples/)
