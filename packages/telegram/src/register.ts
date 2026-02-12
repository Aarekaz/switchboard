/**
 * Auto-registration for Telegram adapter
 * This file is imported as a side effect to register the Telegram adapter
 */

import { registry } from '@aarekaz/switchboard-core';
import { TelegramAdapter } from './adapter.js';

// Create and register the Telegram adapter
const telegramAdapter = new TelegramAdapter();
registry.register('telegram', telegramAdapter);

// Log registration (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log('[Switchboard] Telegram adapter registered');
}
