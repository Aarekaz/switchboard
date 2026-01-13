/**
 * Message Context
 *
 * A context object passed to message handlers that provides convenient access
 * to message data and bot operations without repetitive parameter passing.
 *
 * Inspired by Hono's context pattern and Telegraf's bot framework.
 */

import type { UnifiedMessage, MessageRef } from './message.js';
import type { SendMessageOptions } from './message.js';
import type { Result } from './result.js';
import type { PlatformType } from './platform.js';

/**
 * Context object provided to message handlers
 *
 * @example
 * ```typescript
 * bot.onMessage(async (ctx) => {
 *   // Access message data
 *   console.log(ctx.message.text);
 *   console.log(ctx.userId);
 *   console.log(ctx.channelId);
 *
 *   // Use helper methods
 *   await ctx.reply('Hello!');
 *   await ctx.react('👍');
 *   await ctx.edit('Updated!');
 * });
 * ```
 */
export interface MessageContext {
  /**
   * The received message
   */
  readonly message: UnifiedMessage;

  /**
   * Platform this message is from
   */
  readonly platform: PlatformType;

  /**
   * User ID who sent the message (convenience accessor)
   */
  readonly userId: string;

  /**
   * Channel ID where message was sent (convenience accessor)
   */
  readonly channelId: string;

  /**
   * Message text content (convenience accessor)
   */
  readonly text: string;

  /**
   * Thread ID if message is in a thread (convenience accessor)
   */
  readonly threadId: string | undefined;

  /**
   * Reply to the message
   *
   * @param text - Text to reply with
   * @param options - Optional message options
   * @returns Result containing the sent message
   *
   * @example
   * ```typescript
   * await ctx.reply('Got your message!');
   *
   * // With options
   * await ctx.reply('Thread reply', { threadId: ctx.threadId });
   * ```
   */
  reply(text: string, options?: SendMessageOptions): Promise<Result<UnifiedMessage>>;

  /**
   * Add a reaction to the message
   *
   * @param emoji - Emoji to add (Unicode or platform name)
   * @returns Result indicating success or failure
   *
   * @example
   * ```typescript
   * await ctx.react('👍');
   * await ctx.react('thumbsup');
   * ```
   */
  react(emoji: string): Promise<Result<void>>;

  /**
   * Remove a reaction from the message
   *
   * @param emoji - Emoji to remove
   * @returns Result indicating success or failure
   */
  unreact(emoji: string): Promise<Result<void>>;

  /**
   * Edit the message (only works for bot's own messages)
   *
   * @param newText - New message text
   * @returns Result containing the edited message
   *
   * @example
   * ```typescript
   * const sent = await ctx.reply('Processing...');
   * if (sent.ok) {
   *   // Create new context for the sent message
   *   await bot.editMessage(sent.value, 'Done!');
   * }
   * ```
   */
  edit(newText: string): Promise<Result<UnifiedMessage>>;

  /**
   * Delete the message
   *
   * @returns Result indicating success or failure
   */
  delete(): Promise<Result<void>>;

  /**
   * Create a thread on the message
   *
   * @param text - First message in the thread
   * @returns Result containing the thread message
   *
   * @example
   * ```typescript
   * await ctx.createThread('Let\'s discuss this!');
   * ```
   */
  createThread(text: string): Promise<Result<UnifiedMessage>>;

  /**
   * Send a new message to the same channel
   *
   * @param text - Message text
   * @param options - Optional message options
   * @returns Result containing the sent message
   *
   * @example
   * ```typescript
   * await ctx.send('This is a new message');
   * ```
   */
  send(text: string, options?: SendMessageOptions): Promise<Result<UnifiedMessage>>;
}

/**
 * Function type for message handlers that receive context
 */
export type MessageHandler = (ctx: MessageContext) => void | Promise<void>;
