/**
 * @switchboard/slack
 * Slack adapter for Switchboard SDK
 *
 * @example
 * ```typescript
 * import { createBot } from '@switchboard/core';
 * import '@switchboard/slack';
 *
 * const bot = createBot({
 *   platform: 'slack',
 *   credentials: {
 *     botToken: process.env.SLACK_BOT_TOKEN,
 *     appToken: process.env.SLACK_APP_TOKEN,
 *   },
 * });
 * ```
 */

// Auto-register the adapter (side effect)
import './register.js';

// Export types and adapter for advanced use
export * from './adapter.js';
export * from './types.js';
export * from './normalizers.js';
