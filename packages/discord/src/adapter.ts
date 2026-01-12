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
    messageId: string,
    newText: string
  ): Promise<Result<UnifiedMessage>> {
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      // We need to find the message first
      // This is a limitation - we need the channel ID, which we don't have
      // For now, we'll return an error suggesting to cache messages
      // A production implementation would cache sent messages
      return err(
        new MessageEditError(
          'discord',
          messageId,
          new Error(
            'Message editing requires message caching. Store the channel ID when sending messages.'
          )
        )
      );
    } catch (error) {
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
  async deleteMessage(messageId: string): Promise<Result<void>> {
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      // Same limitation as editMessage - need channel ID
      return err(
        new MessageDeleteError(
          'discord',
          messageId,
          new Error(
            'Message deletion requires message caching. Store the channel ID when sending messages.'
          )
        )
      );
    } catch (error) {
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
  async addReaction(messageId: string, emoji: string): Promise<Result<void>> {
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      // Same limitation - need channel ID
      return err(
        new ReactionError(
          'discord',
          messageId,
          emoji,
          new Error(
            'Adding reactions requires message caching. Store the channel ID when sending messages.'
          )
        )
      );
    } catch (error) {
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
    messageId: string,
    emoji: string
  ): Promise<Result<void>> {
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      // Same limitation - need channel ID
      return err(
        new ReactionError(
          'discord',
          messageId,
          emoji,
          new Error(
            'Removing reactions requires message caching. Store the channel ID when sending messages.'
          )
        )
      );
    } catch (error) {
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
    messageId: string,
    text: string
  ): Promise<Result<UnifiedMessage>> {
    if (!this.client) {
      return err(new ConnectionError('discord', new Error('Not connected')));
    }

    try {
      // Same limitation - need channel ID and message
      return err(
        new MessageSendError(
          'discord',
          'unknown',
          new Error(
            'Creating threads requires message caching. Store the channel and message when sending messages.'
          )
        )
      );
    } catch (error) {
      return err(
        new MessageSendError(
          'discord',
          'unknown',
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
      console.log(`✅ Discord bot connected as ${this.client!.user!.tag}`);
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
