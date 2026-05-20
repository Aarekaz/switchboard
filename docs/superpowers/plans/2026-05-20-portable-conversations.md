# Portable Conversations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight core conversation layer that can snapshot normalized chat history, link identities across platforms, and export messages to AI SDK-compatible prompt messages.

**Architecture:** Keep the first slice inside `packages/core` with no required external state backend. Add portable types, deterministic key helpers, an in-memory store for tests/examples, and a `Conversation` helper that appends normalized messages and returns snapshots. The Bot API gets an opt-in `conversationFor(message)` helper; platform adapters stay unchanged.

**Tech Stack:** TypeScript ESM, pnpm workspaces, Vitest, existing `Result<T>` helpers, existing `UnifiedMessage` / `PlatformType` abstractions.

---

## File Structure

- Create `packages/core/src/conversation/types.ts`
  - Owns portable identity, conversation key, stored message, snapshot, AI SDK export, store interface, and options types.
- Create `packages/core/src/conversation/keys.ts`
  - Owns deterministic key builders such as `platformUserKey`, `platformThreadKey`, and `conversationKeyFromMessage`.
- Create `packages/core/src/conversation/memory-store.ts`
  - Owns a zero-dependency in-memory `ConversationStore` for tests, examples, and local bots.
- Create `packages/core/src/conversation/conversation.ts`
  - Owns the `Conversation` class, append/history/snapshot/remember operations, and AI SDK message export.
- Create `packages/core/src/conversation/index.ts`
  - Public conversation exports.
- Create `packages/core/src/conversation/*.test.ts`
  - Focused tests for keys, in-memory store isolation, snapshots, metadata, and AI SDK export.
- Modify `packages/core/src/client/bot.ts`
  - Add `conversationFor(message, options?)` helper.
- Modify `packages/core/src/index.ts`
  - Export public conversation APIs.
- Modify `packages/core/src/types/index.ts`
  - Re-export conversation types only if needed by the root barrel through `packages/core/src/index.ts`. Prefer exporting from `conversation/index.ts` directly to avoid mixing domains.
- Modify `docs/api/README.md`
  - Add a short “Portable conversations” section after streaming docs.
- Create `docs/adr/006-portable-conversations.md`
  - Capture why this exists versus Vercel Chat SDK-style stateful agent frameworks.

---

### Task 1: Add Portable Conversation Types

**Files:**

- Create: `packages/core/src/conversation/types.ts`
- Test: `packages/core/src/conversation/types.test.ts`

- [ ] **Step 1: Write the failing type/runtime tests**

```ts
// packages/core/src/conversation/types.test.ts
import { describe, expect, it } from 'vitest';
import type {
  ConversationSnapshot,
  PortableConversationMessage,
  PortableIdentity,
} from './types.js';

describe('conversation types', () => {
  it('allows portable identities for linked platform users', () => {
    const identity: PortableIdentity = {
      id: 'user_anurag',
      links: [
        { platform: 'slack', userId: 'U123' },
        { platform: 'discord', userId: '456' },
      ],
      metadata: { plan: 'pro' },
    };

    expect(identity.links).toHaveLength(2);
    expect(identity.metadata?.plan).toBe('pro');
  });

  it('represents snapshots with ordered portable messages', () => {
    const message: PortableConversationMessage = {
      id: 'slack:C1:1700000000.000100',
      platform: 'slack',
      platformMessageId: '1700000000.000100',
      channelId: 'C1',
      userId: 'U123',
      role: 'user',
      text: 'hello',
      timestamp: new Date('2026-05-20T10:00:00.000Z'),
      rawRef: {
        id: '1700000000.000100',
        channelId: 'C1',
        userId: 'U123',
        text: 'hello',
        timestamp: new Date('2026-05-20T10:00:00.000Z'),
        platform: 'slack',
        _raw: {},
      },
    };

    const snapshot: ConversationSnapshot = {
      key: 'platform-thread:slack:C1:1700000000.000100',
      identityKey: 'platform-user:slack:U123',
      messages: [message],
      metadata: {},
      updatedAt: new Date('2026-05-20T10:00:00.000Z'),
    };

    expect(snapshot.messages[0]?.role).toBe('user');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test packages/core/src/conversation/types.test.ts`

