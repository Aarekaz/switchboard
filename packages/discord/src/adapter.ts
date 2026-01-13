/**
 * Discord Platform Adapter
 * Implements the Switchboard PlatformAdapter interface for Discord
 */

import {
  Client,
  GatewayIntentBits,
  Message,
  TextChannel,
  ThreadChannel,
  Partials,
} from 'discord.js';
import type {
  PlatformAdapter,
  Result,
  UnifiedMessage,
  MessageRef,
  UnifiedEvent,
  Channel,
  User,
} from '@switchboard/core';
import {
  ok,
  err,
  ConnectionError,
  MessageSendError,
  MessageEditError,
  MessageDeleteError,
  ReactionError,
} from '@switchboard/core';
import {
  normalizeMessage,
  normalizeChannel,
  normalizeUser,
  normalizeMessageEvent,
  normalizeReactionEvent,
  toDiscordEmoji,
} from './normalizers.js';
import type { DiscordCredentials, DiscordConfig, DiscordMessageOptions } from './types.js';

/**
 * Discord adapter implementation
 */
export class DiscordAdapter implements PlatformAdapter {
  readonly name = 'discord-adapter';
  readonly platform = 'discord' as const;

  private client: Client | null = null;
  private eventHandlers: Set<(event: UnifiedEvent) => void> = new Set();
  private config: DiscordConfig;

  constructor(config: DiscordConfig = {}) {
    this.config = config;
  }

  /**
   * Connect to Discord
   */
  async connect(credentials: unknown): Promise<void> {
    const discordCreds = credentials as DiscordCredentials;

    if (!discordCreds.token) {
      throw new ConnectionError(
        'discord',
        new Error('Discord token is required')
      );
    }

    try {
      // Create Discord client with necessary intents
      this.client = new Client({
        intents: this.config.intents || [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.GuildMessageReactions,
        ],
        partials: [Partials.Message, Partials.Channel, Partials.Reaction],
      });

      // Set up event listeners
      this.setupEventListeners();

      // Login to Discord
      await this.client.login(discordCreds.token);

      // Wait for the client to be ready
      await new Promise<void>((resolve) => {
        this.client!.once('ready', () => resolve());
      });
    } catch (error) {
      throw new ConnectionError('discord', error);
    }
  }

  /**
   * Disconnect from Discord
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
  }

  /**
   * Check if connected to Discord
   */
  isConnected(): boolean {
    return this.client !== null && this.client.isReady();
  }

