import type { PlatformType } from '../types/platform.js';

/**
 * Base error class for all Switchboard errors
 */
export class SwitchboardError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly platform?: PlatformType
  ) {
    super(message);
    this.name = 'SwitchboardError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when no adapter is found for a platform
 */
export class AdapterNotFoundError extends SwitchboardError {
  constructor(platform: PlatformType) {
    super(
      `No adapter found for platform: ${platform}. Did you import @aarekaz/switchboard-${platform}?`,
      'ADAPTER_NOT_FOUND',
      platform
    );
    this.name = 'AdapterNotFoundError';
  }
}

/**
 * Error thrown when connection to a platform fails
 */
export class ConnectionError extends SwitchboardError {
  constructor(platform: PlatformType, cause: unknown) {
    super(
      `Failed to connect to ${platform}: ${cause instanceof Error ? cause.message : String(cause)}`,
      'CONNECTION_ERROR',
      platform
    );
    this.name = 'ConnectionError';
    this.cause = cause;
  }
}

/**
 * Error thrown when sending a message fails
 */
export class MessageSendError extends SwitchboardError {
  constructor(
    platform: PlatformType,
    channelId: string,
    cause: unknown
  ) {
    super(
      `Failed to send message to channel ${channelId} on ${platform}: ${cause instanceof Error ? cause.message : String(cause)}`,
      'MESSAGE_SEND_ERROR',
      platform
    );
    this.name = 'MessageSendError';
    this.cause = cause;
  }
}

/**
 * Error thrown when editing a message fails
 */
export class MessageEditError extends SwitchboardError {
  constructor(
    platform: PlatformType,
    messageId: string,
    cause: unknown
  ) {
    super(
      `Failed to edit message ${messageId} on ${platform}: ${cause instanceof Error ? cause.message : String(cause)}`,
      'MESSAGE_EDIT_ERROR',
      platform
    );
    this.name = 'MessageEditError';
    this.cause = cause;
  }
}

/**
 * Error thrown when deleting a message fails
 */
export class MessageDeleteError extends SwitchboardError {
  constructor(
    platform: PlatformType,
    messageId: string,
    cause: unknown
  ) {
    super(
      `Failed to delete message ${messageId} on ${platform}: ${cause instanceof Error ? cause.message : String(cause)}`,
      'MESSAGE_DELETE_ERROR',
      platform
    );
    this.name = 'MessageDeleteError';
    this.cause = cause;
  }
}

/**
 * Error thrown when adding/removing a reaction fails
 */
export class ReactionError extends SwitchboardError {
  constructor(
    platform: PlatformType,
    messageId: string,
    emoji: string,
    cause: unknown
  ) {
    super(
      `Failed to add/remove reaction ${emoji} on message ${messageId} (${platform}): ${cause instanceof Error ? cause.message : String(cause)}`,
      'REACTION_ERROR',
      platform
    );
    this.name = 'ReactionError';
    this.cause = cause;
  }
}
