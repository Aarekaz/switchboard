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
