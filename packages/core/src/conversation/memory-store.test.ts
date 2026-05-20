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
    if (result.ok) {
      expect(result.value).toBeNull();
    }
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

  it('returns cloned snapshots so callers cannot mutate store state', async () => {
    const store = new InMemoryConversationStore();
    await store.set({
      ...snapshot(),
      messages: [message('m1')],
    });

    const first = await store.get('platform-thread:slack:C1:T1');
    expect(first.ok).toBe(true);
    if (first.ok && first.value) {
      first.value.messages[0]!.text = 'mutated';
      first.value.updatedAt.setUTCFullYear(2030);
    }

    const second = await store.get('platform-thread:slack:C1:T1');
    expect(second.ok).toBe(true);
    if (second.ok && second.value) {
      expect(second.value.messages[0]?.text).toBe('message m1');
      expect(second.value.updatedAt.toISOString()).toBe(
        '2026-05-20T10:00:00.000Z'
      );
    }
  });

  it('deep clones nested metadata and raw refs', async () => {
    const store = new InMemoryConversationStore();
    const platformFunction = () => 'ok';
    const first = {
      ...snapshot(),
      metadata: { nested: { status: 'open' } },
      messages: [
        {
          ...message('m1'),
          metadata: { nested: { score: 1 } },
          rawRef: {
            ...message('m1').rawRef,
            _raw: {
              nested: { platformValue: 'original' },
              platformFunction,
            },
          },
        },
      ],
    };

    await store.set(first);

    (first.metadata.nested as { status: string }).status = 'closed';
    (first.messages[0]!.metadata!.nested as { score: number }).score = 99;
    (
      first.messages[0]!.rawRef._raw as {
        nested: { platformValue: string };
      }
    ).nested.platformValue = 'mutated';

    const result = await store.get('platform-thread:slack:C1:T1');

    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.metadata.nested).toEqual({ status: 'open' });
      expect(result.value.messages[0]?.metadata?.nested).toEqual({ score: 1 });
      expect(result.value.messages[0]?.rawRef._raw).toEqual({
        nested: { platformValue: 'original' },
        platformFunction,
      });
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
