/**
 * Slack Platform Adapter
 * Implements the Switchboard PlatformAdapter interface for Slack
 */

import bolt from '@slack/bolt';
const { App } = bolt;
type AppOptions = ConstructorParameters<typeof App>[0];
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
  normalizeMessageEvent,
  normalizeReactionEvent,
  toSlackEmoji,
} from './normalizers.js';
import type { SlackCredentials, SlackConfig, MessageContext, SlackMessageOptions } from './types.js';

/**
 * Slack adapter implementation
 */
export class SlackAdapter implements PlatformAdapter {
  readonly name = 'slack-adapter';
  readonly platform = 'slack' as const;

  private app: InstanceType<typeof App> | null = null;
  private eventHandlers: Set<(event: UnifiedEvent) => void> = new Set();
  private config: SlackConfig;
  private messageCache: LRUCache<string, MessageContext>;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(config: SlackConfig = {}) {
    this.config = {
      cacheSize: config.cacheSize || 1000,
      cacheTTL: config.cacheTTL || 1000 * 60 * 60, // 1 hour default
      ...config,
    };

    // Initialize LRU cache for message context
    this.messageCache = new LRUCache<string, MessageContext>({
      max: this.config.cacheSize!,
      ttl: this.config.cacheTTL!,
    });
  }

