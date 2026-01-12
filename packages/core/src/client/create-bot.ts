import { Bot } from './bot.js';
import { registry } from '../adapter/registry.js';
import type { PlatformAdapter } from '../adapter/interface.js';
import type { PlatformType } from '../types/platform.js';
import { AdapterNotFoundError, ConnectionError } from '../utils/errors.js';

/**
 * Configuration for creating a bot
 */
export interface BotConfig {
  /**
   * Platform to connect to (e.g., 'discord', 'slack', 'teams', 'google-chat')
   */
  platform: PlatformType;

  /**
   * Platform credentials (structure depends on the platform)
   */
  credentials?: {
    /** Bot token (Discord, Slack) */
    token?: string;
    /** App ID (Teams) */
    appId?: string;
    /** App password (Teams) */
    appPassword?: string;
    /** Custom credentials object */
    [key: string]: unknown;
  };

  /**
   * Custom adapter (for advanced users or custom platforms)
   * If provided, this will be used instead of the registered adapter
   */
  adapter?: PlatformAdapter;

  /**
   * Platform-specific configuration (opt-in)
   */
  platformConfig?: {
    discord?: unknown;
    slack?: unknown;
    teams?: unknown;
    googleChat?: unknown;
    [key: string]: unknown;
  };
}

/**
 * Create a bot instance
 *
 * @example
 * ```typescript
 * import { createBot } from '@switchboard/core';
 * import '@switchboard/discord';
 *
 * const bot = createBot({
 *   platform: 'discord',
 *   credentials: {
 *     token: process.env.DISCORD_TOKEN,
 *   },
 * });
 *
 * bot.onMessage(async (message) => {
 *   if (message.text.includes('ping')) {
 *     await bot.reply(message, 'pong!');
 *   }
 * });
 *
 * await bot.start();
 * ```
 */
export async function createBot(config: BotConfig): Promise<Bot> {
  let adapter: PlatformAdapter;

  // Use custom adapter if provided
  if (config.adapter) {
    adapter = config.adapter;
  } else {
    // Get adapter from registry
    const registeredAdapter = registry.get(config.platform);
    if (!registeredAdapter) {
      throw new AdapterNotFoundError(config.platform);
    }
    adapter = registeredAdapter;
  }

  // Connect to the platform
  try {
    await adapter.connect(config.credentials || {});
  } catch (error) {
    throw new ConnectionError(config.platform, error);
  }

  // Create and return the bot instance
  return new Bot(adapter, config.platform);
}
