import { describe, it, expect } from 'vitest';
import type { ChatFullInfo, Message, User as TelegramUser } from 'grammy/types';
import {
  normalizeMessage,
  normalizeChat,
  normalizeUser,
  normalizeMessageEvent,
  normalizeReactionEvent,
  normalizeMessageEditedEvent,
} from './normalizers.js';

// ── Helpers ──────────────────────────────────────────────────────────

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    message_id: 42,
    date: 1700000000, // 2023-11-14T22:13:20Z
    chat: { id: 123, type: 'private', first_name: 'Test' },
    from: { id: 456, is_bot: false, first_name: 'Alice' },
    ...overrides,
  } as Message;
}

function makeTelegramUser(
  overrides: Partial<TelegramUser> = {}
): TelegramUser {
  return {
    id: 456,
    is_bot: false,
    first_name: 'Alice',
    ...overrides,
  } as TelegramUser;
}

// ── normalizeMessage ─────────────────────────────────────────────────

describe('normalizeMessage', () => {
  it('should convert a basic text message', () => {
    const msg = makeMessage({ text: 'hello world' });
    const result = normalizeMessage(msg);

    expect(result.id).toBe('42');
    expect(result.channelId).toBe('123');
    expect(result.userId).toBe('456');
    expect(result.text).toBe('hello world');
    expect(result.platform).toBe('telegram');
    expect(result.attachments).toBeUndefined();
    expect(result._raw).toBe(msg);
  });

  it('should convert Unix seconds to JS Date', () => {
    const msg = makeMessage({ date: 1700000000 });
    const result = normalizeMessage(msg);

    expect(result.timestamp).toEqual(new Date(1700000000 * 1000));
  });

  it('should use caption as text for media messages', () => {
    const msg = makeMessage({ text: undefined, caption: 'photo caption' });
    const result = normalizeMessage(msg);

    expect(result.text).toBe('photo caption');
  });

  it('should default to empty string when no text or caption', () => {
    const msg = makeMessage({ text: undefined });
    const result = normalizeMessage(msg);

    expect(result.text).toBe('');
  });

  it('should set userId to "unknown" when from is missing', () => {
    const msg = makeMessage({ from: undefined });
    const result = normalizeMessage(msg);

    expect(result.userId).toBe('unknown');
  });

  it('should map message_thread_id to threadId', () => {
    const msg = makeMessage({ message_thread_id: 99 });
    const result = normalizeMessage(msg);

    expect(result.threadId).toBe('99');
  });

  it('should omit threadId when message_thread_id is absent', () => {
    const msg = makeMessage();
    const result = normalizeMessage(msg);

    expect(result.threadId).toBeUndefined();
  });

  describe('attachments', () => {
    it('should normalize a document attachment', () => {
      const msg = makeMessage({
        document: {
          file_id: 'doc-1',
          file_unique_id: 'unique-1',
          file_name: 'report.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
        },
      });
      const result = normalizeMessage(msg);

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments![0]).toEqual({
        id: 'doc-1',
        filename: 'report.pdf',
        url: '',
        mimeType: 'application/pdf',
        size: 1024,
      });
    });

    it('should pick the largest photo size', () => {
      const msg = makeMessage({
        photo: [
          {
            file_id: 'small',
            file_unique_id: 'u1',
            width: 100,
            height: 100,
            file_size: 500,
          },
          {
            file_id: 'large',
            file_unique_id: 'u2',
            width: 800,
            height: 800,
            file_size: 5000,
          },
        ],
      });
      const result = normalizeMessage(msg);

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments![0]!.id).toBe('large');
      expect(result.attachments![0]!.mimeType).toBe('image/jpeg');
    });

    it('should normalize a video attachment', () => {
      const msg = makeMessage({
        video: {
          file_id: 'vid-1',
          file_unique_id: 'uv1',
          width: 1920,
          height: 1080,
          duration: 60,
          mime_type: 'video/mp4',
          file_size: 50000,
        },
      });
      const result = normalizeMessage(msg);

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments![0]!.mimeType).toBe('video/mp4');
    });

    it('should normalize an audio attachment', () => {
      const msg = makeMessage({
        audio: {
          file_id: 'aud-1',
          file_unique_id: 'ua1',
          duration: 180,
          file_name: 'song.mp3',
          mime_type: 'audio/mpeg',
          file_size: 3000,
        },
      });
      const result = normalizeMessage(msg);

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments![0]!.filename).toBe('song.mp3');
    });

    it('should normalize a voice message', () => {
      const msg = makeMessage({
        voice: {
          file_id: 'voice-1',
          file_unique_id: 'uvo1',
          duration: 10,
          mime_type: 'audio/ogg',
          file_size: 800,
        },
      });
      const result = normalizeMessage(msg);

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments![0]).toEqual({
        id: 'voice-1',
        filename: 'voice.ogg',
        url: '',
        mimeType: 'audio/ogg',
        size: 800,
      });
    });

    it('should collect multiple attachment types', () => {
      const msg = makeMessage({
        text: 'mixed',
        document: {
          file_id: 'doc-1',
          file_unique_id: 'u1',
          file_name: 'file.txt',
          mime_type: 'text/plain',
          file_size: 100,
        },
        voice: {
          file_id: 'voice-1',
          file_unique_id: 'u2',
          duration: 5,
          file_size: 200,
        },
      });
      const result = normalizeMessage(msg);

      expect(result.attachments).toHaveLength(2);
    });
  });
});

// ── normalizeChat ────────────────────────────────────────────────────

