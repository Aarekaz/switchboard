/**
 * Unified user representation
 */
export interface User {
  /** User ID */
  id: string;
  /** Username */
  username: string;
  /** Display name (may be different from username on some platforms) */
  displayName?: string;
  /** Whether the user is a bot */
  isBot: boolean;
  /** Avatar URL (if available) */
  avatarUrl?: string;
}
