/**
 * Supported chat platforms
 * Extensible to allow custom platforms
 */
export type PlatformType = 'discord' | 'slack' | 'teams' | 'google-chat' | (string & {});
