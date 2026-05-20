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
    platform: 'slack',
    threadId: 'T1',
    _raw: {},
  };
}

describe('Conversation', () => {
  it('creates a conversation from a unified message', () => {
    const conversation = Conversation.fromMessage(unified('1', 'hello'));

    expect(conversation.key).toBe('platform-thread:slack:C1:T1');
    expect(conversation.identityKey).toBe('platform-user:slack:U1');
  });

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

  it('filters history by timestamp', async () => {
    const conversation = new Conversation({
      key: 'platform-thread:slack:C1:T1',
      identityKey: 'platform-user:slack:U1',
      store: new InMemoryConversationStore(),
    });

    await conversation.append(unified('1', 'one'), 'user');
    await conversation.append(unified('2', 'two'), 'user');
    await conversation.append(unified('3', 'three'), 'user');

    const result = await conversation.history({
      since: new Date('2026-05-20T10:00:02.000Z'),
    });

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

  it('starts snapshots with constructor metadata', async () => {
    const conversation = new Conversation({
      key: 'platform-thread:slack:C1:T1',
      identityKey: 'platform-user:slack:U1',
      store: new InMemoryConversationStore(),
      metadata: { project: 'switchboard' },
    });

    const result = await conversation.snapshot();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.metadata.project).toBe('switchboard');
      expect(result.value.messages).toEqual([]);
    }
  });
});
