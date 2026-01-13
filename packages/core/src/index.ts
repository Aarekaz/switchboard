/**
 * @aarekaz/switchboard-core
 *
 * Core types, interfaces, and client API for Switchboard SDK
 * Build chat bots once, deploy everywhere.
 */

// Client API
export { Bot, createBot } from './client/index.js';
export type { BotConfig } from './client/index.js';

// Types
export type {
  // Result type
  Result,
  // Platform
  PlatformType,
  // Messages
  UnifiedMessage,
  MessageRef,
  Attachment,
  SendMessageOptions,
  UploadOptions,
  // Events
  UnifiedEvent,
  MessageEvent,
  ReactionEvent,
  UserJoinedEvent,
  UserLeftEvent,
  ChannelCreatedEvent,
  ChannelDeletedEvent,
  // Channels
  Channel,
  ChannelType,
  // Users
  User,
} from './types/index.js';

// Result utilities
export { ok, err, wrapAsync, isOk, isErr } from './types/index.js';

// Adapter interface (for creating custom adapters)
export type { PlatformAdapter } from './adapter/index.js';
export { registry } from './adapter/index.js';

// Middleware types (implementations coming in Phase 5)
export type { Middleware, MiddlewareContext } from './middleware/index.js';

// Errors
export {
  SwitchboardError,
  AdapterNotFoundError,
  ConnectionError,
  MessageSendError,
  MessageEditError,
  MessageDeleteError,
  ReactionError,
} from './utils/index.js';
