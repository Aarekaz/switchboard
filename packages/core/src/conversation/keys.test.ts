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

  it('encodes key parts', () => {
    expect(platformThreadKey('custom platform', 'channel/1', 'thread:1')).toBe(
      'platform-thread:custom%20platform:channel%2F1:thread%3A1'
    );
  });
});
