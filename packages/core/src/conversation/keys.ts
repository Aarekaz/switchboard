import type { PlatformType } from '../types/platform.js';
import type { UnifiedMessage } from '../types/message.js';

function encodePart(value: string): string {
  return encodeURIComponent(value);
}

export function platformUserKey(platform: PlatformType, userId: string): string {
  return `platform-user:${encodePart(platform)}:${encodePart(userId)}`;
}

export function platformThreadKey(
  platform: PlatformType,
  channelId: string,
  threadId: string
): string {
  return `platform-thread:${encodePart(platform)}:${encodePart(
    channelId
  )}:${encodePart(threadId)}`;
}

export function conversationKeyFromMessage(message: UnifiedMessage): string {
  return platformThreadKey(
    message.platform,
    message.channelId,
    message.threadId ?? message.id
  );
}

export function portableMessageId(message: UnifiedMessage): string {
  return `${encodePart(message.platform)}:${encodePart(
    message.channelId
  )}:${encodePart(message.id)}`;
}