  /**
   * Send a message to a Discord channel
   */
  async sendMessage(
    channelId: string,
    text: string,
    options?: unknown
  ): Promise<Result<UnifiedMessage>> {
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      const channel = await this.client.channels.fetch(channelId);

      if (!channel || !channel.isTextBased()) {
        return err(
          new MessageSendError(
            'discord',
            channelId,
            new Error('Channel not found or not text-based')
          )
        );
      }

      // Handle Discord-specific options
      const discordOptions = (options as { discord?: DiscordMessageOptions })
        ?.discord;

      const message = await (channel as TextChannel).send({
        content: text,
        embeds: discordOptions?.embeds,
        components: discordOptions?.components,
        allowedMentions: discordOptions?.allowedMentions,
      });

      return ok(normalizeMessage(message));
    } catch (error) {
      return err(
        new MessageSendError(
          'discord',
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
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      // Extract message ID and channel ID from MessageRef
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      const channelId = typeof messageRef === 'string'
        ? null
        : messageRef.channelId;

      if (!channelId) {
        return err(
          new MessageEditError(
            'discord',
            messageId,
            new Error(
              'Cannot edit message: channel context not found.\n' +
              'Pass the full message object instead:\n' +
              '  bot.editMessage(message, "text")  // ✅ Works\n' +
              '  bot.editMessage(message.id, "text")  // ❌ Missing channel context'
            )
          )
        );
      }

      // Fetch the channel
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !('messages' in channel)) {
        return err(
          new MessageEditError(
            'discord',
            messageId,
            new Error(`Channel ${channelId} not found or is not a text channel`)
          )
        );
      }

      // Fetch and edit the message
      const message = await (channel as TextChannel).messages.fetch(messageId);
      const editedMessage = await message.edit(newText);

      return ok(normalizeMessage(editedMessage));
    } catch (error) {
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      return err(
        new MessageEditError(
          'discord',
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
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      // Extract message ID and channel ID from MessageRef
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      const channelId = typeof messageRef === 'string'
        ? null
        : messageRef.channelId;

      if (!channelId) {
        return err(
          new MessageDeleteError(
            'discord',
            messageId,
            new Error(
              'Cannot delete message: channel context not found.\n' +
              'Pass the full message object instead:\n' +
              '  bot.deleteMessage(message)  // ✅ Works\n' +
              '  bot.deleteMessage(message.id)  // ❌ Missing channel context'
            )
          )
        );
      }

      // Fetch the channel
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !('messages' in channel)) {
        return err(
          new MessageDeleteError(
            'discord',
            messageId,
            new Error(`Channel ${channelId} not found or is not a text channel`)
          )
        );
      }

      // Fetch and delete the message
      const message = await (channel as TextChannel).messages.fetch(messageId);
      await message.delete();

      return ok(undefined);
    } catch (error) {
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      return err(
        new MessageDeleteError(
          'discord',
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
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      // Extract message ID and channel ID from MessageRef
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      const channelId = typeof messageRef === 'string'
        ? null
        : messageRef.channelId;

      if (!channelId) {
        return err(
          new ReactionError(
            'discord',
            messageId,
            emoji,
            new Error(
              'Cannot add reaction: channel context not found.\n' +
              'Pass the full message object instead:\n' +
              '  bot.addReaction(message, emoji)  // ✅ Works\n' +
              '  bot.addReaction(message.id, emoji)  // ❌ Missing channel context'
            )
          )
        );
      }

      // Fetch the channel
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !('messages' in channel)) {
        return err(
          new ReactionError(
            'discord',
            messageId,
            emoji,
            new Error(`Channel ${channelId} not found or is not a text channel`)
          )
        );
      }

      // Fetch the message and add reaction
      const message = await (channel as TextChannel).messages.fetch(messageId);
      const discordEmoji = toDiscordEmoji(emoji);
      await message.react(discordEmoji);

      return ok(undefined);
    } catch (error) {
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      return err(
        new ReactionError(
          'discord',
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
  async removeReaction(
    messageRef: MessageRef,
    emoji: string
  ): Promise<Result<void>> {
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      // Extract message ID and channel ID from MessageRef
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      const channelId = typeof messageRef === 'string'
        ? null
        : messageRef.channelId;

      if (!channelId) {
        return err(
          new ReactionError(
            'discord',
            messageId,
            emoji,
            new Error(
              'Cannot remove reaction: channel context not found.\n' +
              'Pass the full message object instead:\n' +
              '  bot.removeReaction(message, emoji)  // ✅ Works\n' +
              '  bot.removeReaction(message.id, emoji)  // ❌ Missing channel context'
            )
          )
        );
      }

      // Fetch the channel
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !('messages' in channel)) {
        return err(
          new ReactionError(
            'discord',
            messageId,
            emoji,
            new Error(`Channel ${channelId} not found or is not a text channel`)
          )
        );
      }

      // Fetch the message and remove reaction
      const message = await (channel as TextChannel).messages.fetch(messageId);
      const discordEmoji = toDiscordEmoji(emoji);

      // Remove the bot's own reaction
      await message.reactions.cache.get(discordEmoji)?.users.remove(this.client.user!.id);

      return ok(undefined);
    } catch (error) {
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      return err(
        new ReactionError(
          'discord',
          messageId,
          emoji,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Create a thread from a message
   */
  async createThread(
    messageRef: MessageRef,
    text: string
  ): Promise<Result<UnifiedMessage>> {
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      // Extract message ID and channel ID from MessageRef
      const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;
      const channelId = typeof messageRef === 'string'
        ? null
        : messageRef.channelId;

      if (!channelId) {
        return err(
          new MessageSendError(
            'discord',
            'unknown',
            new Error(
              'Cannot create thread: channel context not found.\n' +
              'Pass the full message object instead:\n' +
              '  bot.createThread(message, text)  // ✅ Works\n' +
              '  bot.createThread(message.id, text)  // ❌ Missing channel context'
            )
          )
        );
      }

      // Fetch the channel
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !('messages' in channel)) {
        return err(
          new MessageSendError(
            'discord',
            channelId,
            new Error(`Channel ${channelId} not found or is not a text channel`)
          )
        );
      }

      // Fetch the message and create thread
      const message = await (channel as TextChannel).messages.fetch(messageId);
      const thread = await message.startThread({
        name: text.substring(0, 100), // Discord thread names max 100 chars
      });

      // Send the first message in the thread
      const threadMessage = await thread.send(text);

      return ok(normalizeMessage(threadMessage));
    } catch (error) {
      const channelId = typeof messageRef === 'string' ? 'unknown' : messageRef.channelId;
      return err(
        new MessageSendError(
          'discord',
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
    file: unknown,
    options?: unknown
  ): Promise<Result<UnifiedMessage>> {
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      const channel = await this.client.channels.fetch(channelId);

      if (!channel || !channel.isTextBased()) {
        return err(
          new MessageSendError(
            'discord',
            channelId,
            new Error('Channel not found or not text-based')
          )
        );
      }

      // Handle file upload
      // This is a simplified implementation - production would handle Buffer, Stream, File, etc.
      return err(
        new MessageSendError(
          'discord',
          channelId,
          new Error('File upload not yet implemented')
        )
      );
    } catch (error) {
      return err(
        new MessageSendError(
          'discord',
          channelId,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Register an event handler
   */
  onEvent(handler: (event: UnifiedEvent) => void): void {
    this.eventHandlers.add(handler);
  }

  /**
   * Get list of channels
   */
  async getChannels(): Promise<Result<Channel[]>> {
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      const channels: Channel[] = [];

      for (const [, channel] of this.client.channels.cache) {
        if (channel.isTextBased() && !channel.isThread()) {
          channels.push(normalizeChannel(channel as TextChannel));
        }
      }

      return ok(channels);
    } catch (error) {
      return err(
        new ConnectionError(
          'discord',
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Get list of users (in a specific channel or guild)
   */
  async getUsers(channelId?: string): Promise<Result<User[]>> {
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      const users: User[] = [];

      if (channelId) {
        const channel = await this.client.channels.fetch(channelId);
        if (channel && 'members' in channel) {
          for (const [, member] of (channel as any).members) {
            users.push(normalizeUser(member.user));
          }
        }
      } else {
        // Get all cached users
        for (const [, user] of this.client.users.cache) {
          users.push(normalizeUser(user));
        }
      }

      return ok(users);
    } catch (error) {
      return err(
        new ConnectionError(
          'discord',
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Normalize a Discord message to UnifiedMessage
   */
  normalizeMessage(platformMessage: unknown): UnifiedMessage {
    return normalizeMessage(platformMessage as Message);
  }

  /**
   * Normalize a Discord event to UnifiedEvent
   */
  normalizeEvent(platformEvent: unknown): UnifiedEvent {
    // This would handle different Discord event types
    // For now, we assume it's a message event
    return normalizeMessageEvent(platformEvent as Message);
  }

  /**
   * Set up Discord event listeners
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    // Message events
    this.client.on('messageCreate', (message: Message) => {
      // Ignore bot messages
      if (message.author.bot) return;

      const event = normalizeMessageEvent(message);
      this.emitEvent(event);
    });

    // Reaction events
    this.client.on('messageReactionAdd', async (reaction, user) => {
      // Handle partial reactions
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (error) {
          console.error('Failed to fetch reaction:', error);
          return;
        }
      }

      if (user.partial) {
        try {
          await user.fetch();
        } catch (error) {
          console.error('Failed to fetch user:', error);
          return;
        }
      }

      if (user.bot) return;

      const event = normalizeReactionEvent(reaction, user, 'added');
      this.emitEvent(event);
    });

    this.client.on('messageReactionRemove', async (reaction, user) => {
      // Handle partial reactions
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (error) {
          console.error('Failed to fetch reaction:', error);
          return;
        }
      }

      if (user.partial) {
        try {
          await user.fetch();
        } catch (error) {
          console.error('Failed to fetch user:', error);
          return;
        }
      }

      if (user.bot) return;

      const event = normalizeReactionEvent(reaction, user, 'removed');
      this.emitEvent(event);
    });

    // Ready event
    this.client.on('ready', () => {
      console.log(`[Switchboard] Discord bot connected as ${this.client!.user!.tag}`);
    });

    // Error handling
    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
    });
  }

  /**
   * Emit an event to all registered handlers
   */
  private emitEvent(event: UnifiedEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    }
  }
}
