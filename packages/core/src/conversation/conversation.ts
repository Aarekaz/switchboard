import { ok } from '../types/result.js';
import type { UnifiedMessage } from '../types/message.js';
import type { Result } from '../types/result.js';
import {
  conversationKeyFromMessage,
  platformUserKey,
  portableMessageId,
} from './keys.js';
import { InMemoryConversationStore } from './memory-store.js';
import type {
  AISDKPromptMessage,
  ConversationHistoryOptions,
  ConversationOptions,
  ConversationRole,
  ConversationSnapshot,
  ConversationStore,
  PortableConversationMessage,
} from './types.js';

const defaultStore = new InMemoryConversationStore();

function filterHistory(
  messages: PortableConversationMessage[],
  options: ConversationHistoryOptions = {}
): PortableConversationMessage[] {
  const sinceFiltered = options.since
    ? messages.filter((message) => message.timestamp >= options.since!)
    : messages;

  if (typeof options.limit !== 'number') {
    return sinceFiltered;
  }

  return sinceFiltered.slice(Math.max(0, sinceFiltered.length - options.limit));
}

function toPortableMessage(
  message: UnifiedMessage,
  role: ConversationRole,
  metadata?: Record<string, unknown>
): PortableConversationMessage {
  return {
    id: portableMessageId(message),
    platform: message.platform,
    platformMessageId: message.id,
    channelId: message.channelId,
    userId: message.userId,
    role,
    text: message.text,
    timestamp: message.timestamp,
    threadId: message.threadId,
    rawRef: message,
    metadata,
  };
}

export class Conversation {
  readonly key: string;
  readonly identityKey: string;
  private readonly store: ConversationStore;
  private readonly initialMetadata: Record<string, unknown>;

  constructor(options: ConversationOptions & { key: string; identityKey: string }) {
    this.key = options.key;
    this.identityKey = options.identityKey;
    this.store = options.store ?? defaultStore;
    this.initialMetadata = options.metadata ? { ...options.metadata } : {};
  }

  static fromMessage(
    message: UnifiedMessage,
    options: ConversationOptions = {}
  ): Conversation {
    return new Conversation({
      key: options.key ?? conversationKeyFromMessage(message),
      identityKey:
        options.identityKey ?? platformUserKey(message.platform, message.userId),
      store: options.store,
      metadata: options.metadata,
    });
  }

  async snapshot(): Promise<Result<ConversationSnapshot>> {
    const existing = await this.store.get(this.key);
    if (!existing.ok) {
      return existing;
    }

    if (existing.value) {
      return ok(existing.value);
    }

    return this.store.set({
      key: this.key,
      identityKey: this.identityKey,
      messages: [],
      metadata: { ...this.initialMetadata },
      updatedAt: new Date(),
    });
  }

  async append(
    message: UnifiedMessage,
    role: ConversationRole = 'user',
    metadata?: Record<string, unknown>
  ): Promise<Result<ConversationSnapshot>> {
    const snapshot = await this.snapshot();
    if (!snapshot.ok) {
      return snapshot;
    }

    return this.store.append(this.key, toPortableMessage(message, role, metadata));
  }

  async remember(
    metadata: Record<string, unknown>
  ): Promise<Result<ConversationSnapshot>> {
    const snapshot = await this.snapshot();
    if (!snapshot.ok) {
      return snapshot;
    }

    return this.store.mergeMetadata(this.key, metadata);
  }

  async history(
    options: ConversationHistoryOptions = {}
  ): Promise<Result<PortableConversationMessage[]>> {
    const snapshot = await this.snapshot();
    if (!snapshot.ok) {
      return snapshot;
    }

    return ok(filterHistory(snapshot.value.messages, options));
  }

  async toAISDKMessages(
    options: ConversationHistoryOptions = {}
  ): Promise<Result<AISDKPromptMessage[]>> {
    const history = await this.history(options);
    if (!history.ok) {
      return history;
    }

    const messages = history.value.reduce<AISDKPromptMessage[]>(
      (items, message) => {
        if (message.role === 'tool') {
          return items;
        }

        items.push({
          role: message.role,
          content: message.text,
        });
        return items;
      },
      []
    );

    return ok(messages);
  }
}
