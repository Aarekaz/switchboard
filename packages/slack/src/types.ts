/**
 * Slack-specific types and interfaces
 */

/**
 * Slack credentials for authentication
 */
export interface SlackCredentials {
  /** Bot token (xoxb-...) */
  botToken: string;

  /**
   * App-level token for Socket Mode (xapp-...)
   * Required if using Socket Mode (recommended for development)
   */
  appToken?: string;

  /**
   * Signing secret for Events API
   * Required if using Events API (recommended for production)
   */
  signingSecret?: string;

  /**
   * OAuth scopes (if using OAuth)
   */
  scopes?: string[];
}

/**
 * Slack adapter configuration options
 */
export interface SlackConfig {
  /**
   * Maximum cache size for message context
   * @default 1000
   */
  cacheSize?: number;

  /**
   * Cache TTL in milliseconds
   * @default 3600000 (1 hour)
   */
  cacheTTL?: number;

  /**
   * Enable Socket Mode
   * Auto-detected based on credentials if not specified
   */
  socketMode?: boolean;

  /**
   * Port for Events API (if using HTTP mode)
   * @default 3000
   */
  port?: number;
}

/**
 * Internal message context stored in cache
 */
export interface MessageContext {
  channelId: string;
  threadId?: string;
  timestamp: Date;
}

/**
 * Slack message options (for platform-specific features)
 */
export interface SlackMessageOptions {
  /** Slack Block Kit blocks */
  blocks?: unknown[];

  /** Unfurl links */
  unfurl_links?: boolean;

  /** Unfurl media */
  unfurl_media?: boolean;

  /** Thread timestamp (for replying in threads) */
  thread_ts?: string;

  /** Metadata */
  metadata?: unknown;
}
