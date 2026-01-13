// Result type
export type { Result } from './result.js';
export { ok, err, wrapAsync, isOk, isErr } from './result.js';

// Platform types
export type { PlatformType } from './platform.js';

// Message types
export type {
  UnifiedMessage,
  MessageRef,
  Attachment,
  SendMessageOptions,
  UploadOptions,
} from './message.js';

// Event types
export type {
  UnifiedEvent,
  MessageEvent,
  ReactionEvent,
  UserJoinedEvent,
  UserLeftEvent,
  ChannelCreatedEvent,
  ChannelDeletedEvent,
} from './event.js';

// Channel types
export type { Channel, ChannelType } from './channel.js';

// User types
export type { User } from './user.js';
