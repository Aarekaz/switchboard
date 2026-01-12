import type { Bot } from '../client/bot.js';
import type { UnifiedEvent } from '../types/event.js';
import type { PlatformType } from '../types/platform.js';

/**
 * Context passed to middleware
 */
export interface MiddlewareContext {
  /** The bot instance */
  bot: Bot;
  /** The event being processed */
  event: UnifiedEvent;
  /** The platform this event is from */
  platform: PlatformType;
  /** Timestamp when the event was received */
  timestamp: Date;
}

/**
 * Middleware function type
 */
export type Middleware = (
  context: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;

// Middleware will be implemented in Phase 5
// For now, this is just a type definition
