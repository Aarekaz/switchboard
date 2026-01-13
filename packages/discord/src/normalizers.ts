/**
 * Normalizers for converting Discord types to Switchboard unified types
 */

import type {
  UnifiedMessage,
  Attachment,
  Channel,
  User,
  UnifiedEvent,
  MessageEvent,
  ReactionEvent,
} from '@aarekaz/switchboard-core';
import type {
  Message,
  TextChannel,
  DMChannel,
  User as DiscordUser,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
} from 'discord.js';

/**
 * Normalizes a Discord message to UnifiedMessage
 */
export function normalizeMessage(message: Message): UnifiedMessage {
  // Get plain text content
  let text = message.content;

  // Extract attachments
  const attachments: Attachment[] = Array.from(message.attachments.values()).map(
    (attachment) => ({
      id: attachment.id,
      filename: attachment.name || 'unknown',
      url: attachment.url,
      mimeType: attachment.contentType || 'application/octet-stream',
      size: attachment.size,
    })
  );

  // Determine thread ID (Discord uses channel ID for threads)
  const threadId = message.thread?.id || (message.channel.isThread() ? message.channelId : undefined);

  return {
    id: message.id,
    channelId: message.channelId,
    userId: message.author.id,
    text,
    timestamp: message.createdAt,
    threadId,
    attachments: attachments.length > 0 ? attachments : undefined,
    platform: 'discord',
    _raw: message,
  };
}

/**
 * Normalizes a Discord channel to Switchboard Channel
 */
export function normalizeChannel(
  channel: TextChannel | DMChannel
): Channel {
  return {
    id: channel.id,
    name: channel.isDMBased() ? 'DM' : (channel as TextChannel).name,
    type: channel.isDMBased() ? 'dm' : 'public',
    platform: 'discord',
  };
}

/**
 * Normalizes a Discord user to Switchboard User
 */
export function normalizeUser(user: DiscordUser): User {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    isBot: user.bot || false,
    platform: 'discord',
  };
}

/**
 * Normalizes a Discord message event to UnifiedEvent
 */
export function normalizeMessageEvent(message: Message): MessageEvent {
  return {
    type: 'message',
    message: normalizeMessage(message),
  };
}

/**
 * Normalizes a Discord reaction event to UnifiedEvent
 */
export function normalizeReactionEvent(
  reaction: MessageReaction | PartialMessageReaction,
  user: DiscordUser | PartialUser,
  action: 'added' | 'removed'
): ReactionEvent {
  // Handle partial reactions by using the emoji identifier
  const emoji = reaction.emoji.name || '❓';

  return {
    type: 'reaction',
    messageId: reaction.message.id,
    userId: user.id,
    emoji,
    action,
  };
}

/**
 * Extracts emoji string from Discord reaction
 * Handles both standard emoji and custom Discord emoji
 */
export function getEmojiString(emoji: string): string {
  // Discord custom emoji format: <:name:id> or <a:name:id> for animated
  // We'll just use the emoji string as-is for standard emoji
  // For custom emoji, Discord.js handles the formatting
  return emoji;
}

/**
 * Converts a Switchboard emoji to Discord format
 * Standard emoji pass through, custom emoji need special handling
 */
export function toDiscordEmoji(emoji: string): string {
  // If it's already in Discord custom emoji format, return as-is
  if (emoji.startsWith('<') && emoji.endsWith('>')) {
    return emoji;
  }

  // Otherwise, assume it's a standard emoji
  return emoji;
}