describe('normalizeChat', () => {
  it('should normalize a private chat as DM', () => {
    const chat = {
      id: 100,
      type: 'private',
      first_name: 'Alice',
    } as ChatFullInfo;
    const result = normalizeChat(chat);

    expect(result.id).toBe('100');
    expect(result.name).toBe('Alice');
    expect(result.type).toBe('dm');
    expect(result.isPrivate).toBe(true);
  });

  it('should normalize a group chat as group_dm', () => {
    const chat = {
      id: -200,
      type: 'group',
      title: 'My Group',
    } as ChatFullInfo;
    const result = normalizeChat(chat);

    expect(result.name).toBe('My Group');
    expect(result.type).toBe('group_dm');
    expect(result.isPrivate).toBe(true);
  });

  it('should normalize a supergroup as text channel', () => {
    const chat = {
      id: -300,
      type: 'supergroup',
      title: 'Big Group',
    } as ChatFullInfo;
    const result = normalizeChat(chat);

    expect(result.type).toBe('text');
    expect(result.isPrivate).toBe(false);
  });

  it('should normalize a channel as text', () => {
    const chat = {
      id: -400,
      type: 'channel',
      title: 'Announcements',
    } as ChatFullInfo;
    const result = normalizeChat(chat);

    expect(result.type).toBe('text');
    expect(result.isPrivate).toBe(false);
  });

  it('should fall back to Chat ID when no name fields exist', () => {
    const chat = { id: 999, type: 'private' } as ChatFullInfo;
    const result = normalizeChat(chat);

    expect(result.name).toBe('Chat 999');
  });

  it('should include description as topic', () => {
    const chat = {
      id: -300,
      type: 'supergroup',
      title: 'Dev',
      description: 'Development chat',
    } as ChatFullInfo;
    const result = normalizeChat(chat);

    expect(result.topic).toBe('Development chat');
  });

  it('should set topic to undefined when no description', () => {
    const chat = {
      id: -300,
      type: 'supergroup',
      title: 'Dev',
    } as ChatFullInfo;
    const result = normalizeChat(chat);

    expect(result.topic).toBeUndefined();
  });
});

// ── normalizeUser ────────────────────────────────────────────────────

describe('normalizeUser', () => {
  it('should normalize a regular user', () => {
    const user = makeTelegramUser({
      username: 'alice_bot',
      first_name: 'Alice',
      last_name: 'Smith',
    });
    const result = normalizeUser(user);

    expect(result.id).toBe('456');
    expect(result.username).toBe('alice_bot');
    expect(result.displayName).toBe('Alice Smith');
    expect(result.isBot).toBe(false);
    expect(result.avatarUrl).toBeUndefined();
  });

  it('should fall back to first_name when username is missing', () => {
    const user = makeTelegramUser({ username: undefined });
    const result = normalizeUser(user);

    expect(result.username).toBe('Alice');
  });

  it('should use first_name only for displayName when last_name is missing', () => {
    const user = makeTelegramUser({
      first_name: 'Bob',
      last_name: undefined,
    });
    const result = normalizeUser(user);

    expect(result.displayName).toBe('Bob');
  });

  it('should mark bot users correctly', () => {
    const user = makeTelegramUser({ is_bot: true });
    const result = normalizeUser(user);

    expect(result.isBot).toBe(true);
  });
});

// ── normalizeMessageEvent ────────────────────────────────────────────

describe('normalizeMessageEvent', () => {
  it('should wrap a message in a MessageEvent', () => {
    const msg = makeMessage({ text: 'event test' });
    const result = normalizeMessageEvent(msg);

    expect(result.type).toBe('message');
    expect(result.message.text).toBe('event test');
    expect(result.message.platform).toBe('telegram');
  });
});

// ── normalizeReactionEvent ───────────────────────────────────────────

describe('normalizeReactionEvent', () => {
  it('should create an added reaction event', () => {
    const result = normalizeReactionEvent(100, 42, 456, '👍', 'added');

    expect(result.type).toBe('reaction');
    expect(result.channelId).toBe('100');
    expect(result.messageId).toBe('42');
    expect(result.userId).toBe('456');
    expect(result.emoji).toBe('👍');
    expect(result.action).toBe('added');
  });

  it('should create a removed reaction event', () => {
    const result = normalizeReactionEvent(100, 42, 456, '❤', 'removed');

    expect(result.action).toBe('removed');
    expect(result.emoji).toBe('❤');
  });

  it('should convert all numeric IDs to strings', () => {
    const result = normalizeReactionEvent(
      -1001234567890,
      99999,
      111,
      '🔥',
      'added'
    );

    expect(result.channelId).toBe('-1001234567890');
    expect(result.messageId).toBe('99999');
    expect(result.userId).toBe('111');
  });
});

// ── normalizeMessageEditedEvent ──────────────────────────────────────

describe('normalizeMessageEditedEvent', () => {
  it('should create a message_edited event with edit timestamp', () => {
    const msg = makeMessage({
      text: 'edited text',
      edit_date: 1700001000,
    });
    const result = normalizeMessageEditedEvent(msg);

    expect(result.type).toBe('message_edited');
    expect(result.message.text).toBe('edited text');
    expect(result.editedAt).toEqual(new Date(1700001000 * 1000));
  });

  it('should fall back to current time when edit_date is missing', () => {
    const before = Date.now();
    const msg = makeMessage({ text: 'edited' });
    const result = normalizeMessageEditedEvent(msg);
    const after = Date.now();

    expect(result.editedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.editedAt.getTime()).toBeLessThanOrEqual(after);
  });
});
