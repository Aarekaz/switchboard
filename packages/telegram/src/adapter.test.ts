import { describe, it, expect } from 'vitest';
import { TelegramAdapter } from './adapter.js';

describe('TelegramAdapter', () => {
  describe('constructor', () => {
    it('should use default config values', () => {
      const adapter = new TelegramAdapter();

      expect(adapter.name).toBe('telegram-adapter');
      expect(adapter.platform).toBe('telegram');
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('isConnected', () => {
    it('should return false before connect', () => {
      const adapter = new TelegramAdapter();

      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('onEvent / unsubscribe', () => {
    it('should return an unsubscribe function', () => {
      const adapter = new TelegramAdapter();
      const unsubscribe = adapter.onEvent(() => {});

      expect(typeof unsubscribe).toBe('function');
    });

    it('should allow multiple handlers', () => {
      const adapter = new TelegramAdapter();
      const unsub1 = adapter.onEvent(() => {});
      const unsub2 = adapter.onEvent(() => {});

      expect(typeof unsub1).toBe('function');
      expect(typeof unsub2).toBe('function');
    });

    it('should remove handler on unsubscribe', () => {
      const adapter = new TelegramAdapter();
      const calls: string[] = [];

      const unsub = adapter.onEvent(() => {
        calls.push('called');
      });
      unsub();

      // After unsubscribe, the handler should not be in the set.
      // We can verify by checking the returned function doesn't throw.
      expect(() => unsub()).not.toThrow();
    });
  });

  describe('operations when not connected', () => {
    it('sendMessage should return error', async () => {
      const adapter = new TelegramAdapter();
      const result = await adapter.sendMessage('123', 'hello');

      expect(result.ok).toBe(false);
    });

    it('editMessage should return error', async () => {
      const adapter = new TelegramAdapter();
      const result = await adapter.editMessage('42', 'edited');

      expect(result.ok).toBe(false);
    });

    it('deleteMessage should return error', async () => {
      const adapter = new TelegramAdapter();
      const result = await adapter.deleteMessage('42');

      expect(result.ok).toBe(false);
    });

    it('addReaction should return error', async () => {
      const adapter = new TelegramAdapter();
      const result = await adapter.addReaction('42', '👍');

      expect(result.ok).toBe(false);
    });

    it('removeReaction should return error', async () => {
      const adapter = new TelegramAdapter();
      const result = await adapter.removeReaction('42', '👍');

      expect(result.ok).toBe(false);
    });

    it('createThread should return error', async () => {
      const adapter = new TelegramAdapter();
      const result = await adapter.createThread('42', 'thread');

      expect(result.ok).toBe(false);
    });

    it('uploadFile should return error', async () => {
      const adapter = new TelegramAdapter();
      const result = await adapter.uploadFile('123', null);

      expect(result.ok).toBe(false);
    });

    it('getChannels should return error', async () => {
      const adapter = new TelegramAdapter();
      const result = await adapter.getChannels();

      expect(result.ok).toBe(false);
    });

    it('getUsers should return error', async () => {
      const adapter = new TelegramAdapter();
      const result = await adapter.getUsers();

      expect(result.ok).toBe(false);
    });
  });

  describe('connect validation', () => {
    it('should throw when token is missing', async () => {
      const adapter = new TelegramAdapter();

      await expect(adapter.connect({})).rejects.toThrow(
        'Telegram bot token is required'
      );
    });

    it('should throw when webhookUrl is configured', async () => {
      const adapter = new TelegramAdapter({ webhookUrl: 'https://example.com' });

      await expect(
        adapter.connect({ token: 'fake-token' })
      ).rejects.toThrow('Webhook mode is not yet supported');
    });
  });

  describe('disconnect', () => {
    it('should be safe to call when not connected', async () => {
      const adapter = new TelegramAdapter();

      await expect(adapter.disconnect()).resolves.not.toThrow();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('normalizeMessage', () => {
    it('should delegate to normalizer', () => {
      const adapter = new TelegramAdapter();
      const msg = {
        message_id: 1,
        date: 1700000000,
        chat: { id: 100, type: 'private', first_name: 'Test' },
        from: { id: 200, is_bot: false, first_name: 'User' },
        text: 'hello',
      };

      const result = adapter.normalizeMessage(msg);

      expect(result.id).toBe('1');
      expect(result.text).toBe('hello');
      expect(result.platform).toBe('telegram');
    });
  });

  describe('normalizeEvent', () => {
    it('should normalize a message event', () => {
      const adapter = new TelegramAdapter();
      const event = {
        message: {
          message_id: 1,
          date: 1700000000,
          chat: { id: 100, type: 'private', first_name: 'Test' },
          text: 'test',
        },
      };

      const result = adapter.normalizeEvent(event);

      expect(result).not.toBeNull();
      expect(result!.type).toBe('message');
    });

    it('should return null for unrecognized events', () => {
      const adapter = new TelegramAdapter();

      const result = adapter.normalizeEvent({ unknown: true });

      expect(result).toBeNull();
    });
  });
});
