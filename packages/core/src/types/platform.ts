/**
 * Supported chat platforms
 * Extensible to allow custom platforms
 */
export type PlatformType =
  | 'discord'
  | 'slack'
  | 'telegram'
  | (string & { __brand?: 'PlatformType' });
