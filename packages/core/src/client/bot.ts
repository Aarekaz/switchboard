import type { PlatformAdapter } from '../adapter/interface.js';
import type { Result } from '../types/result.js';
import type { PlatformType } from '../types/platform.js';
import type {
  UnifiedMessage,
  MessageRef,
  MessageContent,
  SendMessageOptions,
  UploadOptions,
} from '../types/message.js';
import type { UnifiedEvent, ReactionEvent, MessageEditedEvent } from '../types/event.js';
import type { Channel } from '../types/channel.js';
import type { User } from '../types/user.js';
import type { MessageContext, MessageHandler } from '../types/context.js';
import { ok, err } from '../types/result.js';
import { toAsyncIterable } from '../utils/stream.js';
import { StreamError } from '../utils/errors.js';

const DEFAULT_STREAM_INTERVAL_MS = 750;
const DEFAULT_STREAM_PLACEHOLDER = '...';

function isStream(content: MessageContent): content is Exclude<MessageContent, string> {
  return typeof content !== 'string';
}

/**
 * Bot client - the main interface for interacting with chat platforms
 */
export class Bot {
  private eventHandlers: Map<string, Set<(event: UnifiedEvent) => void | Promise<void>>> = new Map();
  private unsubscribeAdapter: (() => void) | null = null;

  constructor(
    private readonly adapter: PlatformAdapter,
    private readonly _platform: PlatformType,
    private readonly credentials: unknown
  ) {
    this.subscribeToAdapter();
  }

  /**
   * Get the platform type
   */
  get platform(): PlatformType {
    return this._platform;
  }

  /**
   * Start the bot (connect to the platform)
   */
  async start(): Promise<void> {
    // Re-subscribe if we previously unsubscribed via stop()
    if (!this.unsubscribeAdapter) {
      this.subscribeToAdapter();
    }

    // Connect to the platform if not already connected
    if (!this.adapter.isConnected()) {
      await this.adapter.connect(this.credentials);
    }
  }

  /**
   * Stop the bot (disconnect from the platform)
   */
  async stop(): Promise<void> {
    this.unsubscribeAdapter?.();
    this.unsubscribeAdapter = null;
    await this.adapter.disconnect();
  }

  /**
   * Check if the bot is connected
   */
  isConnected(): boolean {
    return this.adapter.isConnected();
  }

  /**
   * Send a message to a channel.
   *
   * Accepts a static string or a text stream (`AsyncIterable<string>` /
   * `ReadableStream<string>`, e.g. AI SDK `result.textStream`). Streams are
   * posted as a placeholder and edited in place at the cadence configured by
   * `options.stream.updateIntervalMs` (default 750ms).
   */
  async sendMessage(
    channelId: string,
    content: MessageContent,
    options?: SendMessageOptions
  ): Promise<Result<UnifiedMessage>> {
    if (isStream(content)) {
      return this.streamMessage(channelId, content, options);
    }
    return this.adapter.sendMessage(channelId, content, options);
  }

  /**
   * Reply to a message. Accepts a static string or a text stream.
   */
  async reply(
    message: UnifiedMessage,
    content: MessageContent,
    options?: SendMessageOptions
  ): Promise<Result<UnifiedMessage>> {
    // If the message is in a thread, reply in the same thread
    const threadId = message.threadId || message.id;
    const mergedOptions = { ...options, threadId };
    return this.sendMessage(message.channelId, content, mergedOptions);
  }

