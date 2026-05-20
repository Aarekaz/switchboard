import { ok } from '../types/result.js';
import type { UnifiedMessage } from '../types/message.js';
import type { Result } from '../types/result.js';
import { platformUserKey } from './keys.js';
import type {
  ConversationSnapshot,
  ConversationStore,
  PortableConversationMessage,
} from './types.js';

function cloneUnknown<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === undefined || value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value) as T;
  }

  const existing = seen.get(value);
  if (existing) {
    return existing as T;
  }

  if (Array.isArray(value)) {
    const clone: unknown[] = [];
    seen.set(value, clone);
    value.forEach((item) => clone.push(cloneUnknown(item, seen)));
    return clone as T;
  }

  const clone: Record<string, unknown> = {};
  seen.set(value, clone);

  Object.entries(value).forEach(([key, item]) => {
    clone[key] = cloneUnknown(item, seen);
  });

  return clone as T;
}

function cloneUnifiedMessage(message: UnifiedMessage): UnifiedMessage {
  return {
    ...message,
    timestamp: new Date(message.timestamp),
    attachments: message.attachments?.map((attachment) => ({ ...attachment })),
    _raw: cloneUnknown(message._raw),
  };
}

function cloneMessage(
  message: PortableConversationMessage
): PortableConversationMessage {
  return {
    ...message,
    timestamp: new Date(message.timestamp),
    rawRef: cloneUnifiedMessage(message.rawRef),
    metadata: message.metadata ? cloneUnknown(message.metadata) : undefined,
  };
}

function cloneSnapshot(snapshot: ConversationSnapshot): ConversationSnapshot {
  return {
    ...snapshot,
    messages: snapshot.messages.map((message) => cloneMessage(message)),
    metadata: cloneUnknown(snapshot.metadata),
    updatedAt: new Date(snapshot.updatedAt),
  };
}

export class InMemoryConversationStore implements ConversationStore {
  private readonly snapshots = new Map<string, ConversationSnapshot>();

  async get(key: string): Promise<Result<ConversationSnapshot | null>> {
    const snapshot = this.snapshots.get(key);
    return ok(snapshot ? cloneSnapshot(snapshot) : null);
  }

  async set(snapshot: ConversationSnapshot): Promise<Result<ConversationSnapshot>> {
    const cloned = cloneSnapshot(snapshot);
    this.snapshots.set(cloned.key, cloned);
    return ok(cloneSnapshot(cloned));
  }

  async append(
    key: string,
    message: PortableConversationMessage
  ): Promise<Result<ConversationSnapshot>> {
    const existing = this.snapshots.get(key);
    const next: ConversationSnapshot = existing
      ? {
          ...existing,
          messages: [...existing.messages, cloneMessage(message)],
          updatedAt: new Date(message.timestamp),
        }
      : {
          key,
          identityKey: platformUserKey(message.platform, message.userId),
          messages: [cloneMessage(message)],
          metadata: {},
          updatedAt: new Date(message.timestamp),
        };

    const cloned = cloneSnapshot(next);
    this.snapshots.set(key, cloned);
    return ok(cloneSnapshot(cloned));
  }

  async mergeMetadata(
    key: string,
    metadata: Record<string, unknown>
  ): Promise<Result<ConversationSnapshot>> {
    const existing = this.snapshots.get(key);
    const next: ConversationSnapshot = existing
      ? {
          ...existing,
          metadata: cloneUnknown({ ...existing.metadata, ...metadata }),
          updatedAt: new Date(),
        }
      : {
          key,
          identityKey: '',
          messages: [],
          metadata: cloneUnknown(metadata),
          updatedAt: new Date(),
        };

    const cloned = cloneSnapshot(next);
    this.snapshots.set(key, cloned);
    return ok(cloneSnapshot(cloned));
  }
}
