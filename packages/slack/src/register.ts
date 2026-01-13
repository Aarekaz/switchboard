/**
 * Auto-registration for Slack adapter
 * This file registers the Slack adapter with the global registry when imported
 */

import { registry } from '@switchboard/core';
import { SlackAdapter } from './adapter.js';

// Create and register the adapter
const slackAdapter = new SlackAdapter();
registry.register('slack', slackAdapter);

// Log registration in development
if (process.env.NODE_ENV !== 'production') {
  console.log('✅ Slack adapter registered');
}
