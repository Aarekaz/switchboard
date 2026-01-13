# ADR-003: Auto-Registration Pattern for Adapters

**Status**: Accepted

**Date**: 2026-01-12

**Deciders**: Core team

## Context

Platform adapters need to be registered with the global registry before they can be used. We need a registration mechanism that:

1. Is zero-config for 90% of users
2. Doesn't require explicit registration code
3. Supports tree-shaking in production builds
4. Allows advanced users to customize if needed

### The User Experience Goal

```typescript
// Goal: This should "just work"
import '@aarekaz/switchboard/discord';
const bot = createBot({ platform: 'discord', credentials: {...} });
```

No explicit `registry.register()` calls. No configuration files. No setup ceremony.

## Decision

Use **side-effect imports** with auto-registration:

### How It Works

1. Each adapter package has a `register.ts` file
2. The main `index.ts` imports it as a side effect
3. Importing the package automatically registers the adapter
4. The registry is a singleton that adapters register with

### Implementation

**packages/discord/src/register.ts**:
```typescript
import { registry } from '@aarekaz/switchboard';
import { DiscordAdapter } from './adapter.js';

// Create and register the adapter
const discordAdapter = new DiscordAdapter();
registry.register('discord', discordAdapter);

// Log registration in development
if (process.env.NODE_ENV !== 'production') {
  console.log('[Switchboard] Discord adapter registered');
}
```

**packages/discord/src/index.ts**:
```typescript
// Auto-register the adapter (side effect)
import './register.js';

// Export types and adapter for advanced use
export * from './adapter.js';
export * from './types.js';
```

**User code**:
```typescript
// This import triggers registration as a side effect
import '@aarekaz/switchboard/discord';

// Adapter is now available
const bot = createBot({ platform: 'discord', credentials: {...} });
```

### Registry Implementation

**packages/core/src/adapter/registry.ts**:
```typescript
class AdapterRegistry {
  private adapters = new Map<PlatformType, PlatformAdapter>();

  register(platform: PlatformType, adapter: PlatformAdapter): void {
    if (this.adapters.has(platform)) {
      throw new Error(`Adapter for platform "${platform}" is already registered`);
    }
    this.adapters.set(platform, adapter);
  }

  get(platform: PlatformType): PlatformAdapter | undefined {
    return this.adapters.get(platform);
  }
}

export const registry = new AdapterRegistry();
```

## Consequences

### Positive

- **Zero config**: Users just import and go
- **Pit of success**: Correct usage is automatic
- **Clear intent**: `import '@aarekaz/switchboard/discord'` makes dependencies explicit
- **Tree-shakeable**: Unused adapters are removed in production builds
- **Debuggable**: Registration logs help troubleshoot issues

### Negative

- **Implicit behavior**: Side effects can be surprising
- **Import order matters**: Must import adapter before creating bot
- **Testing complexity**: Need to manage global state in tests
- **Bundle size**: All imports are included (mitigated by tree-shaking)

### Neutral

- **Non-standard pattern**: Not commonly used in TypeScript libraries
- **Escape hatch exists**: Advanced users can still use registry directly

## Alternatives Considered

### Alternative 1: Explicit Registration

```typescript
import { registry } from '@aarekaz/switchboard';
import { DiscordAdapter } from '@aarekaz/switchboard/discord';

registry.register('discord', new DiscordAdapter());

const bot = createBot({ platform: 'discord', credentials: {...} });
```

**Pros**:
- Explicit and clear
- No side effects
- More control

**Cons**:
- Ceremony for every project
- Easy to forget registration step
- Boilerplate in every file

**Reason for rejection**: Violates "Convention Over Configuration." Makes simple case harder.

---

### Alternative 2: Factory Functions

```typescript
import { createDiscordBot } from '@aarekaz/switchboard/discord';

const bot = createDiscordBot({ credentials: {...} });
```

**Pros**:
- No global registry
- Type-safe per platform
- Clear entry point

**Cons**:
- Different API per platform (no "One Line Swap")
- Shared utilities harder to implement
- Can't switch platforms via config

**Reason for rejection**: Breaks core promise of unified API.

---

### Alternative 3: Configuration File

```javascript
// switchboard.config.js
export default {
  adapters: ['discord', 'slack']
};
```

**Pros**:
- Centralized configuration
- No imports needed

**Cons**:
- Requires build step
- Less flexible
- Configuration file ceremony
- Harder to type-check

**Reason for rejection**: Adds complexity without clear benefit.

---

### Alternative 4: Auto-Discovery via Package.json

```json
{
  "dependencies": {
    "@aarekaz/switchboard/discord": "*"
  }
}
```

Framework scans package.json and auto-registers everything.

**Pros**:
- Truly zero-config
- No imports needed

**Cons**:
- **Magic**: Hard to understand
- **Fragile**: Breaks with hoisting, monorepos, pnpm workspaces
- **No tree-shaking**: Can't remove unused code
- **Build-time complexity**: Requires custom tooling

**Reason for rejection**: Too magical, too fragile.

## Pattern Precedents

This pattern is used by successful libraries:

1. **Prisma Client**: Side-effect registration of engines
2. **Apollo Client**: Link and cache registration
3. **Next.js**: Page registration via file system
4. **Jest**: Matchers extend via imports

## Advanced Usage

Power users can bypass auto-registration:

```typescript
import { registry } from '@aarekaz/switchboard';
import { DiscordAdapter } from '@aarekaz/switchboard/discord';

// Custom adapter configuration
const customAdapter = new DiscordAdapter({
  intents: ['GUILDS', 'GUILD_MESSAGES', 'DIRECT_MESSAGES'],
});

registry.register('discord', customAdapter);

const bot = createBot({ platform: 'discord', credentials: {...} });
```

## Testing Implications

Tests need to manage global state:

```typescript
import { registry } from '@aarekaz/switchboard';

beforeEach(() => {
  // Clear registry before each test
  registry.clear();
});

test('bot creation', () => {
  // Import adapter (registers it)
  await import('@aarekaz/switchboard/discord');

  // Now create bot
  const bot = createBot({ platform: 'discord', credentials: {...} });
  expect(bot).toBeDefined();
});
```

## Documentation Requirements

Because this pattern is implicit, documentation must clearly explain:

1. **Import requirement**: Must import adapter before use
2. **Order matters**: Import before `createBot()`
3. **Tree-shaking**: Unused adapters are removed
4. **Logs**: Registration logs help verify setup

Example documentation:

```typescript
// 1. Import the adapter (registers it automatically)
import '@aarekaz/switchboard/discord';

// 2. Create your bot
const bot = createBot({
  platform: 'discord',
  credentials: { token: process.env.DISCORD_TOKEN }
});
```

## References

- [Hono's similar pattern](https://github.com/honojs/hono)
- [Vite's plugin system](https://vitejs.dev/guide/api-plugin.html)
- [Tree-shaking in bundlers](https://webpack.js.org/guides/tree-shaking/)

## Validation

This pattern has proven effective:
- **Developer feedback**: New users find it intuitive
- **Bundle size**: Tree-shaking works correctly in Vite/Webpack
- **Debugging**: Registration logs help identify issues quickly
- **Adoption**: Similar pattern used by popular frameworks
