import type { Result } from '../types/result.js';
import type { PlatformType } from '../types/platform.js';
import type { UnifiedMessage, SendMessageOptions, UploadOptions } from '../types/message.js';
import type { UnifiedEvent } from '../types/event.js';
import type { Channel } from '../types/channel.js';
import type { User } from '../types/user.js';

/**
 * Platform adapter interface
 * All platform adapters must implement this interface
 */
export interface PlatformAdapter {
  // Metadata
  /** Adapter name (e.g., 'discord-adapter') */
  readonly name: string;
  /** Platform type (e.g., 'discord') */
  readonly platform: PlatformType;

  // Lifecycle
  /** Connect to the platform with credentials */
  connect(credentials: unknown): Promise<void>;
  /** Disconnect from the platform */
  disconnect(): Promise<void>;
  /** Check if currently connected */
  isConnected(): boolean;

  // Message operations
  /** Send a message to a channel */
  sendMessage(
    channelId: string,
    text: string,
    options?: SendMessageOptions
  ): Promise<Result<UnifiedMessage>>;

  /** Edit an existing message */
  editMessage(
    messageId: string,
    newText: string
  ): Promise<Result<UnifiedMessage>>;

  /** Delete a message */
  deleteMessage(messageId: string): Promise<Result<void>>;

  // Reactions
  /** Add a reaction emoji to a message */
  addReaction(messageId: string, emoji: string): Promise<Result<void>>;

  /** Remove a reaction emoji from a message */
  removeReaction(messageId: string, emoji: string): Promise<Result<void>>;

  // Thread operations
  /** Create a thread/reply to a message */
  createThread(
    messageId: string,
    text: string
  ): Promise<Result<UnifiedMessage>>;

  // File uploads
  /** Upload a file to a channel */
  uploadFile(
    channelId: string,
    file: unknown,
    options?: UploadOptions
  ): Promise<Result<UnifiedMessage>>;

  // Event subscription
  /** Subscribe to platform events */
  onEvent(handler: (event: UnifiedEvent) => void | Promise<void>): void;

  // Info retrieval
  /** Get list of channels */
  getChannels(): Promise<Result<Channel[]>>;

  /** Get list of users (optionally in a specific channel) */
  getUsers(channelId?: string): Promise<Result<User[]>>;

  // Normalization helpers (used internally by adapters)
  /** Normalize platform-specific message to UnifiedMessage */
  normalizeMessage(platformMessage: unknown): UnifiedMessage;

  /** Normalize platform-specific event to UnifiedEvent */
  normalizeEvent(platformEvent: unknown): UnifiedEvent | null;
}
