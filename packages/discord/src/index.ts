/**
 * @switchboard/discord
 *
 * Discord adapter for Switchboard SDK
 * Auto-registers when imported
 */

// Auto-registration side effect
import './register.js';

// Exports
export { DiscordAdapter } from './adapter.js';
export type {
  DiscordCredentials,
  DiscordConfig,
  DiscordMessageOptions,
} from './types.js';
