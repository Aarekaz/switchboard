# Switchboard Setup Guide

This guide contains the commands you need to run to complete the setup of the Switchboard monorepo.

## Phase 1 Complete! ✅

The following has been set up:
- ✅ Monorepo structure with pnpm workspaces
- ✅ Root configuration (TypeScript, ESLint, Prettier, Vitest)
- ✅ `@switchboard/core` package with all core types and client API
- ✅ `@switchboard/discord` package stub (for Phase 2)
- ✅ Example project structure
- ✅ Test infrastructure

## Commands to Run

### 1. Install Dependencies

First, make sure you have pnpm installed. If not:

```bash
npm install -g pnpm
```

Then install all dependencies:

```bash
pnpm install
```

This will:
- Install all root dependencies
- Install dependencies for all packages
- Set up workspace links between packages

### 2. Build All Packages

```bash
pnpm build
```

This will build:
- `@switchboard/core` (types and client API)
- `@switchboard/discord` (stub for now)

### 3. Run Tests

```bash
pnpm test
```

This runs the test suite. Currently we have one test file for the Result type.

To run tests in watch mode:

```bash
pnpm test -- --watch
```

To see test coverage:

```bash
pnpm test:coverage
```

### 4. Type Check

```bash
pnpm typecheck
```

This will run TypeScript compiler in all packages to check for type errors.

### 5. Lint Code

```bash
pnpm lint
```

To auto-fix linting issues:

```bash
pnpm lint:fix
```

### 6. Format Code

```bash
pnpm format
```

To check formatting without modifying files:

```bash
pnpm format:check
```

## Development Workflow

### Working on Core Package

```bash
cd packages/core
pnpm dev  # Watch mode - rebuilds on changes
```

### Running the Example (Phase 2, after Discord adapter is implemented)

```bash
cd examples/hello-world
cp .env.example .env
# Edit .env and add your Discord token
pnpm dev
```

## Project Structure

```
switchboard/
├── packages/
│   ├── core/              # @switchboard/core - Core types & API
│   └── discord/           # @switchboard/discord - Discord adapter (stub)
├── examples/
│   └── hello-world/       # Example bot
├── package.json           # Root package.json
├── pnpm-workspace.yaml    # Workspace configuration
├── tsconfig.json          # Shared TypeScript config
├── vitest.config.ts       # Test configuration
├── .eslintrc.cjs          # ESLint configuration
├── .prettierrc            # Prettier configuration
├── spec.md                # Technical specification
└── SETUP.md               # This file
```

## What's Next?

We're now ready to move to **Phase 2: Discord Adapter Implementation**.

Phase 2 will involve:
1. Installing discord.js
2. Implementing the DiscordAdapter class
3. Creating normalizers for Discord messages/events
4. Testing with a real Discord bot
5. Proving the "One Line Swap" concept

See `spec.md` for the detailed implementation plan.

## Troubleshooting

### "Command not found: pnpm"

Install pnpm globally:
```bash
npm install -g pnpm
```

### TypeScript errors about missing modules

Make sure you've run:
```bash
pnpm install
pnpm build
```

### Tests not running

Make sure vitest is installed:
```bash
pnpm install
```

Then run:
```bash
pnpm test
```

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm build` | Build all packages |
| `pnpm dev` | Build all packages in watch mode |
| `pnpm test` | Run tests |
| `pnpm test:ui` | Run tests with UI |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm typecheck` | Check TypeScript types |
| `pnpm lint` | Lint all files |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm format` | Format all files |
| `pnpm clean` | Clean all build artifacts |

## Next Steps

1. Run `pnpm install` to get started
2. Run `pnpm build` to build packages
3. Run `pnpm test` to verify everything works
4. Review `spec.md` for the full technical specification
5. When ready, move to Phase 2: Discord Adapter implementation