Expected: FAIL because `packages/core/src/conversation/types.ts` does not exist.

- [ ] **Step 3: Add the type definitions**

```ts
// packages/core/src/conversation/types.ts
import type { PlatformType } from '../types/platform.js';
import type { UnifiedMessage } from '../types/message.js';
import type { Result } from '../types/result.js';

export type ConversationRole = 'user' | 'assistant' | 'system' | 'tool';

export interface PlatformIdentityLink {
  platform: PlatformType;
  userId: string;
}

export interface PortableIdentity {
  id: string;
  links: PlatformIdentityLink[];
  displayName?: string;
  metadata?: Record<string, unknown>;
}

export interface PortableConversationMessage {
  id: string;
  platform: PlatformType;
  platformMessageId: string;
  channelId: string;
  userId: string;
  role: ConversationRole;
  text: string;
  timestamp: Date;
  threadId?: string;
  rawRef: UnifiedMessage;
  metadata?: Record<string, unknown>;
}

export interface ConversationSnapshot {
  key: string;
  identityKey: string;
  messages: PortableConversationMessage[];
  metadata: Record<string, unknown>;
  updatedAt: Date;
}

export interface AISDKPromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ConversationStore {
  get(key: string): Promise<Result<ConversationSnapshot | null>>;
  set(snapshot: ConversationSnapshot): Promise<Result<ConversationSnapshot>>;
  append(
    key: string,
    message: PortableConversationMessage
  ): Promise<Result<ConversationSnapshot>>;
  mergeMetadata(
    key: string,
    metadata: Record<string, unknown>
  ): Promise<Result<ConversationSnapshot>>;
}

export interface ConversationOptions {
  key?: string;
  identityKey?: string;
  store?: ConversationStore;
  metadata?: Record<string, unknown>;
}

export interface ConversationHistoryOptions {
  limit?: number;
  since?: Date;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test packages/core/src/conversation/types.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/conversation/types.ts packages/core/src/conversation/types.test.ts
git commit -m "feat(core): add portable conversation types"
```

---

### Task 2: Add Deterministic Conversation Keys

**Files:**

- Create: `packages/core/src/conversation/keys.ts`
- Test: `packages/core/src/conversation/keys.test.ts`

- [ ] **Step 1: Write the failing key tests**

```ts
// packages/core/src/conversation/keys.test.ts
import { describe, expect, it } from 'vitest';
import {
  conversationKeyFromMessage,
  platformThreadKey,
  platformUserKey,
  portableMessageId,
} from './keys.js';
import type { UnifiedMessage } from '../types/message.js';

function message(overrides: Partial<UnifiedMessage> = {}): UnifiedMessage {
  return {
    id: 'm1',
    channelId: 'c1',
    userId: 'u1',
    text: 'hello',
    timestamp: new Date('2026-05-20T10:00:00.000Z'),
    platform: 'slack',
    _raw: {},
    ...overrides,
  };
}

describe('conversation keys', () => {
  it('builds stable platform user keys', () => {
    expect(platformUserKey('slack', 'U123')).toBe('platform-user:slack:U123');
  });

  it('builds stable platform thread keys', () => {
    expect(platformThreadKey('discord', 'C1', 'T1')).toBe(
      'platform-thread:discord:C1:T1'
    );
  });

  it('uses threadId when available', () => {
    expect(conversationKeyFromMessage(message({ threadId: 'thread-1' }))).toBe(
      'platform-thread:slack:c1:thread-1'
    );
  });

  it('falls back to message id when no threadId exists', () => {
    expect(conversationKeyFromMessage(message())).toBe(
      'platform-thread:slack:c1:m1'
    );
  });

  it('builds portable message ids from platform, channel, and message id', () => {
    expect(portableMessageId(message())).toBe('slack:c1:m1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test packages/core/src/conversation/keys.test.ts`

