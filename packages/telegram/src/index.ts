/**
 * @aarekaz/switchboard-telegram
 *
 * Telegram adapter for Switchboard SDK
 * Auto-registers when imported
 */

// Auto-registration side effect
import './register.js';

// Exports
export { TelegramAdapter } from './adapter.js';
export type {
  TelegramCredentials,
  TelegramConfig,
  TelegramMessageOptions,
  TelegramUpdateType,
} from './types.js';
