# Switchboard SDK - Technical Specification

**Version:** 1.0.0
**Last Updated:** 2026-01-12
**Status:** Architecture & Planning Phase

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Vision & Goals](#vision--goals)
3. [Architecture Overview](#architecture-overview)
4. [Core Concepts & Types](#core-concepts--types)
5. [API Specification](#api-specification)
6. [Platform Adapter Interface](#platform-adapter-interface)
7. [Monorepo Structure](#monorepo-structure)
8. [Type System Design](#type-system-design)
9. [Middleware System](#middleware-system)
10. [Error Handling Strategy](#error-handling-strategy)
11. [Implementation Phases](#implementation-phases)
12. [Testing Strategy](#testing-strategy)
13. [Success Metrics](#success-metrics)
14. [Design Decisions](#design-decisions)

---

## Project Overview

Switchboard is a universal SDK for chat platforms that enables developers to build bots once and deploy them seamlessly across Slack, Teams, Discord, and Google Chat.

**Core Promise:** Build once, deploy everywhere.

**Key Principle:** Platforms are implementation details, not architectural constraints.

---

## Vision & Goals

### Primary Goals
1. **Zero-friction platform switching** - Change one line of code to switch platforms
2. **Progressive disclosure of complexity** - Simple things simple, complex things possible
3. **Type-safe by default** - Full TypeScript support with intelligent inference
4. **Best-in-class DX** - Inspired by Vercel AI SDK, Hono, tRPC

### Non-Goals (Explicit Exclusions)
- ❌ Platform-specific features in core API (they belong in opt-in extensions)
- ❌ Supporting every edge case (80/20 rule - focus on common use cases)
- ❌ Backwards compatibility with legacy platform SDKs
- ❌ GUI/visual bot builders (code-first approach)

---

## Architecture Overview

### Layered Architecture (Vercel AI SDK Pattern)

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: High-Level Client API                    │
│  - createBot()                                      │
│  - Unified message operations                       │
│  - Event handlers                                   │
│  Target: 90% of users                               │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 2: Platform Client                          │
│  - Platform-specific options (opt-in)               │
│  - Advanced features                                │
│  Target: 9% of users (power users)                  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 3: Platform Adapters                        │
│  - Discord adapter                                  │
│  - Slack adapter                                    │
│  - Teams adapter                                    │
│  - Google Chat adapter                              │
│  Target: 1% of users (extending the SDK)            │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 4: Event Normalization (Internal)           │
│  - Platform event → Unified event                   │
│  - Unified action → Platform action                 │
│  Target: Internal use only                          │
└─────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Dependency Inversion**
   - Core depends on abstractions (PlatformAdapter interface)
   - Platform packages depend on core and implement adapters
   - Allows platform packages to be tree-shakeable

2. **Auto-Registration Pattern**
   ```typescript
   import '@switchboard/discord'; // Side-effect: registers adapter
   ```
   - Platform adapters register themselves when imported
   - Core maintains a registry of available adapters
   - Users get simplicity, tree-shaking still works

3. **Result Type Pattern** (Rust-inspired)
   ```typescript
   type Result<T> =
     | { ok: true; value: T }
     | { ok: false; error: Error }
   ```
   - Explicit error handling
   - No thrown exceptions in happy path
   - Type-safe error checking

---

## Core Concepts & Types

### 1. UnifiedMessage

The fundamental abstraction - represents a message across all platforms.

```typescript
interface UnifiedMessage {
  // Core identifiers
  id: string;                    // Platform-specific message ID
  channelId: string;             // Channel/room/conversation ID
  userId: string;                // Sender's user ID

  // Content
  text: string;                  // Plain text content

  // Metadata
  timestamp: Date;               // When the message was sent
  threadId?: string;             // Thread/reply chain ID (if applicable)

  // Attachments
  attachments?: Attachment[];    // Files, images, etc.

  // Context
  platform: PlatformType;        // Which platform this is from

  // Platform-specific data (escape hatch)
  _raw: unknown;                 // Original platform message object
}
```

### 2. UnifiedEvent

Events that can occur across platforms.

```typescript
type UnifiedEvent =
  | MessageEvent
  | ReactionEvent
  | UserJoinedEvent
  | UserLeftEvent
  | ChannelCreatedEvent
  | ChannelDeletedEvent;

interface MessageEvent {
  type: 'message';
  message: UnifiedMessage;
}

interface ReactionEvent {
  type: 'reaction';
  messageId: string;
  userId: string;
  emoji: string;
  action: 'added' | 'removed';
}

// ... other event types
```

### 3. PlatformType

Supported platforms (extensible).

```typescript
type PlatformType =
  | 'discord'
  | 'slack'
  | 'teams'
  | 'google-chat'
  | string; // Allow custom platforms
```

### 4. Attachment

File attachments abstraction.

```typescript
interface Attachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}
```

---

## API Specification

### High-Level Client API (Layer 1)

#### createBot()

The main entry point for creating a bot instance.

```typescript
function createBot(config: BotConfig): Bot;

interface BotConfig {
  // Required
  platform: PlatformType;

  // Authentication (platform-specific)
  credentials: {
    token?: string;           // For Discord, Slack (bot tokens)
    appId?: string;           // For Teams
    appPassword?: string;     // For Teams
    // ... other auth methods
  };

  // Optional
  adapter?: PlatformAdapter;  // Custom adapter (power users)
  middleware?: Middleware[];  // Request/response middleware
  logger?: Logger;            // Custom logger

  // Platform-specific config (opt-in)
  platformConfig?: {
    discord?: DiscordConfig;
    slack?: SlackConfig;
    teams?: TeamsConfig;
    googleChat?: GoogleChatConfig;
  };
}
```

#### Bot Interface

The object returned by `createBot()`.

```typescript
interface Bot {
  // Platform info
  readonly platform: PlatformType;

  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;

  // Message operations
  sendMessage(
    channelId: string,
    text: string,
    options?: SendMessageOptions
  ): Promise<Result<UnifiedMessage>>;

  reply(
    message: UnifiedMessage,
    text: string
  ): Promise<Result<UnifiedMessage>>;

  editMessage(
    messageId: string,
    newText: string
  ): Promise<Result<UnifiedMessage>>;

  deleteMessage(
    messageId: string
  ): Promise<Result<void>>;

  // Reactions
  addReaction(
    messageId: string,
    emoji: string
  ): Promise<Result<void>>;

  removeReaction(
    messageId: string,
    emoji: string
  ): Promise<Result<void>>;

  // Thread operations
  createThread(
    messageId: string,
    text: string
  ): Promise<Result<UnifiedMessage>>;

  // File uploads
  uploadFile(
    channelId: string,
    file: File | Buffer,
    options?: UploadOptions
  ): Promise<Result<UnifiedMessage>>;

  // Event handlers
  onMessage(handler: (message: UnifiedMessage) => void | Promise<void>): void;
  onReaction(handler: (event: ReactionEvent) => void | Promise<void>): void;
  onEvent(handler: (event: UnifiedEvent) => void | Promise<void>): void;

  // Channel/User info
  getChannels(): Promise<Result<Channel[]>>;
  getUsers(channelId?: string): Promise<Result<User[]>>;

  // Utility
  isConnected(): boolean;
  getAdapter(): PlatformAdapter;
}
```

#### SendMessageOptions

Platform-specific options (opt-in).

```typescript
interface SendMessageOptions {
  // Thread support
  threadId?: string;

  // Platform-specific options (opt-in)
  discord?: {
    embeds?: DiscordEmbed[];
    components?: DiscordComponent[];
  };

  slack?: {
    blocks?: SlackBlock[];
    unfurl_links?: boolean;
    unfurl_media?: boolean;
  };

  teams?: {
    attachments?: TeamsAttachment[];
  };

  googleChat?: {
    cards?: GoogleChatCard[];
  };
}
```

---

## Platform Adapter Interface

The contract that all platform adapters must implement.

```typescript
interface PlatformAdapter {
  // Metadata
  readonly name: string;
  readonly platform: PlatformType;

  // Lifecycle
  connect(credentials: unknown): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Message operations
  sendMessage(
    channelId: string,
    text: string,
    options?: unknown
  ): Promise<Result<UnifiedMessage>>;

  editMessage(
    messageId: string,
    newText: string
  ): Promise<Result<UnifiedMessage>>;

  deleteMessage(messageId: string): Promise<Result<void>>;

  // Reactions
  addReaction(messageId: string, emoji: string): Promise<Result<void>>;
  removeReaction(messageId: string, emoji: string): Promise<Result<void>>;

  // Thread operations
  createThread(
    messageId: string,
    text: string
  ): Promise<Result<UnifiedMessage>>;

  // File uploads
  uploadFile(
    channelId: string,
    file: unknown,
    options?: unknown
  ): Promise<Result<UnifiedMessage>>;

  // Event subscription
  onEvent(handler: (event: UnifiedEvent) => void): void;

  // Info retrieval
  getChannels(): Promise<Result<Channel[]>>;
  getUsers(channelId?: string): Promise<Result<User[]>>;

  // Normalization helpers (internal use)
  normalizeMessage(platformMessage: unknown): UnifiedMessage;
  normalizeEvent(platformEvent: unknown): UnifiedEvent;
}
```

### Adapter Registry

Internal registry for auto-registration.

```typescript
// packages/core/src/adapter/registry.ts
class AdapterRegistry {
  private adapters = new Map<PlatformType, PlatformAdapter>();

  register(platform: PlatformType, adapter: PlatformAdapter): void {
    this.adapters.set(platform, adapter);
  }

  get(platform: PlatformType): PlatformAdapter | undefined {
    return this.adapters.get(platform);
  }

  has(platform: PlatformType): boolean {
    return this.adapters.has(platform);
  }
}

export const registry = new AdapterRegistry();
```

---

## Monorepo Structure

```
switchboard/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
│
├── packages/
│   ├── core/                           # @switchboard/core
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── message.ts          # UnifiedMessage
│   │   │   │   ├── event.ts            # UnifiedEvent
│   │   │   │   ├── channel.ts          # Channel types
│   │   │   │   ├── user.ts             # User types
│   │   │   │   ├── result.ts           # Result<T> type
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── adapter/
│   │   │   │   ├── interface.ts        # PlatformAdapter interface
│   │   │   │   ├── registry.ts         # Adapter registry
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── client/
│   │   │   │   ├── bot.ts              # Bot class implementation
│   │   │   │   ├── create-bot.ts       # createBot() factory
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── types.ts            # Middleware types
│   │   │   │   ├── logger.ts           # Built-in logger middleware
│   │   │   │   ├── retry.ts            # Built-in retry middleware
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── utils/
│   │   │   │   ├── errors.ts           # Custom error classes
│   │   │   │   ├── validators.ts       # Input validation
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── index.ts                # Main export
│   │   │
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   │
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── discord/                        # @switchboard/discord
│   │   ├── src/
│   │   │   ├── adapter.ts              # Discord adapter implementation
│   │   │   ├── types.ts                # Discord-specific types
│   │   │   ├── normalizers.ts          # Event/message normalization
│   │   │   ├── register.ts             # Auto-registration side effect
│   │   │   └── index.ts                # Exports + side effect
│   │   │
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── slack/                          # @switchboard/slack
│   │   └── (same structure as discord)
│   │
│   ├── teams/                          # @switchboard/teams
│   │   └── (same structure as discord)
│   │
│   └── google-chat/                    # @switchboard/google-chat
│       └── (same structure as discord)
│
├── examples/
│   ├── hello-world/
│   │   ├── discord.ts
│   │   ├── slack.ts
│   │   └── package.json
│   │
│   ├── ai-agent/
│   │   ├── index.ts                    # AI agent example
│   │   └── package.json
│   │
│   └── multi-platform/
│       ├── index.ts                    # Same bot on all platforms
│       └── package.json
│
├── docs/
│   ├── getting-started.md
│   ├── api-reference.md
│   ├── adapters.md
│   └── migration-guide.md
│
├── .changeset/                         # Changesets for versioning
├── package.json                        # Workspace root
├── pnpm-workspace.yaml                 # pnpm workspace config
├── tsconfig.json                       # Shared TS config
├── .eslintrc.js
├── .prettierrc
├── spec.md                             # This document
└── README.md
```

### Package Dependencies

```
@switchboard/core
  ↑
  ├── @switchboard/discord (depends on core)
  ├── @switchboard/slack (depends on core)
  ├── @switchboard/teams (depends on core)
  └── @switchboard/google-chat (depends on core)
```

---

## Type System Design

### Type Safety Levels

#### Level 1: Basic Type Safety (Default)

```typescript
const bot = createBot({ platform: 'discord' });
//    ^? Bot<'discord'>

const result = await bot.sendMessage('channel-id', 'Hello');
//    ^? Result<UnifiedMessage>

if (result.ok) {
  console.log(result.value.id);
  //                  ^? string
}
```

#### Level 2: Platform-Specific Type Inference

```typescript
const bot = createBot({ platform: 'discord' });

// TypeScript knows platform-specific options are available
await bot.sendMessage('channel-id', 'Hello', {
  discord: {
    embeds: [{ title: 'Test' }] // Type-checked against Discord types
  }
});
```

#### Level 3: Conditional Types for Platform Detection

```typescript
type Bot<P extends PlatformType = PlatformType> = {
  platform: P;
  sendMessage(
    channelId: string,
    text: string,
    options?: SendMessageOptions<P>
  ): Promise<Result<UnifiedMessage>>;
  // ...
};

type SendMessageOptions<P extends PlatformType> =
  P extends 'discord' ? { discord?: DiscordOptions } :
  P extends 'slack' ? { slack?: SlackOptions } :
  P extends 'teams' ? { teams?: TeamsOptions } :
  {};
```

### Result Type Implementation

```typescript
// packages/core/src/types/result.ts

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Helper for async operations
export async function wrapAsync<T>(
  fn: () => Promise<T>
): Promise<Result<T>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
```

---

## Middleware System

### Middleware Interface

```typescript
// packages/core/src/middleware/types.ts

interface MiddlewareContext {
  bot: Bot;
  event: UnifiedEvent;
  platform: PlatformType;
  timestamp: Date;
}

type Middleware = (
  context: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;
```

### Built-in Middleware

#### Logger Middleware

```typescript
// packages/core/src/middleware/logger.ts

export function logger(options?: LoggerOptions): Middleware {
  return async (context, next) => {
    console.log(`[${context.platform}] ${context.event.type}`, context.event);
    await next();
  };
}
```

#### Retry Middleware

```typescript
// packages/core/src/middleware/retry.ts

export function retry(options: RetryOptions): Middleware {
  return async (context, next) => {
    let attempts = 0;
    const maxAttempts = options.maxAttempts || 3;

    while (attempts < maxAttempts) {
      try {
        await next();
        return;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) throw error;
        await sleep(options.delayMs || 1000);
      }
    }
  };
}
```

#### Rate Limit Middleware

```typescript
// packages/core/src/middleware/rate-limit.ts

export function rateLimit(options: RateLimitOptions): Middleware {
  const limiter = new RateLimiter(options.maxPerMinute);

  return async (context, next) => {
    await limiter.acquire();
    await next();
  };
}
```

### Using Middleware

```typescript
const bot = createBot({
  platform: 'discord',
  middleware: [
    logger(),
    retry({ maxAttempts: 3 }),
    rateLimit({ maxPerMinute: 60 }),
  ],
});
```

---

## Error Handling Strategy

### Error Hierarchy

```typescript
// packages/core/src/utils/errors.ts

export class SwitchboardError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly platform?: PlatformType
  ) {
    super(message);
    this.name = 'SwitchboardError';
  }
}

export class AdapterNotFoundError extends SwitchboardError {
  constructor(platform: PlatformType) {
    super(
      `No adapter found for platform: ${platform}. Did you import @switchboard/${platform}?`,
      'ADAPTER_NOT_FOUND',
      platform
    );
  }
}

export class ConnectionError extends SwitchboardError {
  constructor(platform: PlatformType, cause: unknown) {
    super(
      `Failed to connect to ${platform}`,
      'CONNECTION_ERROR',
      platform
    );
    this.cause = cause;
  }
}

export class MessageSendError extends SwitchboardError {
  constructor(
    platform: PlatformType,
    channelId: string,
    cause: unknown
  ) {
    super(
      `Failed to send message to channel ${channelId} on ${platform}`,
      'MESSAGE_SEND_ERROR',
      platform
    );
    this.cause = cause;
  }
}

// ... other error types
```

### Error Handling Examples

```typescript
// Using Result type
const result = await bot.sendMessage('channel-id', 'Hello');

if (result.ok) {
  console.log('Message sent:', result.value.id);
} else {
  console.error('Failed to send:', result.error.message);

  if (result.error instanceof MessageSendError) {
    // Handle specific error type
  }
}

// Event handler errors
bot.onMessage(async (message) => {
  try {
    await bot.reply(message, 'Pong!');
  } catch (error) {
    console.error('Failed to reply:', error);
  }
});
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal:** Set up project infrastructure and core types

**Tasks:**
- [ ] Initialize monorepo with pnpm workspaces
- [ ] Set up TypeScript configuration (strict mode)
- [ ] Create `@switchboard/core` package
- [ ] Define core types:
  - UnifiedMessage
  - UnifiedEvent
  - Result<T>
  - PlatformAdapter interface
- [ ] Implement adapter registry
- [ ] Set up testing infrastructure (Vitest)
- [ ] Set up linting (ESLint) and formatting (Prettier)
- [ ] Create initial documentation structure

**Success Criteria:**
- ✅ pnpm workspace functional
- ✅ TypeScript compiles without errors
- ✅ Core types defined and exported
- ✅ Tests run successfully (even if minimal)

**Deliverables:**
- Working monorepo
- `@switchboard/core` package (types only, no implementation)
- Test infrastructure

---

### Phase 2: Discord Adapter (Week 2)

**Goal:** Build the first working adapter (Discord)

**Tasks:**
- [ ] Create `@switchboard/discord` package
- [ ] Install discord.js dependency
- [ ] Implement DiscordAdapter:
  - connect() / disconnect()
  - sendMessage()
  - Event normalization (message events)
  - Message normalization
- [ ] Implement auto-registration side effect
- [ ] Create hello-world example bot for Discord
- [ ] Test basic message send/receive

**Success Criteria:**
- ✅ Discord bot can connect
- ✅ Can send messages to Discord
- ✅ Can receive messages from Discord
- ✅ Example bot runs successfully

**Deliverables:**
- `@switchboard/discord` package
- Working Discord bot example
- Documentation for Discord setup

---

### Phase 3: Core Client API (Week 2-3)

**Goal:** Implement the high-level `createBot()` API

**Tasks:**
- [ ] Implement Bot class
- [ ] Implement createBot() factory function
- [ ] Wire up adapter registry
- [ ] Implement message operations (sendMessage, reply, etc.)
- [ ] Implement event handling (onMessage, onReaction, etc.)
- [ ] Add input validation
- [ ] Add comprehensive error handling
- [ ] Write unit tests for Bot class

**Success Criteria:**
- ✅ createBot() returns functional Bot instance
- ✅ All message operations work with Discord
- ✅ Event handlers receive normalized events
- ✅ Errors are properly typed and informative
- ✅ Unit test coverage > 80%

**Deliverables:**
- Complete Bot implementation
- Comprehensive unit tests
- Updated examples using createBot()

---

### Phase 4: Slack Adapter (Week 3-4)

**Goal:** Add Slack support and validate abstraction quality

**Tasks:**
- [ ] Create `@switchboard/slack` package
- [ ] Install @slack/bolt dependency
- [ ] Implement SlackAdapter:
  - OAuth/token authentication
  - sendMessage()
  - Event normalization (handle Slack's event format)
  - Message normalization (handle Slack's message format)
- [ ] Handle Slack-specific quirks:
  - Thread timestamps (ts)
  - Channel types (DM vs public vs private)
  - Block Kit (platform-specific options)
- [ ] Create Slack example bot
- [ ] Test platform switching (Discord ↔ Slack)

**Success Criteria:**
- ✅ Slack bot can connect and authenticate
- ✅ Can send/receive messages on Slack
- ✅ **"One Line Swap" test passes** (Discord → Slack with one line change)
- ✅ Platform-specific options work (Slack blocks)

**Expected Outcome:**
- Discover abstraction issues (this is good!)
- Refactor core types based on Slack requirements
- Prove the "One Line Swap" guarantee

**Deliverables:**
- `@switchboard/slack` package
- Slack bot example
- Multi-platform example (same bot on Discord + Slack)

---

### Phase 5: Middleware & Advanced Features (Week 5)

**Goal:** Implement middleware system and advanced features

**Tasks:**
- [ ] Implement middleware system
- [ ] Create built-in middleware:
  - logger()
  - retry()
  - rateLimit()
- [ ] Add file upload support
- [ ] Add reaction support
- [ ] Add thread support
- [ ] Write middleware tests
- [ ] Create advanced examples

**Success Criteria:**
- ✅ Middleware can intercept events
- ✅ Built-in middleware works correctly
- ✅ File uploads work on both Discord and Slack
- ✅ Reactions work on both platforms

**Deliverables:**
- Middleware system
- Built-in middleware library
- Advanced examples

---

### Phase 6: Teams & Google Chat (Week 6+)

**Goal:** Add remaining platform adapters

**Tasks:**
- [ ] Create `@switchboard/teams` package
- [ ] Create `@switchboard/google-chat` package
- [ ] Implement adapters
- [ ] Test "One Line Swap" with all 4 platforms
- [ ] Create comprehensive multi-platform example

**Success Criteria:**
- ✅ All 4 platforms supported
- ✅ Same bot code works on all platforms
- ✅ Platform-specific features documented

**Deliverables:**
- Teams and Google Chat adapters
- Comprehensive platform support
- Complete documentation

---

### Phase 7: Polish & Release (Week 7+)

**Goal:** Prepare for public release

**Tasks:**
- [ ] Write comprehensive documentation
- [ ] Create migration guides
- [ ] Set up CI/CD (GitHub Actions)
- [ ] Set up automated releases (changesets)
- [ ] Write contributing guide
- [ ] Create logo and branding
- [ ] Set up website (docs site)
- [ ] Write blog post / announcement
- [ ] Publish to npm

**Success Criteria:**
- ✅ Documentation is complete and clear
- ✅ CI/CD pipeline works
- ✅ All tests pass in CI
- ✅ Ready for v1.0.0 release

**Deliverables:**
- Complete documentation
- Published npm packages
- Public announcement

---

## Testing Strategy

### Testing Pyramid

```
    ┌─────────────┐
    │  E2E Tests  │  ← 10% (Real platform integration)
    ├─────────────┤
    │  Integration│  ← 30% (Adapter + Core)
    │    Tests    │
    ├─────────────┤
    │  Unit Tests │  ← 60% (Individual functions/classes)
    └─────────────┘
```

### Unit Tests

**Target:** Core logic, utilities, type transformations

**Tools:** Vitest

**Example:**
```typescript
// packages/core/tests/unit/result.test.ts
import { describe, it, expect } from 'vitest';
import { ok, err, wrapAsync } from '../src/types/result';

describe('Result type', () => {
  it('should create successful result', () => {
    const result = ok('success');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('success');
    }
  });

  it('should create error result', () => {
    const result = err(new Error('failed'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('failed');
    }
  });
});
```

### Integration Tests

**Target:** Adapter + Core interaction

**Tools:** Vitest + Mock platform clients

**Example:**
```typescript
// packages/discord/tests/integration/adapter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { DiscordAdapter } from '../src/adapter';
import { Client } from 'discord.js';

vi.mock('discord.js');

describe('DiscordAdapter', () => {
  it('should send message and normalize response', async () => {
    const adapter = new DiscordAdapter();
    // Mock discord.js client
    // Test sendMessage
    // Verify normalization
  });
});
```

### E2E Tests

**Target:** Real platform integration (optional, requires credentials)

**Tools:** Playwright or custom test harness

**Approach:**
- Run in CI only with test bot accounts
- Or skip in CI, run manually before releases

---

## Success Metrics

### Developer Experience Metrics

1. **Time to First Bot**
   - Target: < 5 minutes from npm install to running bot
   - Measure: Track from docs landing page to working example

2. **API Learnability**
   - Target: Junior dev can build a bot without reading docs (just examples)
   - Measure: User testing with junior developers

3. **Type Safety Score**
   - Target: 100% of public API is type-safe
   - Measure: TypeScript strict mode, no `any` types

4. **One Line Swap Success Rate**
   - Target: 100% of common use cases work with one line change
   - Measure: Test suite that swaps platforms and verifies behavior

### Technical Metrics

1. **Test Coverage**
   - Target: > 80% code coverage
   - Measure: Vitest coverage reports

2. **Bundle Size**
   - Target: < 50KB for @switchboard/core (minified + gzipped)
   - Target: < 100KB per adapter (including dependencies)
   - Measure: bundlephobia.com

3. **TypeScript Compilation Speed**
   - Target: < 5 seconds for full rebuild
   - Measure: tsc --build timing

4. **Documentation Coverage**
   - Target: 100% of public API documented
   - Measure: TSDoc coverage

### Adoption Metrics (Post-Launch)

1. **npm Downloads**
   - Target: 1,000 downloads/week in first month

2. **GitHub Stars**
   - Target: 500 stars in first 3 months

3. **Community Contributions**
   - Target: 5+ external contributors in first 6 months

---

## Design Decisions

### Decision Log

#### DD-001: Result Type vs Thrown Exceptions

**Decision:** Use Result<T> type instead of throwing exceptions for expected errors

**Rationale:**
- Makes error handling explicit
- Prevents silent failures
- Better TypeScript support
- Inspired by Rust's Result type and Vercel AI SDK's approach

**Trade-offs:**
- More verbose than try/catch
- Requires understanding of Result type pattern

**Status:** ✅ Approved

---

#### DD-002: Auto-Registration vs Explicit Registration

**Decision:** Support both auto-registration (side-effect imports) and explicit registration

**Rationale:**
- Auto-registration: Better DX, simpler for beginners
- Explicit registration: Better tree-shaking, more control for power users
- We can support both patterns simultaneously

**Example:**
```typescript
// Auto-registration (default)
import '@switchboard/discord';
const bot = createBot({ platform: 'discord' });

// Explicit registration (power users)
import { discordAdapter } from '@switchboard/discord';
const bot = createBot({ adapter: discordAdapter });
```

**Trade-offs:**
- Slightly more complex registry implementation
- Need to document both patterns

**Status:** ✅ Approved

---

#### DD-003: Monorepo Tool (pnpm vs npm vs yarn)

**Decision:** Use pnpm workspaces

**Rationale:**
- Faster than npm/yarn
- Better disk space efficiency
- Used by Vercel, Vue, Nuxt (proven at scale)
- Strict dependency resolution (prevents phantom dependencies)

**Trade-offs:**
- Contributors need to install pnpm
- Slightly different from npm (but similar enough)

**Status:** ✅ Approved

---

#### DD-004: Build Tool (tsup vs unbuild vs rollup)

**Decision:** Use tsup for package builds

**Rationale:**
- Zero config for most cases
- Fast (uses esbuild)
- Handles CJS + ESM automatically
- Great DX

**Trade-offs:**
- Less flexible than rollup for complex cases
- Newer tool (but stable and widely used)

**Status:** ✅ Approved

---

#### DD-005: Testing Framework (Vitest vs Jest)

**Decision:** Use Vitest

**Rationale:**
- Fast (uses Vite)
- Better ESM support
- Compatible with Jest API (easy migration)
- Modern tooling

**Trade-offs:**
- Smaller ecosystem than Jest
- Newer tool

**Status:** ✅ Approved

---

#### DD-006: Platform-Specific Options (How to handle)

**Decision:** Use discriminated union with platform-specific keys

**Rationale:**
- Explicit opt-in to platform features
- Type-safe
- Doesn't pollute core API

**Example:**
```typescript
bot.sendMessage('channel', 'Hello', {
  discord: { embeds: [...] },  // Only available for Discord
  slack: { blocks: [...] },     // Only available for Slack
});
```

**Trade-offs:**
- Slightly more verbose
- Need to handle undefined cases in adapters

**Status:** ✅ Approved

---

#### DD-007: Thread Support (Unified vs Platform-Specific)

**Decision:** Threads are a core concept (not platform-specific)

**Rationale:**
- All 4 platforms support threads (Discord threads, Slack threads, Teams replies, Google Chat threads)
- Common enough to be in core API
- Can be normalized to threadId field

**Implementation:**
```typescript
// Send message in thread
bot.sendMessage('channel', 'Reply', { threadId: 'thread-123' });

// Or use dedicated method
bot.createThread(messageId, 'Start a thread');
```

**Status:** ✅ Approved

---

#### DD-008: File Uploads (Buffer vs Stream vs File)

**Decision:** Support multiple input types (Buffer, Stream, File object)

**Rationale:**
- Different use cases need different approaches
- Node.js uses Buffer/Stream
- Browser uses File object
- Adapters can normalize internally

**Example:**
```typescript
// Buffer
await bot.uploadFile('channel', Buffer.from('data'), { filename: 'test.txt' });

// Stream (Node.js)
await bot.uploadFile('channel', fs.createReadStream('file.txt'));

// File (Browser)
await bot.uploadFile('channel', fileInputElement.files[0]);
```

**Trade-offs:**
- More complex adapter implementation
- Need to handle platform-specific upload mechanisms

**Status:** ✅ Approved

---

## Appendix

### Glossary

- **Adapter:** Platform-specific implementation of the PlatformAdapter interface
- **Unified Type:** Cross-platform abstraction (e.g., UnifiedMessage)
- **Normalization:** Converting platform-specific data to unified types
- **Result Type:** Type-safe error handling pattern
- **Middleware:** Interceptor pattern for events/actions
- **Tree-shaking:** Dead code elimination during bundling

### References

- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Hono](https://hono.dev/)
- [tRPC](https://trpc.io/)
- [Discord.js](https://discord.js.org/)
- [Slack Bolt SDK](https://slack.dev/bolt-js/)
- [Microsoft Bot Framework](https://dev.botframework.com/)

### Changelog

- **2026-01-12:** Initial spec created
- **[Future]:** Version updates as implementation progresses

---

**Next Steps:**
1. Review and approve this spec
2. Begin Phase 1: Foundation setup
3. Start implementing core types

**Questions/Feedback:**
- Open GitHub issues for spec clarifications
- Discuss architecture decisions in PRs