  /**
   * Edit an existing message
   */
  async editMessage(
    messageRef: MessageRef,
    newText: string
  ): Promise<Result<UnifiedMessage>> {
    return this.adapter.editMessage(messageRef, newText);
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageRef: MessageRef): Promise<Result<void>> {
    return this.adapter.deleteMessage(messageRef);
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(messageRef: MessageRef, emoji: string): Promise<Result<void>> {
    return this.adapter.addReaction(messageRef, emoji);
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(messageRef: MessageRef, emoji: string): Promise<Result<void>> {
    return this.adapter.removeReaction(messageRef, emoji);
  }

  /**
   * Create a thread (or reply in a thread). Accepts a static string or a
   * text stream — for streams, the thread's first message is posted as a
   * placeholder and edited in place as chunks arrive.
   */
  async createThread(
    messageRef: MessageRef,
    content: MessageContent
  ): Promise<Result<UnifiedMessage>> {
    if (isStream(content)) {
      const placeholder = DEFAULT_STREAM_PLACEHOLDER;
      const initial = await this.adapter.createThread(messageRef, placeholder);
      if (!initial.ok) return initial;
      return this.driveStream(initial.value, content, undefined);
    }
    return this.adapter.createThread(messageRef, content);
  }

  /**
   * Upload a file to a channel
   */
  async uploadFile(
    channelId: string,
    file: unknown,
    options?: UploadOptions
  ): Promise<Result<UnifiedMessage>> {
    return this.adapter.uploadFile(channelId, file, options);
  }

  /**
   * Get list of channels
   */
  async getChannels(): Promise<Result<Channel[]>> {
    return this.adapter.getChannels();
  }

  /**
   * Get list of users (optionally in a specific channel)
   */
  async getUsers(channelId?: string): Promise<Result<User[]>> {
    return this.adapter.getUsers(channelId);
  }

  /**
   * Register a handler for message events
   *
   * Supports both context API (recommended) and legacy message API
   *
   * @example
   * ```typescript
   * // Context API (recommended)
   * bot.onMessage(async (ctx) => {
   *   await ctx.reply('Hello!');
   *   await ctx.react('thumbsup');
   * });
   *
   * // Legacy API (still supported)
   * bot.onMessage(async (message) => {
   *   await bot.reply(message, 'Hello!');
   * });
   * ```
   */
  onMessage(handler: MessageHandler | ((message: UnifiedMessage) => void | Promise<void>)): () => void {
    return this.on('message', async (event) => {
      if (event.type === 'message') {
        const message = event.message;

        // Detect if handler expects context (by checking parameter count)
        // Context handlers have 1 parameter, legacy handlers might check message properties
        // We'll check if the handler looks like it wants a context by seeing if it's async
        // and calling it with a context object

        // Create context object
        const ctx = this.createContext(message);

        // Call handler with context
        await handler(ctx as any);
      }
    });
  }

  /**
   * Create a message context object
   */
  private createContext(message: UnifiedMessage): MessageContext {
    return {
      message,
      platform: this._platform,
      userId: message.userId,
      channelId: message.channelId,
      text: message.text,
      threadId: message.threadId,

      // Helper methods
      reply: (content: MessageContent, options?: SendMessageOptions) => {
        return this.reply(message, content, options);
      },

      react: (emoji: string) => {
        return this.addReaction(message, emoji);
      },

      unreact: (emoji: string) => {
        return this.removeReaction(message, emoji);
      },

      edit: (newText: string) => {
        return this.editMessage(message, newText);
      },

      delete: () => {
        return this.deleteMessage(message);
      },

      createThread: (content: MessageContent) => {
        return this.createThread(message, content);
      },

      send: (content: MessageContent, options?: SendMessageOptions) => {
        return this.sendMessage(message.channelId, content, options);
      },
    };
  }

  /**
   * Register a handler for reaction events
   */
  onReaction(handler: (event: ReactionEvent) => void | Promise<void>): () => void {
    return this.on('reaction', async (event) => {
      if (event.type === 'reaction') {
        await handler(event);
      }
    });
  }

  /**
   * Register a handler for message edited events
   */
  onMessageEdited(handler: (event: MessageEditedEvent) => void | Promise<void>): () => void {
    return this.on('message_edited', async (event) => {
      if (event.type === 'message_edited') {
        await handler(event);
      }
    });
  }

  /**
   * Register a handler for any event
   */
  onEvent(handler: (event: UnifiedEvent) => void | Promise<void>): () => void {
    return this.on('*', handler);
  }

  /**
   * Get the underlying adapter (for advanced use cases)
   */
  getAdapter(): PlatformAdapter {
    return this.adapter;
  }

  /**
   * Internal: Register an event handler
   */
  private on(
    eventType: string,
    handler: (event: UnifiedEvent) => void | Promise<void>
  ): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
    return () => { this.eventHandlers.get(eventType)?.delete(handler); };
  }

  /**
   * Internal: Post a placeholder then drive the stream into an edit loop.
   */
  private async streamMessage(
    channelId: string,
    stream: Exclude<MessageContent, string>,
    options: SendMessageOptions | undefined
  ): Promise<Result<UnifiedMessage>> {
    const placeholder = options?.stream?.placeholder ?? DEFAULT_STREAM_PLACEHOLDER;
    const initial = await this.adapter.sendMessage(channelId, placeholder, options);
    if (!initial.ok) return initial;
    return this.driveStream(initial.value, stream, options);
  }

  /**
   * Internal: Consume the stream and edit the posted message with
   * debounce-trailing semantics — at most one edit per `updateIntervalMs`,
   * at most one edit in flight, last value always wins at stream end.
   */
  private async driveStream(
    posted: UnifiedMessage,
    stream: Exclude<MessageContent, string>,
    options: SendMessageOptions | undefined
  ): Promise<Result<UnifiedMessage>> {
    const intervalMs = options?.stream?.updateIntervalMs ?? DEFAULT_STREAM_INTERVAL_MS;
    const onChunk = options?.stream?.onChunk;

    let accumulated = '';
    let lastEdited = '';
    let flushing = false;

    const flush = async (): Promise<void> => {
      if (flushing) return;
      if (accumulated === lastEdited) return;
      flushing = true;
      const snapshot = accumulated;
      const editResult = await this.adapter.editMessage(posted, snapshot);
      // Track the snapshot as "last edited" only on success so a transient
      // rate-limit failure gets retried on the next flush.
      if (editResult.ok) {
        lastEdited = snapshot;
      } else {
        console.error(
          `[Switchboard] Streaming edit failed on ${this._platform}:`,
          editResult.error
        );
      }
      flushing = false;
    };

    const timer = setInterval(() => {
      void flush();
    }, intervalMs);

    try {
      const iterable = toAsyncIterable(stream);
      for await (const chunk of iterable) {
        if (!chunk) continue;
        accumulated += chunk;
        onChunk?.(accumulated);
      }
    } catch (error) {
      clearInterval(timer);
      // Post whatever we have so the user isn't left staring at a placeholder.
      while (flushing) await Promise.resolve();
      await flush();
      return err(new StreamError(this._platform, accumulated, error));
    }

    clearInterval(timer);
    // Wait for any in-flight edit to settle, then force a final edit so the
    // user always sees the last state of the stream.
    while (flushing) await Promise.resolve();
    await flush();

    return ok({ ...posted, text: accumulated || posted.text });
  }

  /**
   * Internal: Subscribe to adapter events and store the unsubscribe handle
   */
  private subscribeToAdapter(): void {
    this.unsubscribeAdapter = this.adapter.onEvent(async (event) => {
      await this.handleEvent(event);
    });
  }

  /**
   * Internal: Handle an event from the adapter
   */
  private async handleEvent(event: UnifiedEvent): Promise<void> {
    // Call handlers for this specific event type
    const typeHandlers = this.eventHandlers.get(event.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(
            `[Switchboard] Error in ${event.type} handler:`,
            error
          );
        }
      }
    }

    // Call wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`[Switchboard] Error in wildcard handler:`, error);
        }
      }
    }
  }
}
