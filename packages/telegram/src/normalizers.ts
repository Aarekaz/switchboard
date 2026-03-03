/**
 * Normalizers for converting Telegram (grammy) types to Switchboard unified types
 */

import type {
  UnifiedMessage,
  Attachment,
  Channel,
  ChannelType,
  User,
  MessageEvent,
  MessageEditedEvent,
  ReactionEvent,
} from '@aarekaz/switchboard-core';
import type { ChatFullInfo, Message, User as TelegramUser } from 'grammy/types';

/**
 * Normalize a Telegram message to UnifiedMessage
 */
export function normalizeMessage(message: Message): UnifiedMessage {
  const text = message.text || message.caption || '';

  const attachments: Attachment[] = [];

  if (message.document) {
    attachments.push({
      id: message.document.file_id,
      filename: message.document.file_name || 'document',
      url: '', // Telegram requires bot.api.getFile() to resolve URL
      mimeType: message.document.mime_type || 'application/octet-stream',
      size: message.document.file_size || 0,
    });
  }

  if (message.photo && message.photo.length > 0) {
    // Telegram sends multiple sizes; take the largest
    const largest = message.photo[message.photo.length - 1]!;
    attachments.push({
      id: largest.file_id,
      filename: 'photo.jpg',
      url: '',
      mimeType: 'image/jpeg',
      size: largest.file_size || 0,
    });
  }

  if (message.video) {
    attachments.push({
      id: message.video.file_id,
      filename: message.video.file_name || 'video.mp4',
      url: '',
      mimeType: message.video.mime_type || 'video/mp4',
      size: message.video.file_size || 0,
    });
  }

  if (message.audio) {
    attachments.push({
      id: message.audio.file_id,
      filename: message.audio.file_name || 'audio',
      url: '',
      mimeType: message.audio.mime_type || 'audio/mpeg',
      size: message.audio.file_size || 0,
    });
  }

  if (message.voice) {
    attachments.push({
      id: message.voice.file_id,
      filename: 'voice.ogg',
      url: '',
      mimeType: message.voice.mime_type || 'audio/ogg',
      size: message.voice.file_size || 0,
    });
  }

  // Forum topic ID maps to threadId
  const threadId = message.message_thread_id
    ? String(message.message_thread_id)
    : undefined;

  return {
    id: String(message.message_id),
    channelId: String(message.chat.id),
    userId: message.from ? String(message.from.id) : 'unknown',
    text,
    timestamp: new Date(message.date * 1000), // Telegram uses seconds, JS uses milliseconds
    threadId,
    attachments: attachments.length > 0 ? attachments : undefined,
    platform: 'telegram',
    _raw: message,
  };
}

/**
 * Normalize a Telegram chat to Switchboard Channel
 */
export function normalizeChat(chat: ChatFullInfo): Channel {
  let type: ChannelType;
  let isPrivate: boolean;

  switch (chat.type) {
    case 'private':
      type = 'dm';
      isPrivate = true;
      break;
    case 'group':
      type = 'group_dm';
      isPrivate = true;
      break;
    case 'supergroup':
    case 'channel':
      type = 'text';
      isPrivate = false;
      break;
    default:
      type = 'unknown';
      isPrivate = false;
  }

  const name =
    ('title' in chat && chat.title) ||
    ('username' in chat && chat.username) ||
    ('first_name' in chat && chat.first_name) ||
    `Chat ${chat.id}`;

  return {
    id: String(chat.id),
    name,
    type,
    isPrivate,
    topic: 'description' in chat ? (chat.description ?? undefined) : undefined,
  };
}

/**
 * Normalize a Telegram user to Switchboard User
 */
export function normalizeUser(user: TelegramUser): User {
  return {
    id: String(user.id),
    username: user.username || user.first_name,
    displayName:
      [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
    isBot: user.is_bot,
    avatarUrl: undefined, // Telegram requires a separate API call for avatars
  };
}

/**
 * Normalize a Telegram message to a MessageEvent
 */
export function normalizeMessageEvent(message: Message): MessageEvent {
  return {
    type: 'message',
    message: normalizeMessage(message),
  };
}

/**
 * Normalize a Telegram reaction update to a ReactionEvent
 */
export function normalizeReactionEvent(
  chatId: number,
  messageId: number,
  userId: number,
  emoji: string,
  action: 'added' | 'removed'
): ReactionEvent {
  return {
    type: 'reaction',
    channelId: String(chatId),
    messageId: String(messageId),
    userId: String(userId),
    emoji,
    action,
  };
}

/**
 * Normalize a Telegram edited message to MessageEditedEvent
 * Telegram provides edit_date as a Unix timestamp (seconds)
 */
export function normalizeMessageEditedEvent(message: Message): MessageEditedEvent {
  return {
    type: 'message_edited',
    message: normalizeMessage(message),
    editedAt: message.edit_date
      ? new Date(message.edit_date * 1000)
      : new Date(),
  };
}
