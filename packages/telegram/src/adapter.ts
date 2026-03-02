/**
 * Telegram Platform Adapter
 * Implements the Switchboard PlatformAdapter interface for Telegram
 * Uses grammy library for Telegram Bot API
 */

import { Bot as GrammyBot } from 'grammy';
import type { Message, ReactionTypeEmoji } from 'grammy/types';
import { LRUCache } from 'lru-cache';
import type {
  PlatformAdapter,
  Result,
  UnifiedMessage,
  MessageRef,
  UnifiedEvent,
  Channel,
  User,
  SendMessageOptions,
  UploadOptions,
} from '@aarekaz/switchboard-core';
import {
  ok,
  err,
  ConnectionError,
  MessageSendError,
  MessageEditError,
  MessageDeleteError,
  ReactionError,
} from '@aarekaz/switchboard-core';
import {
  normalizeMessage,
  normalizeChat,
  normalizeUser,
  normalizeMessageEvent,
  normalizeMessageEditedEvent,
  normalizeReactionEvent,
} from './normalizers.js';
import type {
  TelegramCredentials,
  TelegramConfig,
  MessageContext,
  TelegramMessageOptions,
} from './types.js';

/**
 * Telegram adapter implementation
 */
export class TelegramAdapter implements PlatformAdapter {
  readonly name = 'telegram-adapter';
  readonly platform = 'telegram' as const;

  private bot: GrammyBot | null = null;
  private eventHandlers: Set<(event: UnifiedEvent) => void | Promise<void>> =
    new Set();
  private config: TelegramConfig;
  private messageCache: LRUCache<string, MessageContext>;
  private knownChats: Map<string, Channel> = new Map();
  private connected = false;

  constructor(config: TelegramConfig = {}) {
    this.config = {
      ...config,
      cacheSize: config.cacheSize ?? 1000,
      cacheTTL: config.cacheTTL ?? 1000 * 60 * 60, // 1 hour default
    };

    this.messageCache = new LRUCache<string, MessageContext>({
      max: this.config.cacheSize!,
      ttl: this.config.cacheTTL!,
    });
  }

  /**
   * Connect to Telegram using long polling
   */
  async connect(credentials: unknown): Promise<void> {
    const telegramCreds = credentials as TelegramCredentials;

    if (!telegramCreds.token) {
      throw new ConnectionError(
        'telegram',
        new Error(
          'Telegram bot token is required. Get one from @BotFather on Telegram.'
        )
      );
    }

    if (this.config.webhookUrl) {
      throw new ConnectionError(
        'telegram',
        new Error(
          'Webhook mode is not yet supported. Remove webhookUrl from config to use long polling.'
        )
      );
    }

    try {
      this.bot = new GrammyBot(telegramCreds.token);

      // Set up error handler before anything else
      this.bot.catch((error) => {
        console.error('[Switchboard] Telegram bot error:', error);
      });

      // Set up event listeners
      this.setupEventListeners();

      // Validate token by fetching bot info
      await this.bot.init();

      // Start long polling (non-blocking — this promise never resolves)
      this.bot.start({
        allowed_updates: this.config.allowedUpdates || [
          'message',
          'edited_message',
          'message_reaction',
          'my_chat_member',
        ],
      }).catch((error) => {
        console.error('[Switchboard] Telegram polling error:', error);
        this.connected = false;
      });

      this.connected = true;

      if (process.env.NODE_ENV !== 'production') {
        const botInfo = this.bot.botInfo;
        console.log(
          `[Switchboard] Telegram bot connected as @${botInfo.username} (long polling)`
        );
      }
    } catch (error) {
      this.bot = null;
      this.connected = false;
      throw new ConnectionError('telegram', error);
    }
  }

  /**
   * Disconnect from Telegram
   */
  async disconnect(): Promise<void> {
    if (this.bot) {
      this.bot.stop();
      this.bot = null;
    }
    this.connected = false;
    this.messageCache.clear();
    this.knownChats.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.bot !== null;
  }

