/**
 * Auto-registration for Discord adapter
 * This file is imported as a side effect to register the Discord adapter
 */

import { registry } from '@switchboard/core';
import { DiscordAdapter } from './adapter.js';

// Create and register the Discord adapter
const discordAdapter = new DiscordAdapter();
registry.register('discord', discordAdapter);

// Log registration (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log('✅ Discord adapter registered');
}
