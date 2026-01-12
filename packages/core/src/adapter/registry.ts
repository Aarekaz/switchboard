import type { PlatformAdapter } from './interface.js';
import type { PlatformType } from '../types/platform.js';

/**
 * Global registry for platform adapters
 * Adapters register themselves when their package is imported
 */
class AdapterRegistry {
  private adapters = new Map<PlatformType, PlatformAdapter>();

  /**
   * Register a platform adapter
   * Called by adapter packages when they're imported
   */
  register(platform: PlatformType, adapter: PlatformAdapter): void {
    if (this.adapters.has(platform)) {
      console.warn(
        `[Switchboard] Adapter for platform "${platform}" is already registered. Overwriting.`
      );
    }
    this.adapters.set(platform, adapter);
  }

  /**
   * Get an adapter for a platform
   */
  get(platform: PlatformType): PlatformAdapter | undefined {
    return this.adapters.get(platform);
  }

  /**
   * Check if an adapter is registered for a platform
   */
  has(platform: PlatformType): boolean {
    return this.adapters.has(platform);
  }

  /**
   * Get all registered platforms
   */
  getRegisteredPlatforms(): PlatformType[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Clear all registered adapters (mainly for testing)
   */
  clear(): void {
    this.adapters.clear();
  }
}

/**
 * Global singleton registry instance
 */
export const registry = new AdapterRegistry();
