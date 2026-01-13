/**
 * Normalizers for converting Slack types to Switchboard unified types
 */

import type { UnifiedMessage, UnifiedEvent, Attachment } from '@switchboard/core';

/**
 * Normalize a Slack message to UnifiedMessage
 */
export function normalizeMessage(slackMessage: any): UnifiedMessage {
  // Handle file attachments
  const attachments: Attachment[] = [];
  if (slackMessage.files && Array.isArray(slackMessage.files)) {
    for (const file of slackMessage.files) {
      attachments.push({
        id: file.id,
        filename: file.name || 'unknown',
        url: file.url_private || file.permalink || '',
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size || 0,
      });
    }
  }

  return {
    id: slackMessage.ts || slackMessage.message_ts || slackMessage.event_ts,
    channelId: slackMessage.channel || slackMessage.channel_id || '',
    userId: slackMessage.user || slackMessage.bot_id || 'unknown',
    text: extractPlainText(slackMessage),
    timestamp: new Date(parseFloat(slackMessage.ts || slackMessage.event_ts || '0') * 1000),
    threadId: slackMessage.thread_ts,
    attachments: attachments.length > 0 ? attachments : undefined,
    platform: 'slack',
    _raw: slackMessage,
  };
}

/**
 * Extract plain text from Slack message
 * Handles mrkdwn formatting and blocks
 */
function extractPlainText(message: any): string {
  // If message has blocks, try to extract text from them
  if (message.blocks && Array.isArray(message.blocks)) {
    const texts: string[] = [];
    for (const block of message.blocks) {
      if (block.type === 'section' && block.text) {
        texts.push(block.text.text || '');
      } else if (block.type === 'context' && block.elements) {
        for (const element of block.elements) {
          if (element.text) {
            texts.push(element.text);
          }
        }
      }
    }
    if (texts.length > 0) {
      return texts.join('\\n');
    }
  }

  // Fall back to text field
  return message.text || '';
}

/**
 * Normalize Slack emoji to standard format
 * Slack uses :emoji_name: format, we convert to Unicode or keep as-is
 */
export function normalizeEmoji(slackEmoji: string): string {
  // If it's already a unicode emoji, return as-is
  if (!/^:.+:$/.test(slackEmoji)) {
    return slackEmoji;
  }

  // Remove colons for storage
  // We'll add them back when sending to Slack
  return slackEmoji.replace(/^:|:$/g, '');
}

/**
 * Common emoji mappings from Unicode to Slack format
 * Slack's reactions API requires named format like :thumbsup:
 */
const EMOJI_MAP: Record<string, string> = {
  '👍': 'thumbsup',
  '👎': 'thumbsdown',
  '❤️': 'heart',
  '😂': 'joy',
  '😊': 'blush',
  '😍': 'heart_eyes',
  '🎉': 'tada',
  '🔥': 'fire',
  '✅': 'white_check_mark',
  '❌': 'x',
  '⭐': 'star',
  '💯': '100',
  '🚀': 'rocket',
  '👀': 'eyes',
  '🤔': 'thinking_face',
  '😭': 'sob',
  '😱': 'scream',
  '🙏': 'pray',
  '💪': 'muscle',
  '👏': 'clap',
  '🎯': 'dart',
  '✨': 'sparkles',
  '🤝': 'handshake',
  '💡': 'bulb',
  '🐛': 'bug',
  '⚡': 'zap',
  '🔧': 'wrench',
  '📝': 'memo',
  '🎨': 'art',
  '♻️': 'recycle',
  '🔒': 'lock',
  '🔓': 'unlock',
  '✏️': 'pencil2',
  '🗑️': 'wastebasket',
};

/**
 * Convert standard emoji to Slack format
 */
export function toSlackEmoji(emoji: string): string {
  // If it's already in Slack format, return as-is
  if (/^:.+:$/.test(emoji)) {
    return emoji.slice(1, -1); // Remove the colons, Slack API adds them
  }

  // Check if we have a mapping for this Unicode emoji
  if (EMOJI_MAP[emoji]) {
    return EMOJI_MAP[emoji];
  }

  // If it looks like a name (alphanumeric + underscores), return as-is
  if (/^[a-z0-9_+-]+$/i.test(emoji)) {
    return emoji;
  }

  // Try to strip variant selectors (like ️ at the end of some emojis)
  const stripped = emoji.replace(/[\uFE00-\uFE0F]/g, '');
  if (EMOJI_MAP[stripped]) {
    return EMOJI_MAP[stripped];
  }

  // Fallback: return as-is (might fail, but let Slack tell us)
  return emoji;
}

/**
 * Normalize message event from Slack
 */
export function normalizeMessageEvent(event: any): UnifiedEvent {
  return {
    type: 'message',
    message: normalizeMessage(event),
  };
}

/**
 * Normalize reaction event from Slack
 */
export function normalizeReactionEvent(event: any, action: 'added' | 'removed'): UnifiedEvent {
  return {
    type: 'reaction',
    messageId: event.item.ts,
    userId: event.user,
    emoji: normalizeEmoji(event.reaction),
    action,
  };
}
