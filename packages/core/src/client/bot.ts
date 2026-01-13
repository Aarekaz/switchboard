import type { PlatformAdapter } from '../adapter/interface.js';
import type { Result } from '../types/result.js';
import type { PlatformType } from '../types/platform.js';
import type {
  UnifiedMessage,
  MessageRef,
  SendMessageOptions,
  UploadOptions,
} from '../types/message.js';
import type { UnifiedEvent, MessageEvent, ReactionEvent } from '../types/event.js';
import type { Channel } from '../types/channel.js';
import type { User } from '../types/user.js';

/**
 * Bot client - the main interface for interacting with chat platforms
 */
export class Bot {
  private eventHandlers: Map<string, Set<(event: UnifiedEvent) => void | Promise<void>>> = new Map();

  constructor(
    private readonly adapter: PlatformAdapter,
    private readonly _platform: PlatformType,
    private readonly credentials: unknown
  ) {
    // Subscribe to all events from the adapter
    this.adapter.onEvent(async (event) => {
      await this.handleEvent(event);
    });
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
    // Connect to the platform if not already connected
    if (!this.adapter.isConnected()) {
      await this.adapter.connect(this.credentials);
    }
  }

  /**
   * Stop the bot (disconnect from the platform)
   */
  async stop(): Promise<void> {
    await this.adapter.disconnect();
  }

  /**
   * Check if the bot is connected
   */
  isConnected(): boolean {
    return this.adapter.isConnected();
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(
    channelId: string,
    text: string,
    options?: SendMessageOptions
  ): Promise<Result<UnifiedMessage>> {
    return this.adapter.sendMessage(channelId, text, options);
  }

  /**
   * Reply to a message
   */
  async reply(
    message: UnifiedMessage,
    text: string,
    options?: SendMessageOptions
  ): Promise<Result<UnifiedMessage>> {
    // If the message is in a thread, reply in the same thread
    const threadId = message.threadId || message.id;
    return this.adapter.sendMessage(message.channelId, text, {
      ...options,
      threadId,
    });
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
   * Create a thread (or reply in a thread)
   */
  async createThread(
    messageRef: MessageRef,
    text: string
  ): Promise<Result<UnifiedMessage>> {
    return this.adapter.createThread(messageRef, text);
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
   */
  onMessage(handler: (message: UnifiedMessage) => void | Promise<void>): void {
    this.on('message', async (event) => {
      if (event.type === 'message') {
        await handler(event.message);
      }
    });
  }

  /**
   * Register a handler for reaction events
   */
  onReaction(handler: (event: ReactionEvent) => void | Promise<void>): void {
    this.on('reaction', async (event) => {
      if (event.type === 'reaction') {
        await handler(event);
      }
    });
  }

  /**
   * Register a handler for any event
   */
  onEvent(handler: (event: UnifiedEvent) => void | Promise<void>): void {
    this.on('*', handler);
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
  ): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
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
