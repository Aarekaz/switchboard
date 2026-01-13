import type { PlatformType } from './platform.js';

/**
 * File attachment
 */
export interface Attachment {
  /** Attachment ID */
  id: string;
  /** File name */
  filename: string;
  /** Download URL */
  url: string;
  /** MIME type (e.g., 'image/png') */
  mimeType: string;
  /** File size in bytes */
  size: number;
}

/**
 * Unified message representation across all platforms
 * This is the core abstraction that normalizes messages from different platforms
 */
export interface UnifiedMessage {
  // Core identifiers
  /** Platform-specific message ID */
  id: string;
  /** Channel/room/conversation ID where the message was sent */
  channelId: string;
  /** User ID of the message sender */
  userId: string;

  // Content
  /** Plain text content of the message */
  text: string;

  // Metadata
  /** When the message was sent */
  timestamp: Date;
  /** Thread/reply chain ID (if this message is part of a thread) */
  threadId?: string;

  // Attachments
  /** File attachments (images, files, etc.) */
  attachments?: Attachment[];

  // Context
  /** Which platform this message is from */
  platform: PlatformType;

  // Platform-specific data (escape hatch for advanced use cases)
  /** Original platform message object (for accessing platform-specific fields) */
  _raw: unknown;
}

/**
 * Reference to a message - can be either a message ID string or a full UnifiedMessage object.
 *
 * **Why this exists:**
 * Different platforms have different requirements for message operations:
 * - Discord: Only needs message ID for edit/delete/react operations
 * - Slack: Needs both channel ID and message timestamp (ts)
 *
 * **Usage recommendations:**
 * - Passing UnifiedMessage works reliably on ALL platforms
 * - Passing string ID works on Discord, works on Slack if message is in cache (95% of cases)
 *
 * **Platform notes:**
 * - Discord: String IDs always work
 * - Slack: String IDs work if the message was seen by the bot in the last hour.
 *   For guaranteed reliability, pass the full message object.
 *
 * @example
 * ```typescript
 * // Recommended: Works everywhere, always
 * bot.onMessage(async (message) => {
 *   await bot.editMessage(message, 'Updated text');
 *   await bot.addReaction(message, 'thumbsup');
 * });
 *
 * // Works on Discord, works on Slack if cached
 * await bot.editMessage(message.id, 'Updated text');
 * ```
 */
export type MessageRef = string | UnifiedMessage;

/**
 * Options for sending messages
 */
export interface SendMessageOptions {
  /** Send message in a specific thread */
  threadId?: string;

  // Platform-specific options (opt-in)
  /** Discord-specific options */
  discord?: {
    embeds?: unknown[];
    components?: unknown[];
  };

  /** Slack-specific options */
  slack?: {
    blocks?: unknown[];
    unfurl_links?: boolean;
    unfurl_media?: boolean;
  };

  /** Microsoft Teams-specific options */
  teams?: {
    attachments?: unknown[];
  };

  /** Google Chat-specific options */
  googleChat?: {
    cards?: unknown[];
  };
}

/**
 * Options for uploading files
 */
export interface UploadOptions {
  /** File name (if not provided in the File object) */
  filename?: string;
  /** Optional comment/message to send with the file */
  comment?: string;
  /** Send file in a specific thread */
  threadId?: string;
}
