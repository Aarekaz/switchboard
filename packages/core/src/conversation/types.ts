import type { PlatformType } from '../types/platform.js';
import type { Result } from '../types/result.js';
import type { UnifiedMessage } from '../types/message.js';

export type ConversationRole = 'user' | 'assistant' | 'system' | 'tool';

export interface PlatformIdentityLink {
  platform: PlatformType;
  userId: string;
}

export interface PortableIdentity {
  id: string;
  links: PlatformIdentityLink[];
  displayName?: string;
  metadata?: Record<string, unknown>;
}

export interface PortableConversationMessage {
  id: string;
  platform: PlatformType;
  platformMessageId: string;
  channelId: string;
  userId: string;
  role: ConversationRole;
  text: string;
  timestamp: Date;
  threadId?: string;
  rawRef: UnifiedMessage;
  metadata?: Record<string, unknown>;
}

export interface ConversationSnapshot {
  key: string;
  identityKey: string;
  messages: PortableConversationMessage[];
  metadata: Record<string, unknown>;
  updatedAt: Date;
}

export interface AISDKPromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ConversationStore {
  get(key: string): Promise<Result<ConversationSnapshot | null>>;
  set(snapshot: ConversationSnapshot): Promise<Result<ConversationSnapshot>>;
  append(
    key: string,
    message: PortableConversationMessage
  ): Promise<Result<ConversationSnapshot>>;
  mergeMetadata(
    key: string,
    metadata: Record<string, unknown>
  ): Promise<Result<ConversationSnapshot>>;
}

export interface ConversationOptions {
  key?: string;
  identityKey?: string;
  store?: ConversationStore;
  metadata?: Record<string, unknown>;
}

export interface ConversationHistoryOptions {
  limit?: number;
  since?: Date;
}
