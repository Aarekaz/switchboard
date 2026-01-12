/**
 * Discord-specific types and configurations
 */

import type { Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder } from 'discord.js';

/**
 * Credentials required to connect to Discord
 */
export interface DiscordCredentials {
  /** Discord bot token from the Developer Portal */
  token: string;
}

/**
 * Discord-specific configuration options
 */
export interface DiscordConfig {
  /** Custom intents (advanced users only) */
  intents?: number[];

  /** Whether to cache messages (default: true) */
  cacheMessages?: boolean;

  /** Maximum number of messages to cache per channel (default: 100) */
  messageCacheSize?: number;
}

/**
 * Discord-specific message options
 */
export interface DiscordMessageOptions {
  /** Discord embeds (rich message formatting) */
  embeds?: EmbedBuilder[];

  /** Discord components (buttons, select menus, etc.) */
  components?: ActionRowBuilder<ButtonBuilder>[];

  /** Whether to mention the replied user (default: false) */
  allowedMentions?: {
    repliedUser?: boolean;
  };

  /** Whether to suppress embeds (default: false) */
  suppressEmbeds?: boolean;
}

/**
 * Internal type for tracking Discord messages
 */
export interface DiscordMessageData {
  originalMessage: Message;
  channelId: string;
  guildId?: string;
}