Expected: FAIL because `keys.ts` does not exist.

- [ ] **Step 3: Add key helpers**

```ts
// packages/core/src/conversation/keys.ts
import type { PlatformType } from '../types/platform.js';
import type { UnifiedMessage } from '../types/message.js';

function encodePart(value: string): string {
  return encodeURIComponent(value);
}

export function platformUserKey(
  platform: PlatformType,
  userId: string
): string {
  return `platform-user:${encodePart(platform)}:${encodePart(userId)}`;
}

export function platformThreadKey(
  platform: PlatformType,
  channelId: string,
  threadId: string
): string {
  return `platform-thread:${encodePart(platform)}:${encodePart(channelId)}:${encodePart(threadId)}`;
}

export function conversationKeyFromMessage(message: UnifiedMessage): string {
  return platformThreadKey(
    message.platform,
    message.channelId,
    message.threadId ?? message.id
  );
}

export function portableMessageId(message: UnifiedMessage): string {
  return `${encodePart(message.platform)}:${encodePart(message.channelId)}:${encodePart(message.id)}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test packages/core/src/conversation/keys.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/conversation/keys.ts packages/core/src/conversation/keys.test.ts
git commit -m "feat(core): add portable conversation keys"
```

---

### Task 3: Add In-Memory Conversation Store

**Files:**

- Create: `packages/core/src/conversation/memory-store.ts`
- Test: `packages/core/src/conversation/memory-store.test.ts`

- [ ] **Step 1: Write the failing store tests**

```ts
// packages/core/src/conversation/memory-store.test.ts
import { describe, expect, it } from 'vitest';
import { InMemoryConversationStore } from './memory-store.js';
import type {
  ConversationSnapshot,
  PortableConversationMessage,
} from './types.js';

const updatedAt = new Date('2026-05-20T10:00:00.000Z');

function snapshot(): ConversationSnapshot {
  return {
    key: 'platform-thread:slack:C1:T1',
    identityKey: 'platform-user:slack:U1',
    messages: [],
    metadata: { topic: 'support' },
    updatedAt,
  };
}

function message(id: string): PortableConversationMessage {
  return {
    id,
    platform: 'slack',
    platformMessageId: id,
    channelId: 'C1',
    userId: 'U1',
    role: 'user',
    text: `message ${id}`,
    timestamp: updatedAt,
    rawRef: {
      id,
      channelId: 'C1',
      userId: 'U1',
      text: `message ${id}`,
      timestamp: updatedAt,
      platform: 'slack',
      _raw: {},
    },
  };
}