  /**
   * Send a message to a chat
   */
  async sendMessage(
    channelId: string,
    text: string,
    options?: SendMessageOptions
  ): Promise<Result<UnifiedMessage>> {
    if (!this.bot) {
      return err(new ConnectionError('telegram', new Error('Not connected')));
    }

    try {
      const telegramOptions = (options as { telegram?: TelegramMessageOptions })
        ?.telegram;

      const sendOptions: Record<string, unknown> = {};
      if (options?.threadId) sendOptions.message_thread_id = Number(options.threadId);
      if (telegramOptions?.parse_mode) sendOptions.parse_mode = telegramOptions.parse_mode;
      if (telegramOptions?.disable_web_page_preview) sendOptions.link_preview_options = { is_disabled: true };
      if (telegramOptions?.disable_notification) sendOptions.disable_notification = true;
      if (telegramOptions?.protect_content) sendOptions.protect_content = true;
      if (telegramOptions?.reply_markup) sendOptions.reply_markup = telegramOptions.reply_markup;

      // Cast needed: grammy's Other<> generic type is impractical to construct manually
      const message = await this.bot.api.sendMessage(
        Number(channelId),
        text,
        sendOptions as Parameters<GrammyBot['api']['sendMessage']>[2]
      );

      const unifiedMessage = normalizeMessage(message);
      this.cacheMessage(unifiedMessage);
      this.trackChat(channelId);

      return ok(unifiedMessage);
    } catch (error) {
      return err(
        new MessageSendError(
          'telegram',
          channelId,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageRef: MessageRef,
    newText: string
  ): Promise<Result<UnifiedMessage>> {
    if (!this.bot) {
      return err(new ConnectionError('telegram', new Error('Not connected')));
    }

    const messageId =
      typeof messageRef === 'string' ? messageRef : messageRef.id;
    const channelId = this.resolveChannelId(messageRef);

    if (!channelId) {
      return err(
        new MessageEditError(
          'telegram',
          messageId,
          new Error(
            'Cannot edit message: chat context not found.\n\n' +
              'This happens when:\n' +
              '1. The message is older than 1 hour (cache expired)\n' +
              '2. The bot restarted since the message was sent\n\n' +
              'Solution: Pass the full message object instead:\n' +
              '  bot.editMessage(message, "text")  // Works reliably\n' +
              '  bot.editMessage(message.id, "text")  // May fail on Telegram'
          )
        )
      );
    }

    try {
      const result = await this.bot.api.editMessageText(
        Number(channelId),
        Number(messageId),
        newText
      );

      // editMessageText returns Message | true (true for inline messages)
      if (typeof result === 'boolean') {
        return ok({
          id: messageId,
          channelId,
          userId: 'unknown',
          text: newText,
          timestamp: new Date(),
          platform: 'telegram',
          _raw: result,
        });
      }

      return ok(normalizeMessage(result));
    } catch (error) {
      return err(
        new MessageEditError(
          'telegram',
          messageId,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageRef: MessageRef): Promise<Result<void>> {
    if (!this.bot) {
      return err(new ConnectionError('telegram', new Error('Not connected')));
    }

    const messageId =
      typeof messageRef === 'string' ? messageRef : messageRef.id;
    const channelId = this.resolveChannelId(messageRef);

    if (!channelId) {
      return err(
        new MessageDeleteError(
          'telegram',
          messageId,
          new Error(
            'Cannot delete message: chat context not found.\n\n' +
              'Solution: Pass the full message object instead:\n' +
              '  bot.deleteMessage(message)  // Works reliably\n' +
              '  bot.deleteMessage(message.id)  // May fail on Telegram'
          )
        )
      );
    }

    try {
      await this.bot.api.deleteMessage(Number(channelId), Number(messageId));
      this.messageCache.delete(messageId);

      return ok(undefined);
    } catch (error) {
      return err(
        new MessageDeleteError(
          'telegram',
          messageId,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(
    messageRef: MessageRef,
    emoji: string
  ): Promise<Result<void>> {
    if (!this.bot) {
      return err(new ConnectionError('telegram', new Error('Not connected')));
    }

    const messageId =
      typeof messageRef === 'string' ? messageRef : messageRef.id;
    const channelId = this.resolveChannelId(messageRef);

    if (!channelId) {
      return err(
        new ReactionError(
          'telegram',
          messageId,
          emoji,
          new Error(
            'Cannot add reaction: chat context not found.\n\n' +
              'Solution: Pass the full message object instead:\n' +
              '  bot.addReaction(message, emoji)  // Works reliably\n' +
              '  bot.addReaction(message.id, emoji)  // May fail on Telegram'
          )
        )
      );
    }

    try {
      // Cast needed: grammy expects a specific 70+ emoji union type,
      // but Switchboard's unified API passes a generic string
      await this.bot.api.setMessageReaction(
        Number(channelId),
        Number(messageId),
        [{ type: 'emoji', emoji: emoji as ReactionTypeEmoji['emoji'] }]
      );

      return ok(undefined);
    } catch (error) {
      return err(
        new ReactionError(
          'telegram',
          messageId,
          emoji,
          error instanceof Error
            ? new Error(
                `Telegram reaction failed: ${error.message}\n` +
                  "Possible causes: bot not admin, emoji not in Telegram's allowed set, or chat doesn't support reactions."
              )
            : new Error(String(error))
        )
      );
    }
  }

  /**
   * Remove a reaction from a message
   * Note: Telegram API clears ALL bot reactions, not just a specific emoji
   */
  async removeReaction(
    messageRef: MessageRef,
    emoji: string
  ): Promise<Result<void>> {
    if (!this.bot) {
      return err(new ConnectionError('telegram', new Error('Not connected')));
    }

    const messageId =
      typeof messageRef === 'string' ? messageRef : messageRef.id;
    const channelId = this.resolveChannelId(messageRef);

    if (!channelId) {
      return err(
        new ReactionError(
          'telegram',
          messageId,
          emoji,
          new Error(
            'Cannot remove reaction: chat context not found.\n\n' +
              'Solution: Pass the full message object instead.'
          )
        )
      );
    }

    try {
      // Telegram API limitation: can only clear ALL bot reactions, not a specific one.
      // setMessageReaction with empty array removes everything.
      console.warn(
        `[Switchboard] Telegram removeReaction: removing ALL bot reactions, ` +
          `not just "${emoji}". This is a Telegram API limitation.`
      );
      await this.bot.api.setMessageReaction(
        Number(channelId),
        Number(messageId),
        []
      );

      return ok(undefined);
    } catch (error) {
      return err(
        new ReactionError(
          'telegram',
          messageId,
          emoji,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Create a thread (reply to a message)
   * On Telegram, this sends a reply using reply_parameters
   */
  async createThread(
    messageRef: MessageRef,
    text: string
  ): Promise<Result<UnifiedMessage>> {
    if (!this.bot) {
      return err(new ConnectionError('telegram', new Error('Not connected')));
    }

    const messageId =
      typeof messageRef === 'string' ? messageRef : messageRef.id;
    const channelId = this.resolveChannelId(messageRef);

    if (!channelId) {
      return err(
        new MessageSendError(
          'telegram',
          'unknown',
          new Error(
            'Cannot create thread: chat context not found.\n\n' +
              'Solution: Pass the full message object instead:\n' +
              '  bot.createThread(message, text)  // Works reliably\n' +
              '  bot.createThread(message.id, text)  // May fail on Telegram'
          )
        )
      );
    }

    try {
      const message = await this.bot.api.sendMessage(Number(channelId), text, {
        reply_parameters: { message_id: Number(messageId) },
      });

      const unifiedMessage = normalizeMessage(message);
      this.cacheMessage(unifiedMessage);

      return ok(unifiedMessage);
    } catch (error) {
      return err(
        new MessageSendError(
          'telegram',
          channelId,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Upload a file to a chat
   */
  async uploadFile(
    channelId: string,
    _file: unknown,
    _options?: UploadOptions
  ): Promise<Result<UnifiedMessage>> {
    if (!this.bot) {
      return err(new ConnectionError('telegram', new Error('Not connected')));
    }

    return err(
      new MessageSendError(
        'telegram',
        channelId,
        new Error('File upload not yet implemented for Telegram adapter')
      )
    );
  }

  /**
   * Subscribe to platform events
   */
  onEvent(handler: (event: UnifiedEvent) => void | Promise<void>): () => void {
    this.eventHandlers.add(handler);
    return () => { this.eventHandlers.delete(handler); };
  }

  /**
   * Get list of known chats
   * Note: Telegram bots cannot enumerate all chats.
   * This returns chats the bot has seen since startup.
   */
  async getChannels(): Promise<Result<Channel[]>> {
    if (!this.bot) {
      return err(new ConnectionError('telegram', new Error('Not connected')));
    }

    return ok([...this.knownChats.values()]);
  }

  /**
   * Get users in a chat
   * Without channelId: returns an error (Telegram bots cannot list all users)
   * With channelId: returns chat administrators
   */
  async getUsers(channelId?: string): Promise<Result<User[]>> {
    if (!this.bot) {
      return err(new ConnectionError('telegram', new Error('Not connected')));
    }

    if (!channelId) {
      return err(
        new Error(
          'Telegram bots cannot list all users. ' +
            'Pass a channelId (chat ID) to get administrators of a specific chat.'
        )
      );
    }

    try {
      const admins = await this.bot.api.getChatAdministrators(
        Number(channelId)
      );
      const users: User[] = admins.map((member) => normalizeUser(member.user));
      return ok(users);
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Normalize platform message to UnifiedMessage
   */
  normalizeMessage(platformMessage: unknown): UnifiedMessage {
    return normalizeMessage(platformMessage as Message);
  }

  /**
   * Normalize platform event to UnifiedEvent
   */
  normalizeEvent(platformEvent: unknown): UnifiedEvent | null {
    const event = platformEvent as Record<string, unknown>;
    if (event.message) {
      return normalizeMessageEvent(event.message as Message);
    }
    return null;
  }

  // ── Private methods ──────────────────────────────────────────────────

  /**
   * Resolve channelId from a MessageRef (cache lookup or direct extraction)
   */
  private resolveChannelId(messageRef: MessageRef): string | null {
    if (typeof messageRef === 'string') {
      const context = this.messageCache.get(messageRef);
      return context?.chatId ?? null;
    }
    return messageRef.channelId;
  }

  /**
   * Cache a message's context for later operations
   */
  private cacheMessage(message: UnifiedMessage): void {
    this.messageCache.set(message.id, {
      chatId: message.channelId,
    });
  }

  /**
   * Track a chat the bot has seen (for getChannels)
   */
  private trackChat(chatId: string): void {
    if (this.knownChats.has(chatId)) return;
    if (!this.bot) return;

    // Set placeholder to prevent duplicate API calls from concurrent messages
    this.knownChats.set(chatId, {
      id: chatId,
      name: `Chat ${chatId}`,
      type: 'unknown',
      isPrivate: false,
    });

    // Fire and forget — replace placeholder with full chat info
    this.bot.api
      .getChat(Number(chatId))
      .then((chat) => {
        this.knownChats.set(chatId, normalizeChat(chat));
      })
      .catch(() => {
        // Keep the placeholder rather than removing — the chat exists
      });
  }

  /**
   * Set up event listeners for Telegram
   */
  private setupEventListeners(): void {
    if (!this.bot) return;

    // Message events
    this.bot.on('message', (ctx) => {
      // Skip bot's own messages
      if (ctx.message.from?.is_bot) return;

      const unifiedMessage = normalizeMessage(ctx.message);
      this.cacheMessage(unifiedMessage);
      this.trackChat(String(ctx.message.chat.id));

      const event: UnifiedEvent = {
        type: 'message',
        message: unifiedMessage,
      };
      this.emitEvent(event);
    });

    // Edited message events
    this.bot.on('edited_message', (ctx) => {
      // Skip bot's own edited messages
      if (ctx.editedMessage?.from?.is_bot) return;

      const message = ctx.editedMessage;
      if (!message) return;

      const event = normalizeMessageEditedEvent(message);
      this.emitEvent(event);
    });

    // Reaction events
    this.bot.on('message_reaction', (ctx) => {
      const update = ctx.messageReaction;
      if (!update) return;

      const userId = update.user?.id;
      if (!userId) return;

      // Process added reactions
      if (update.new_reaction) {
        for (const reaction of update.new_reaction) {
          if (reaction.type === 'emoji') {
            const event = normalizeReactionEvent(
              update.chat.id,
              update.message_id,
              userId,
              reaction.emoji,
              'added'
            );
            this.emitEvent(event);
          }
        }
      }

      // Process removed reactions (in old_reaction but not in new_reaction)
      if (update.old_reaction) {
        const newEmojis = new Set<string>();
        for (const r of update.new_reaction || []) {
          if (r.type === 'emoji') {
            newEmojis.add(r.emoji);
          }
        }

        for (const reaction of update.old_reaction) {
          if (reaction.type === 'emoji' && !newEmojis.has(reaction.emoji)) {
            const event = normalizeReactionEvent(
              update.chat.id,
              update.message_id,
              userId,
              reaction.emoji,
              'removed'
            );
            this.emitEvent(event);
          }
        }
      }
    });

    // Track chats when bot is added/removed
    this.bot.on('my_chat_member', (ctx) => {
      const chatId = String(ctx.myChatMember.chat.id);
      const newStatus = ctx.myChatMember.new_chat_member.status;

      if (newStatus === 'member' || newStatus === 'administrator') {
        this.trackChat(chatId);
      } else if (newStatus === 'left' || newStatus === 'kicked') {
        this.knownChats.delete(chatId);
      }
    });
  }

  /**
   * Emit an event to all registered handlers
   */
  private emitEvent(event: UnifiedEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        Promise.resolve(handler(event)).catch((error) => {
          console.error('[Switchboard] Error in event handler:', error);
        });
      } catch (error) {
        console.error('[Switchboard] Error in event handler:', error);
      }
    }
  }
}
