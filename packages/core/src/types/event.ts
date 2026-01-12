import type { UnifiedMessage } from './message.js';

/**
 * Event fired when a message is received
 */
export interface MessageEvent {
  type: 'message';
  message: UnifiedMessage;
}

/**
 * Event fired when a reaction is added or removed from a message
 */
export interface ReactionEvent {
  type: 'reaction';
  /** Message ID that was reacted to */
  messageId: string;
  /** User ID who added/removed the reaction */
  userId: string;
  /** Emoji string (e.g., '👍', 'tada') */
  emoji: string;
  /** Whether the reaction was added or removed */
  action: 'added' | 'removed';
}

/**
 * Event fired when a user joins a channel
 */
export interface UserJoinedEvent {
  type: 'user_joined';
  /** Channel ID the user joined */
  channelId: string;
  /** User ID who joined */
  userId: string;
}

/**
 * Event fired when a user leaves a channel
 */
export interface UserLeftEvent {
  type: 'user_left';
  /** Channel ID the user left */
  channelId: string;
  /** User ID who left */
  userId: string;
}

/**
 * Event fired when a channel is created
 */
export interface ChannelCreatedEvent {
  type: 'channel_created';
  /** ID of the created channel */
  channelId: string;
  /** Name of the created channel */
  channelName: string;
}

/**
 * Event fired when a channel is deleted
 */
export interface ChannelDeletedEvent {
  type: 'channel_deleted';
  /** ID of the deleted channel */
  channelId: string;
}

/**
 * Union of all possible events
 */
export type UnifiedEvent =
  | MessageEvent
  | ReactionEvent
  | UserJoinedEvent
  | UserLeftEvent
  | ChannelCreatedEvent
  | ChannelDeletedEvent;