describe('InMemoryConversationStore', () => {
  it('returns null for missing snapshots', async () => {
    const store = new InMemoryConversationStore();
    const result = await store.get('missing');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
  });

  it('stores and clones snapshots', async () => {
    const store = new InMemoryConversationStore();
    const first = snapshot();
    await store.set(first);

    first.metadata.topic = 'mutated';
    const result = await store.get('platform-thread:slack:C1:T1');

    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.metadata.topic).toBe('support');
    }
  });

  it('appends messages in order', async () => {
    const store = new InMemoryConversationStore();
    await store.set(snapshot());
    const result = await store.append(
      'platform-thread:slack:C1:T1',
      message('m1')
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.messages.map((item) => item.id)).toEqual(['m1']);
    }
  });

  it('merges metadata without dropping existing keys', async () => {
    const store = new InMemoryConversationStore();
    await store.set(snapshot());
    const result = await store.mergeMetadata('platform-thread:slack:C1:T1', {
      priority: 'high',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.metadata).toEqual({
        topic: 'support',
        priority: 'high',
      });
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test packages/core/src/conversation/memory-store.test.ts`

Expected: FAIL because `memory-store.ts` does not exist.

- [ ] **Step 3: Add the in-memory store**

```ts
// packages/core/src/conversation/memory-store.ts
import { ok } from '../types/result.js';
import type { Result } from '../types/result.js';
import type {
  ConversationSnapshot,
  ConversationStore,
  PortableConversationMessage,
} from './types.js';

function cloneSnapshot(snapshot: ConversationSnapshot): ConversationSnapshot {
  return {
    ...snapshot,
    messages: snapshot.messages.map((message) => ({ ...message })),
    metadata: { ...snapshot.metadata },
    updatedAt: new Date(snapshot.updatedAt),
  };
}

export class InMemoryConversationStore implements ConversationStore {
  private readonly snapshots = new Map<string, ConversationSnapshot>();

  async get(key: string): Promise<Result<ConversationSnapshot | null>> {
    const snapshot = this.snapshots.get(key);
    return ok(snapshot ? cloneSnapshot(snapshot) : null);
  }

  async set(
    snapshot: ConversationSnapshot
  ): Promise<Result<ConversationSnapshot>> {
    const cloned = cloneSnapshot(snapshot);
    this.snapshots.set(snapshot.key, cloned);
    return ok(cloneSnapshot(cloned));
  }

  async append(
    key: string,
    message: PortableConversationMessage
  ): Promise<Result<ConversationSnapshot>> {
    const existing = this.snapshots.get(key);
    const next: ConversationSnapshot = existing
      ? {
          ...existing,
          messages: [...existing.messages, { ...message }],
          updatedAt: message.timestamp,
        }
      : {
          key,
          identityKey: `platform-user:${message.platform}:${message.userId}`,
          messages: [{ ...message }],
          metadata: {},
          updatedAt: message.timestamp,
        };

    this.snapshots.set(key, cloneSnapshot(next));
    return ok(cloneSnapshot(next));
  }

  async mergeMetadata(
    key: string,
    metadata: Record<string, unknown>
  ): Promise<Result<ConversationSnapshot>> {
    const existing =
      this.snapshots.get(key) ??
      ({
        key,
        identityKey: '',
        messages: [],
        metadata: {},
        updatedAt: new Date(),
      } satisfies ConversationSnapshot);

    const next = {
      ...existing,
      metadata: { ...existing.metadata, ...metadata },
      updatedAt: new Date(),
    };

    this.snapshots.set(key, cloneSnapshot(next));
    return ok(cloneSnapshot(next));
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test packages/core/src/conversation/memory-store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/conversation/memory-store.ts packages/core/src/conversation/memory-store.test.ts
git commit -m "feat(core): add in-memory conversation store"
```

---

### Task 4: Add Conversation Class and AI SDK Export

**Files:**

- Create: `packages/core/src/conversation/conversation.ts`
- Test: `packages/core/src/conversation/conversation.test.ts`

- [ ] **Step 1: Write failing Conversation tests**

```ts
// packages/core/src/conversation/conversation.test.ts
import { describe, expect, it } from 'vitest';
import { Conversation } from './conversation.js';
import { InMemoryConversationStore } from './memory-store.js';
import type { UnifiedMessage } from '../types/message.js';

function unified(id: string, text: string, userId = 'U1'): UnifiedMessage {
  return {
    id,
    channelId: 'C1',
    userId,
    text,
    timestamp: new Date(`2026-05-20T10:00:0${id}.000Z`),
    platform: userId === 'bot' ? 'slack' : 'slack',
    threadId: 'T1',
    _raw: {},
  };
}

describe('Conversation', () => {
  it('appends user and assistant messages then returns ordered history', async () => {
    const conversation = new Conversation({
      key: 'platform-thread:slack:C1:T1',
      identityKey: 'platform-user:slack:U1',
      store: new InMemoryConversationStore(),
    });

    await conversation.append(unified('1', 'hello'), 'user');
    await conversation.append(unified('2', 'hi there', 'bot'), 'assistant');

    const history = await conversation.history();
    expect(history.ok).toBe(true);
    if (history.ok) {
      expect(history.value.map((message) => message.text)).toEqual([
        'hello',
        'hi there',
      ]);
    }
  });

  it('exports user assistant and system messages to AI SDK prompt messages', async () => {
    const conversation = new Conversation({
      key: 'platform-thread:slack:C1:T1',
      identityKey: 'platform-user:slack:U1',
      store: new InMemoryConversationStore(),
    });

    await conversation.append(unified('1', 'rules'), 'system');
    await conversation.append(unified('2', 'hello'), 'user');
    await conversation.append(unified('3', 'hi'), 'assistant');
    await conversation.append(unified('4', 'tool result'), 'tool');

    const result = await conversation.toAISDKMessages();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([
        { role: 'system', content: 'rules' },
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' },
      ]);
    }
  });

  it('limits history from the end', async () => {
    const conversation = new Conversation({
      key: 'platform-thread:slack:C1:T1',
      identityKey: 'platform-user:slack:U1',
      store: new InMemoryConversationStore(),
    });

    await conversation.append(unified('1', 'one'), 'user');
    await conversation.append(unified('2', 'two'), 'user');
    await conversation.append(unified('3', 'three'), 'user');

    const result = await conversation.history({ limit: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((message) => message.text)).toEqual([
        'two',
        'three',
      ]);
    }
  });

  it('remembers metadata on the snapshot', async () => {
    const conversation = new Conversation({
      key: 'platform-thread:slack:C1:T1',
      identityKey: 'platform-user:slack:U1',
      store: new InMemoryConversationStore(),
    });

    const result = await conversation.remember({ project: 'switchboard' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.metadata.project).toBe('switchboard');
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test packages/core/src/conversation/conversation.test.ts`

Expected: FAIL because `conversation.ts` does not exist.

- [ ] **Step 3: Add the Conversation implementation**

```ts
// packages/core/src/conversation/conversation.ts
import { ok } from '../types/result.js';
import type { Result } from '../types/result.js';
import type { UnifiedMessage } from '../types/message.js';
import {
  conversationKeyFromMessage,
  platformUserKey,
  portableMessageId,
} from './keys.js';
import { InMemoryConversationStore } from './memory-store.js';
import type {
  AISDKPromptMessage,
  ConversationHistoryOptions,
  ConversationOptions,
  ConversationRole,
  ConversationSnapshot,
  ConversationStore,
  PortableConversationMessage,
} from './types.js';

const defaultStore = new InMemoryConversationStore();

function filterHistory(
  messages: PortableConversationMessage[],
  options: ConversationHistoryOptions = {}
): PortableConversationMessage[] {
  const sinceFiltered = options.since
    ? messages.filter((message) => message.timestamp >= options.since!)
    : messages;

  return typeof options.limit === 'number'
    ? sinceFiltered.slice(Math.max(0, sinceFiltered.length - options.limit))
    : sinceFiltered;
}

function toPortableMessage(
  message: UnifiedMessage,
  role: ConversationRole,
  metadata?: Record<string, unknown>
): PortableConversationMessage {
  return {
    id: portableMessageId(message),
    platform: message.platform,
    platformMessageId: message.id,
    channelId: message.channelId,
    userId: message.userId,
    role,
    text: message.text,
    timestamp: message.timestamp,
    threadId: message.threadId,
    rawRef: message,
    metadata,
  };
}

export class Conversation {
  readonly key: string;
  readonly identityKey: string;
  private readonly store: ConversationStore;
  private readonly initialMetadata: Record<string, unknown>;

  constructor(
    options: ConversationOptions & { key: string; identityKey: string }
  ) {
    this.key = options.key;
    this.identityKey = options.identityKey;
    this.store = options.store ?? defaultStore;
    this.initialMetadata = options.metadata ?? {};
  }

  static fromMessage(
    message: UnifiedMessage,
    options: ConversationOptions = {}
  ): Conversation {
    return new Conversation({
      key: options.key ?? conversationKeyFromMessage(message),
      identityKey:
        options.identityKey ??
        platformUserKey(message.platform, message.userId),
      store: options.store,
      metadata: options.metadata,
    });
  }

  async snapshot(): Promise<Result<ConversationSnapshot>> {
    const existing = await this.store.get(this.key);
    if (!existing.ok) return existing;
    if (existing.value) return ok(existing.value);

    return this.store.set({
      key: this.key,
      identityKey: this.identityKey,
      messages: [],
      metadata: { ...this.initialMetadata },
      updatedAt: new Date(),
    });
  }

  async append(
    message: UnifiedMessage,
    role: ConversationRole = 'user',
    metadata?: Record<string, unknown>
  ): Promise<Result<ConversationSnapshot>> {
    const existing = await this.snapshot();
    if (!existing.ok) return existing;

    const portable = toPortableMessage(message, role, metadata);
    return this.store.append(this.key, portable);
  }

  async remember(
    metadata: Record<string, unknown>
  ): Promise<Result<ConversationSnapshot>> {
    const existing = await this.snapshot();
    if (!existing.ok) return existing;
    return this.store.mergeMetadata(this.key, metadata);
  }

  async history(
    options: ConversationHistoryOptions = {}
  ): Promise<Result<PortableConversationMessage[]>> {
    const snapshot = await this.snapshot();
    if (!snapshot.ok) return snapshot;
    return ok(filterHistory(snapshot.value.messages, options));
  }

  async toAISDKMessages(
    options: ConversationHistoryOptions = {}
  ): Promise<Result<AISDKPromptMessage[]>> {
    const history = await this.history(options);
    if (!history.ok) return history;

    return ok(
      history.value
        .filter((message) => message.role !== 'tool')
        .map((message) => ({
          role: message.role as AISDKPromptMessage['role'],
          content: message.text,
        }))
    );
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test packages/core/src/conversation/conversation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/conversation/conversation.ts packages/core/src/conversation/conversation.test.ts
git commit -m "feat(core): add portable conversation snapshots"
```

---

### Task 5: Export Conversation APIs and Add Bot Helper

**Files:**

- Create: `packages/core/src/conversation/index.ts`
- Modify: `packages/core/src/client/bot.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/client/bot.conversation.test.ts`

- [ ] **Step 1: Write failing Bot helper test**

```ts
// packages/core/src/client/bot.conversation.test.ts
import { describe, expect, it, vi } from 'vitest';
import { Bot } from './bot.js';
import { InMemoryConversationStore } from '../conversation/memory-store.js';
import { ok, err } from '../types/result.js';
import type { PlatformAdapter } from '../adapter/interface.js';
import type { UnifiedEvent } from '../types/event.js';
import type { UnifiedMessage } from '../types/message.js';

function makeAdapter(): PlatformAdapter {
  return {
    name: 'mock-adapter',
    platform: 'slack',
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    isConnected: vi.fn(() => true),
    sendMessage: vi.fn(async () =>
      ok({
        id: 'bot-1',
        channelId: 'C1',
        userId: 'bot',
        text: 'ok',
        timestamp: new Date('2026-05-20T10:00:01.000Z'),
        platform: 'slack',
        threadId: 'T1',
        _raw: {},
      })
    ),
    editMessage: vi.fn(async () => err(new Error('not implemented'))),
    deleteMessage: vi.fn(async () => ok(undefined)),
    addReaction: vi.fn(async () => ok(undefined)),
    removeReaction: vi.fn(async () => ok(undefined)),
    createThread: vi.fn(async () => err(new Error('not implemented'))),
    uploadFile: vi.fn(async () => err(new Error('not implemented'))),
    onEvent: vi.fn((_handler: (event: UnifiedEvent) => void) => () => {}),
    getChannels: vi.fn(async () => ok([])),
    getUsers: vi.fn(async () => ok([])),
    normalizeMessage: vi.fn(),
    normalizeEvent: vi.fn(() => null),
  };
}

function message(): UnifiedMessage {
  return {
    id: 'M1',
    channelId: 'C1',
    userId: 'U1',
    text: 'hello',
    timestamp: new Date('2026-05-20T10:00:00.000Z'),
    platform: 'slack',
    threadId: 'T1',
    _raw: {},
  };
}

describe('Bot conversation helper', () => {
  it('creates a conversation for a message using deterministic defaults', async () => {
    const bot = new Bot(makeAdapter(), 'slack', {});
    const conversation = bot.conversationFor(message(), {
      store: new InMemoryConversationStore(),
    });

    expect(conversation.key).toBe('platform-thread:slack:C1:T1');
    expect(conversation.identityKey).toBe('platform-user:slack:U1');

    const result = await conversation.append(message());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.messages[0]?.text).toBe('hello');
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test packages/core/src/client/bot.conversation.test.ts`

Expected: FAIL because `Bot.conversationFor` and conversation exports do not exist.

- [ ] **Step 3: Add conversation barrel**

```ts
// packages/core/src/conversation/index.ts
export { Conversation } from './conversation.js';
export { InMemoryConversationStore } from './memory-store.js';
export {
  conversationKeyFromMessage,
  platformThreadKey,
  platformUserKey,
  portableMessageId,
} from './keys.js';
export type {
  AISDKPromptMessage,
  ConversationHistoryOptions,
  ConversationOptions,
  ConversationRole,
  ConversationSnapshot,
  ConversationStore,
  PlatformIdentityLink,
  PortableConversationMessage,
  PortableIdentity,
} from './types.js';
```

- [ ] **Step 4: Modify Bot imports and add helper**

Add this import near the top of `packages/core/src/client/bot.ts`:

```ts
import { Conversation } from '../conversation/index.js';
import type { ConversationOptions } from '../conversation/index.js';
```

Add this public method after the `platform` getter:

```ts
  /**
   * Create a portable conversation helper for a normalized message.
   *
   * This does not require platform adapters to support new behavior. It derives
   * a stable conversation key from platform/channel/thread identifiers and uses
   * the provided store, or the core in-memory store when omitted.
   */
  conversationFor(
    message: UnifiedMessage,
    options: ConversationOptions = {}
  ): Conversation {
    return Conversation.fromMessage(message, options);
  }
```

- [ ] **Step 5: Export from root core index**

Add this section to `packages/core/src/index.ts` after the streaming helper exports:

```ts
// Portable conversations
export {
  Conversation,
  InMemoryConversationStore,
  conversationKeyFromMessage,
  platformThreadKey,
  platformUserKey,
  portableMessageId,
} from './conversation/index.js';
export type {
  AISDKPromptMessage,
  ConversationHistoryOptions,
  ConversationOptions,
  ConversationRole,
  ConversationSnapshot,
  ConversationStore,
  PlatformIdentityLink,
  PortableConversationMessage,
  PortableIdentity,
} from './conversation/index.js';
```

- [ ] **Step 6: Run the helper test**

Run: `pnpm test packages/core/src/client/bot.conversation.test.ts`

Expected: PASS.

- [ ] **Step 7: Run all conversation and streaming tests**

Run: `pnpm test packages/core/src/conversation packages/core/src/client/bot.conversation.test.ts packages/core/src/client/bot.stream.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/conversation/index.ts packages/core/src/client/bot.ts packages/core/src/index.ts packages/core/src/client/bot.conversation.test.ts
git commit -m "feat(core): expose portable conversations"
```

---

### Task 6: Document the Feature and Positioning

**Files:**

- Modify: `docs/api/README.md`
- Create: `docs/adr/006-portable-conversations.md`
- Modify: `docs/adr/README.md`
- Optional Modify: `README.md`

- [ ] **Step 1: Add API docs section**

Insert this section in `docs/api/README.md` after the streaming message documentation:

````md
## Portable Conversations

Portable conversations let bot code keep normalized history without depending on
Slack, Discord, Telegram, or a specific AI provider's message format.

```ts
bot.onMessage(async (ctx) => {
  const conversation = bot.conversationFor(ctx.message);

  await conversation.append(ctx.message, 'user');
  const messages = await conversation.toAISDKMessages({ limit: 20 });

  if (!messages.ok) {
    await ctx.reply('I could not load this conversation.');
    return;
  }

  // Pass messages.value to AI SDK streamText({ messages: messages.value, ... })
});
```
````

By default this uses an in-memory store, which is useful for local bots and tests.
Production bots should pass a `ConversationStore` implementation backed by their
own database, cache, or durable object.

````

- [ ] **Step 2: Add ADR**

```md
# ADR-006: Portable Conversations

## Status

Accepted

## Context

Switchboard already normalizes platform messages and can stream AI responses into
Discord, Slack, and Telegram. The next useful layer is normalized conversation
continuity: the ability to snapshot history, export it to AI SDK-compatible
messages, and later link platform identities without requiring every app to
adopt a heavyweight state framework.

Vercel Chat SDK provides a broad agent framework with adapters, state, rich UI
primitives, and subscription semantics. Switchboard's niche is smaller: adapter
scoped packages, no required backend, explicit `Result<T>` errors, and bot logic
that can start simple.

## Decision

Add portable conversation primitives to core:

- deterministic user, thread, and message keys
- normalized stored message snapshots
- a `ConversationStore` interface
- an in-memory store for local use and tests
- `Conversation.toAISDKMessages()` for AI SDK prompt export
- `Bot.conversationFor(message)` as an opt-in helper

Do not require Redis, Postgres, or any hosted state service in core.

## Consequences

Application authors can build memory, analytics, replay tests, and AI prompt
history on top of Switchboard without rewriting platform-specific event shapes.
Production persistence remains the application's choice. Future packages can add
database-specific stores without changing the core API.
````

- [ ] **Step 3: Add ADR index link**

Add this line to `docs/adr/README.md` with the other ADR links:

```md
- [ADR-006: Portable Conversations](./006-portable-conversations.md)
```

- [ ] **Step 4: Optionally add README mention**

Add one bullet near the README feature list:

```md
- **Portable conversations.** Snapshot normalized chat history and export it to AI SDK-compatible messages without tying your bot to one platform or state backend.
```

- [ ] **Step 5: Run docs-adjacent validation**

Run: `pnpm test packages/core/src/conversation packages/core/src/client/bot.conversation.test.ts`

Expected: PASS.

Run: `pnpm -r typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/api/README.md docs/adr/006-portable-conversations.md docs/adr/README.md README.md
git commit -m "docs: document portable conversations"
```

---

### Task 7: Full Verification

**Files:**

- No new files. This task verifies the completed slice.

- [ ] **Step 1: Run all tests**

Run: `pnpm test`

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `pnpm -r typecheck`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `pnpm -r build`

Expected: PASS.

- [ ] **Step 4: Run lint**

Run: `pnpm lint`

Expected: PASS.

- [ ] **Step 5: Check diff**

Run: `git diff --check`

Expected: no output.

- [ ] **Step 6: Final commit if verification fixes were needed**

If verification required fixes, commit them:

```bash
git add packages/core docs README.md
git commit -m "fix(core): polish portable conversation integration"
```

If no fixes were needed, do not create an empty commit.

---

## Follow-Up Features Not In This Slice

- `@aarekaz/switchboard-web` adapter compatible with AI SDK `useChat`.
- Persistent store packages such as `@aarekaz/switchboard-store-sqlite`, `@aarekaz/switchboard-store-redis`, or a Cloudflare Durable Object example.
- Identity-linking helpers that explicitly merge Slack, Discord, Telegram, and Web users into one `PortableIdentity`.
- Replay fixtures that record normalized events and replay them into handlers.
- Capability-aware rendering for buttons, cards, reactions, edits, and threads.

These are intentionally separate because the first slice should ship as useful core infrastructure without changing platform adapters.

---

## Self-Review

**Spec coverage:** The plan covers the requested new concept by adding portable conversation state, AI SDK export, identity keys, and a clear positioning ADR versus Chat SDK. Web adapter work is listed as a follow-up because it is a separate package-level feature.

**Placeholder scan:** No `TBD`, empty implementation step, or generic “add tests” step remains. Each code-bearing task includes concrete test and implementation snippets.

**Type consistency:** The plan consistently uses `Conversation`, `ConversationStore`, `ConversationSnapshot`, `PortableConversationMessage`, `ConversationOptions`, and `AISDKPromptMessage` across tests, implementation, exports, and docs.