  /**
   * Connect to Slack
   */
  async connect(credentials: unknown): Promise<void> {
    const slackCreds = credentials as SlackCredentials;

    if (!slackCreds.botToken) {
      throw new ConnectionError(
        'slack',
        new Error('Slack bot token is required')
      );
    }

    try {
      // Detect mode based on credentials
      const useSocketMode = !!(slackCreds.appToken || this.config.socketMode);

      const appOptions: AppOptions = {
        token: slackCreds.botToken,
      };

      if (useSocketMode) {
        // Socket Mode (recommended for development)
        if (!slackCreds.appToken) {
          throw new ConnectionError(
            'slack',
            new Error('App token (appToken) is required for Socket Mode')
          );
        }
        appOptions.socketMode = true;
        appOptions.appToken = slackCreds.appToken;
      } else if (slackCreds.signingSecret) {
        // Events API (recommended for production)
        appOptions.signingSecret = slackCreds.signingSecret;
        if (this.config.port) {
          appOptions.port = this.config.port;
        }
      } else {
        throw new ConnectionError(
          'slack',
          new Error(
            'Either appToken (for Socket Mode) or signingSecret (for Events API) is required'
          )
        );
      }

      // Create Slack app
      this.app = new App(appOptions);

      // Set up event listeners
      this.setupEventListeners();

      // Start the app
      await this.app.start();

      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `✅ Slack adapter connected (${useSocketMode ? 'Socket Mode' : 'Events API'})`
        );
      }
    } catch (error) {
      throw new ConnectionError('slack', error);
    }
  }

  /**
   * Disconnect from Slack
   */
  async disconnect(): Promise<void> {
    if (this.app) {
      await this.app.stop();
      this.app = null;
    }
    this.messageCache.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.app !== null;
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(
    channelId: string,
    text: string,
    options?: SendMessageOptions
  ): Promise<Result<UnifiedMessage>> {
    if (!this.app) {
      return err(new ConnectionError('slack', new Error('Not connected')));
    }

    try {
      const slackOptions = (options as { slack?: SlackMessageOptions })?.slack;

      const result = await this.app.client.chat.postMessage({
        channel: channelId,
        text: text,
        thread_ts: options?.threadId || slackOptions?.thread_ts,
        blocks: slackOptions?.blocks as any,
        unfurl_links: slackOptions?.unfurl_links,
        unfurl_media: slackOptions?.unfurl_media,
        metadata: slackOptions?.metadata as any,
      });

      if (!result.ok || !result.message) {
        return err(
          new MessageSendError(
            'slack',
            channelId,
            new Error(result.error || 'Failed to send message')
          )
        );
      }

      const unifiedMessage = normalizeMessage(result.message);

      // Ensure channelId is set correctly (Slack's response might not include it)
      if (!unifiedMessage.channelId) {
        unifiedMessage.channelId = channelId;
      }

      // Cache the message context
      this.cacheMessage(unifiedMessage);

      return ok(unifiedMessage);
    } catch (error) {
      return err(
        new MessageSendError(
          'slack',
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
    if (!this.app) {
      return err(new ConnectionError('slack', new Error('Not connected')));
    }

    try {
      // Extract message ID and channel ID from MessageRef
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      let channelId: string;

      if (typeof messageRef === 'string') {
        // Look up in cache
        const context = this.messageCache.get(messageRef);
        if (!context) {
          this.cacheMisses++;
          this.logCacheStats();
          return err(
            new MessageEditError(
              'slack',
              messageRef,
              new Error(
                'Cannot edit message: channel context not found.\\n\\n' +
                'This happens when:\\n' +
                '1. The message is older than 1 hour (cache expired)\\n' +
                '2. The bot restarted since the message was sent\\n' +
                '3. The message was sent by another bot instance\\n\\n' +
                'Solution: Pass the full message object instead:\\n' +
                '  bot.editMessage(message, "text")  // ✅ Works reliably\\n' +
                '  bot.editMessage(message.id, "text")  // ❌ May fail on Slack'
              )
            )
          );
        }
        this.cacheHits++;
        this.logCacheStats();
        channelId = context.channelId;
      } else {
        // Use message object
        channelId = messageRef.channelId;
      }

      // Edit the message
      const result = await this.app.client.chat.update({
        channel: channelId,
        ts: messageId,
        text: newText,
      });

      if (!result.ok || !result.message) {
        return err(
          new MessageEditError(
            'slack',
            messageId,
            new Error(result.error || 'Failed to edit message')
          )
        );
      }

      return ok(normalizeMessage(result.message));
    } catch (error) {
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      return err(
        new MessageEditError(
          'slack',
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
    if (!this.app) {
      return err(new ConnectionError('slack', new Error('Not connected')));
    }

    try {
      // Extract message ID and channel ID from MessageRef
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      let channelId: string;

      if (typeof messageRef === 'string') {
        // Look up in cache
        const context = this.messageCache.get(messageRef);
        if (!context) {
          this.cacheMisses++;
          this.logCacheStats();
          return err(
            new MessageDeleteError(
              'slack',
              messageRef,
              new Error(
                'Cannot delete message: channel context not found.\\n\\n' +
                'Solution: Pass the full message object instead:\\n' +
                '  bot.deleteMessage(message)  // ✅ Works reliably\\n' +
                '  bot.deleteMessage(message.id)  // ❌ May fail on Slack'
              )
            )
          );
        }
        this.cacheHits++;
        this.logCacheStats();
        channelId = context.channelId;
      } else {
        // Use message object
        channelId = messageRef.channelId;
      }

      // Delete the message
      const result = await this.app.client.chat.delete({
        channel: channelId,
        ts: messageId,
      });

      if (!result.ok) {
        return err(
          new MessageDeleteError(
            'slack',
            messageId,
            new Error(result.error || 'Failed to delete message')
          )
        );
      }

      // Remove from cache
      this.messageCache.delete(messageId);

      return ok(undefined);
    } catch (error) {
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      return err(
        new MessageDeleteError(
          'slack',
          messageId,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(messageRef: MessageRef, emoji: string): Promise<Result<void>> {
    if (!this.app) {
      return err(new ConnectionError('slack', new Error('Not connected')));
    }

    try {
      // Extract message ID and channel ID from MessageRef
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      let channelId: string;

      if (typeof messageRef === 'string') {
        // Look up in cache
        const context = this.messageCache.get(messageRef);
        if (!context) {
          this.cacheMisses++;
          this.logCacheStats();
          return err(
            new ReactionError(
              'slack',
              messageRef,
              emoji,
              new Error(
                'Cannot add reaction: channel context not found.\\n\\n' +
                'Solution: Pass the full message object instead:\\n' +
                '  bot.addReaction(message, emoji)  // ✅ Works reliably\\n' +
                '  bot.addReaction(message.id, emoji)  // ❌ May fail on Slack'
              )
            )
          );
        }
        this.cacheHits++;
        this.logCacheStats();
        channelId = context.channelId;
      } else {
        // Use message object
        channelId = messageRef.channelId;
      }

      // Add reaction
      const slackEmoji = toSlackEmoji(emoji);
      const result = await this.app.client.reactions.add({
        channel: channelId,
        timestamp: messageId,
        name: slackEmoji.replace(/^:|:$/g, ''), // Slack API wants emoji without colons
      });

      if (!result.ok) {
        return err(
          new ReactionError(
            'slack',
            messageId,
            emoji,
            new Error(result.error || 'Failed to add reaction')
          )
        );
      }

      return ok(undefined);
    } catch (error) {
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      return err(
        new ReactionError(
          'slack',
          messageId,
          emoji,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(messageRef: MessageRef, emoji: string): Promise<Result<void>> {
    if (!this.app) {
      return err(new ConnectionError('slack', new Error('Not connected')));
    }

    try {
      // Extract message ID and channel ID from MessageRef
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      let channelId: string;

      if (typeof messageRef === 'string') {
        // Look up in cache
        const context = this.messageCache.get(messageRef);
        if (!context) {
          this.cacheMisses++;
          this.logCacheStats();
          return err(
            new ReactionError(
              'slack',
              messageRef,
              emoji,
              new Error(
                'Cannot remove reaction: channel context not found.\\n\\n' +
                'Solution: Pass the full message object instead:\\n' +
                '  bot.removeReaction(message, emoji)  // ✅ Works reliably\\n' +
                '  bot.removeReaction(message.id, emoji)  // ❌ May fail on Slack'
              )
            )
          );
        }
        this.cacheHits++;
        this.logCacheStats();
        channelId = context.channelId;
      } else {
        // Use message object
        channelId = messageRef.channelId;
      }

      // Remove reaction
      const slackEmoji = toSlackEmoji(emoji);
      const result = await this.app.client.reactions.remove({
        channel: channelId,
        timestamp: messageId,
        name: slackEmoji.replace(/^:|:$/g, ''), // Slack API wants emoji without colons
      });

      if (!result.ok) {
        return err(
          new ReactionError(
            'slack',
            messageId,
            emoji,
            new Error(result.error || 'Failed to remove reaction')
          )
        );
      }

      return ok(undefined);
    } catch (error) {
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      return err(
        new ReactionError(
          'slack',
          messageId,
          emoji,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Create a thread (reply to a message)
   */
  async createThread(
    messageRef: MessageRef,
    text: string
  ): Promise<Result<UnifiedMessage>> {
    if (!this.app) {
      return err(new ConnectionError('slack', new Error('Not connected')));
    }

    try {
      // Extract message ID and channel ID from MessageRef
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      let channelId: string;

      if (typeof messageRef === 'string') {
        // Look up in cache
        const context = this.messageCache.get(messageRef);
        if (!context) {
          this.cacheMisses++;
          this.logCacheStats();
          return err(
            new MessageSendError(
              'slack',
              'unknown',
              new Error(
                'Cannot create thread: channel context not found.\\n\\n' +
                'Solution: Pass the full message object instead:\\n' +
                '  bot.createThread(message, text)  // ✅ Works reliably\\n' +
                '  bot.createThread(message.id, text)  // ❌ May fail on Slack'
              )
            )
          );
        }
        this.cacheHits++;
        this.logCacheStats();
        channelId = context.channelId;
      } else {
        // Use message object
        channelId = messageRef.channelId;
      }

      // Reply in thread
      const result = await this.app.client.chat.postMessage({
        channel: channelId,
        text: text,
        thread_ts: messageId, // This creates/replies in a thread
      });

      if (!result.ok || !result.message) {
        return err(
          new MessageSendError(
            'slack',
            channelId,
            new Error(result.error || 'Failed to create thread')
          )
        );
      }

      const unifiedMessage = normalizeMessage(result.message);

      // Cache the message context
      this.cacheMessage(unifiedMessage);

      return ok(unifiedMessage);
    } catch (error) {
      const channelId = typeof messageRef === 'string' ? 'unknown' : messageRef.channelId;
      return err(
        new MessageSendError(
          'slack',
          channelId,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Upload a file to a channel
   */
  async uploadFile(
    channelId: string,
    _file: unknown,
    _options?: UploadOptions
  ): Promise<Result<UnifiedMessage>> {
    if (!this.app) {
      return err(new ConnectionError('slack', new Error('Not connected')));
    }

    try {
      // TODO: Implement file upload
      // Slack file upload is more complex and requires different handling
      // For now, return an error indicating it's not yet implemented
      return err(
        new MessageSendError(
          'slack',
          channelId,
          new Error('File upload not yet implemented for Slack adapter')
        )
      );
    } catch (error) {
      return err(
        new MessageSendError(
          'slack',
          channelId,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Subscribe to platform events
   */
  onEvent(handler: (event: UnifiedEvent) => void | Promise<void>): void {
    this.eventHandlers.add(handler);
  }

  /**
   * Get list of channels
   */
  async getChannels(): Promise<Result<Channel[]>> {
    if (!this.app) {
      return err(new ConnectionError('slack', new Error('Not connected')));
    }

    try {
      const result = await this.app.client.conversations.list({
        types: 'public_channel,private_channel',
      });

      if (!result.ok || !result.channels) {
        return err(
          new Error(result.error || 'Failed to fetch channels')
        );
      }

      const channels: Channel[] = result.channels.map((channel: any) => ({
        id: channel.id,
        name: channel.name || 'unknown',
        type: 'text' as const,
        isPrivate: channel.is_private || false,
        topic: channel.topic?.value,
      }));

      return ok(channels);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get list of users
   */
  async getUsers(channelId?: string): Promise<Result<User[]>> {
    if (!this.app) {
      return err(new ConnectionError('slack', new Error('Not connected')));
    }

    try {
      if (channelId) {
        // Get users in a specific channel
        const result = await this.app.client.conversations.members({
          channel: channelId,
        });

        if (!result.ok || !result.members) {
          return err(
            new Error(result.error || 'Failed to fetch channel members')
          );
        }

        // Fetch user info for each member
        const users: User[] = [];
        for (const userId of result.members) {
          const userInfo = await this.app.client.users.info({ user: userId });
          if (userInfo.ok && userInfo.user) {
            users.push({
              id: userInfo.user.id!,
              username: userInfo.user.name || 'unknown',
              displayName: userInfo.user.real_name || userInfo.user.profile?.display_name,
              isBot: userInfo.user.is_bot || false,
              avatarUrl: userInfo.user.profile?.image_512,
            });
          }
        }

        return ok(users);
      } else {
        // Get all users
        const result = await this.app.client.users.list({});

        if (!result.ok || !result.members) {
          return err(
            new Error(result.error || 'Failed to fetch users')
          );
        }

        const users: User[] = result.members.map((user: any) => ({
          id: user.id,
          username: user.name || 'unknown',
          displayName: user.real_name || user.profile?.display_name,
          isBot: user.is_bot || false,
          avatarUrl: user.profile?.image_512,
        }));

        return ok(users);
      }
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Normalize platform message to UnifiedMessage
   */
  normalizeMessage(platformMessage: unknown): UnifiedMessage {
    return normalizeMessage(platformMessage);
  }

  /**
   * Normalize platform event to UnifiedEvent
   */
  normalizeEvent(platformEvent: unknown): UnifiedEvent | null {
    // Handle different event types
    const event = platformEvent as any;

    if (event.type === 'message' || event.message) {
      return normalizeMessageEvent(event);
    }

    if (event.type === 'reaction_added') {
      return normalizeReactionEvent(event, 'added');
    }

    if (event.type === 'reaction_removed') {
      return normalizeReactionEvent(event, 'removed');
    }

    // Unknown event type
    return null;
  }

  /**
   * Set up event listeners for Slack
   */
  private setupEventListeners(): void {
    if (!this.app) return;

    // Message events
    this.app.message(async ({ message }: { message: any }) => {
      // Filter out bot messages and message changes to avoid loops
      if ('subtype' in message && message.subtype !== undefined) {
        return;
      }

      const unifiedMessage = normalizeMessage(message);

      // Cache the message context
      this.cacheMessage(unifiedMessage);

      const event: UnifiedEvent = {
        type: 'message',
        message: unifiedMessage,
      };

      this.eventHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error('[Switchboard] Error in message handler:', error);
        }
      });
    });

    // Reaction added events
    this.app.event('reaction_added', async ({ event }: { event: any }) => {
      const reactionEvent = normalizeReactionEvent(event, 'added');

      this.eventHandlers.forEach((handler) => {
        try {
          handler(reactionEvent);
        } catch (error) {
          console.error('[Switchboard] Error in reaction handler:', error);
        }
      });
    });

    // Reaction removed events
    this.app.event('reaction_removed', async ({ event }: { event: any }) => {
      const reactionEvent = normalizeReactionEvent(event, 'removed');

      this.eventHandlers.forEach((handler) => {
        try {
          handler(reactionEvent);
        } catch (error) {
          console.error('[Switchboard] Error in reaction handler:', error);
        }
      });
    });
  }

  /**
   * Cache a message's context
   */
  private cacheMessage(message: UnifiedMessage): void {
    this.messageCache.set(message.id, {
      channelId: message.channelId,
      threadId: message.threadId,
      timestamp: message.timestamp,
    });
  }

  /**
   * Log cache statistics (every 1000 operations)
   */
  private logCacheStats(): void {
    const total = this.cacheHits + this.cacheMisses;
    if (total > 0 && total % 1000 === 0) {
      const hitRate = ((this.cacheHits / total) * 100).toFixed(1);
      console.log(`[Switchboard] Slack cache hit rate: ${hitRate}% (${this.cacheHits}/${total})`);
    }
  }
}
