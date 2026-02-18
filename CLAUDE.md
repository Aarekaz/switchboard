# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Switchboard is a universal TypeScript SDK for chat platforms — build bots once, deploy everywhere (Discord, Slack, Teams, Google Chat). Current version: 0.3.5 with Discord and Slack adapters complete.

## Commands

```bash
pnpm install                              # Install all workspace dependencies
pnpm build                                # Build all packages then umbrella
pnpm dev                                  # Watch mode for all packages
pnpm test                                 # Run vitest
pnpm test -- --watch                      # Watch mode
pnpm test:coverage                        # With v8 coverage
pnpm --filter @aarekaz/switchboard-core test  # Test single package
pnpm typecheck                            # TypeScript check across all packages
pnpm lint                                 # ESLint (v9 flat config)
pnpm lint:fix                             # Auto-fix lint issues
pnpm format                               # Prettier format
pnpm format:check                         # Check formatting
pnpm clean                                # Remove node_modules and dist everywhere
```

Build order matters: packages must build before the umbrella (`pnpm build` handles this).

## Architecture

### Monorepo Layout (pnpm workspaces)

- `packages/core` — `@aarekaz/switchboard-core`: Platform-agnostic types, `PlatformAdapter` interface, `Bot` client, `AdapterRegistry`, `Result<T>` utilities, error classes
- `packages/discord` — `@aarekaz/switchboard-discord`: Discord adapter using discord.js v14
- `packages/slack` — `@aarekaz/switchboard-slack`: Slack adapter using @slack/bolt v4 + LRU cache for message context
- `src/` — Umbrella package re-exports (index.ts, discord.ts, slack.ts) published as `@aarekaz/switchboard`
- `examples/hello-world/` — Reference bot implementations
- `docs/adr/` — Architecture Decision Records (001–005)

### Layered Architecture

```
Layer 1: Bot Client (createBot → Bot)     ← 90% of users
Layer 2: Platform Client (adapter config)  ← 9% power users
Layer 3: Platform Adapters                 ← 1% extending SDK
Layer 4: Event Normalization (internal)    ← Platform ↔ Unified translation
```

### Key Patterns

**Auto-Registration**: Adapters register via side-effect imports. `import '@aarekaz/switchboard/discord'` triggers `register.ts` which calls `registry.register('discord', adapter)`. The registry is a global singleton in `core/adapter/registry.ts`.

**Result<T, E>**: Rust-inspired error handling — all adapter operations return `Result<T>` instead of throwing. Utilities: `ok()`, `err()`, `wrapAsync()`, `isOk()`, `isErr()` in `core/types/result.ts`.

**PlatformAdapter Interface** (`core/adapter/interface.ts`): Every adapter implements this contract — lifecycle (connect/disconnect), message ops (send/edit/delete), reactions, threads, file uploads, event subscription, and normalization helpers.

**Dependency Inversion**: Core defines the `PlatformAdapter` abstraction. Each adapter package depends on core and implements the interface. This keeps platform packages tree-shakeable.

### Each Adapter Package Follows This Structure

```
src/
├── adapter.ts      # PlatformAdapter implementation
├── normalizers.ts  # Platform → Unified type conversion
├── types.ts        # Platform-specific credential/config types
├── register.ts     # Auto-registration side effect
└── index.ts        # Public exports + registration trigger
```

## Coding Conventions

- **ESM only** (`"type": "module"`) — all imports use `.js` extensions in source
- **Strict TypeScript**: `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`
- **File naming**: `kebab-case.ts`
- **Naming**: `camelCase` for variables/functions, `PascalCase` for classes/types, `SCREAMING_SNAKE_CASE` for constants
- **No `any`**: use `unknown` or proper types (eslint warns on `@typescript-eslint/no-explicit-any`)
- **Unused vars**: prefix with `_` (eslint enforced)
- **Formatting**: Prettier — 2 spaces, single quotes, trailing commas (es5), 80 char width
- **Tests**: Colocated with source as `*.test.ts`, using vitest with globals enabled
- **Commits**: Conventional Commits with scopes: `feat(core):`, `fix(slack):`, `docs:`, etc.
- **Error handling**: Return `Result<T>` from adapter methods — no thrown exceptions in SDK operations

## Implementation Status

- Phase 1: Core types & client API
- Phase 2: Discord adapter (discord.js)
- Phase 3: Slack adapter (@slack/bolt)
- Phase 4: Teams adapter (not started)
- Phase 5: Google Chat adapter + middleware system (not started)

See `spec.md` for the full technical specification and `docs/adr/` for architectural decisions.
