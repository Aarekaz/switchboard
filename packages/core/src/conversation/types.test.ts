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
