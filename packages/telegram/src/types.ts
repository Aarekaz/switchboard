/**
 * Telegram-specific types and interfaces
 */

import type { Update } from 'grammy/types';

/** Valid update type names for grammy's allowed_updates config */
export type TelegramUpdateType = Exclude<keyof Update, 'update_id'>;

/**
 * Telegram credentials for authentication
 */
export interface TelegramCredentials {
  /** Bot token from @BotFather */
  token: string;
}

/**
 * Telegram adapter configuration options
 */
export interface TelegramConfig {
  /**
   * Maximum cache size for message context
   * @default 1000
   */
  cacheSize?: number;

  /**
   * Cache TTL in milliseconds
   * @default 3600000 (1 hour)
   */
  cacheTTL?: number;

  /**
   * Webhook URL for production mode (not yet supported)
   * If provided, will throw an error with instructions
   */
  webhookUrl?: string;

  /**
   * Allowed updates to receive
   * @default ['message', 'edited_message', 'message_reaction', 'my_chat_member']
   */
  allowedUpdates?: TelegramUpdateType[];
}

/**
 * Internal message context stored in cache
 * Maps messageId → chatId (needed because Telegram message IDs are per-chat)
 */
export interface MessageContext {
  chatId: string;
}

/**
 * Telegram-specific message options
 */
export interface TelegramMessageOptions {
  /** Parse mode for message text */
  parse_mode?: 'HTML' | 'MarkdownV2';

  /** Disable link previews */
  disable_web_page_preview?: boolean;

  /** Disable notification sound */
  disable_notification?: boolean;

  /** Protect content from forwarding */
  protect_content?: boolean;

  /** Inline keyboard markup */
  reply_markup?: unknown;
}
