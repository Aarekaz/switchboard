# Switchboard Agent Notes

## Project Overview
- Monorepo for the Switchboard SDK (core + platform adapters) using pnpm workspaces.
- Packages are ESM TypeScript and built with tsup.
- Public package scope is `@aarekaz`, with the primary install at `@aarekaz/switchboard`.

## Repository Layout
- `packages/core`: core types and client API.
- `packages/discord`: Discord adapter.
- `packages/slack`: Slack adapter.
- `examples/hello-world`: sample bots (Discord + Slack).
- `docs/`: setup, API docs, ADRs, and guides.

## Package Naming
- Umbrella: `@aarekaz/switchboard`
- Core: `@aarekaz/switchboard-core`
- Discord: `@aarekaz/switchboard-discord`
- Slack: `@aarekaz/switchboard-slack`
- Future adapters follow `@aarekaz/switchboard-<platform>`.

## Common Commands (root `package.json`)
- Install: `pnpm install`
- Build all packages: `pnpm -r build`
- Typecheck: `pnpm -r typecheck`
- Tests: `pnpm test`
- Lint: `pnpm lint`

## Conventions
- Keep workspace deps on `@aarekaz/switchboard-*` using `workspace:*`.
- Update docs and examples when package names or APIs change.
- Source is ESM (`"type": "module"`), so prefer `import` syntax.

## Cursor Cloud specific instructions

- **No external services needed.** This is a pure library/SDK — no Docker, databases, or background daemons are required. All development commands run locally.
- **Build order matters.** Always run `pnpm build` (not `pnpm -r build` alone) from the root; it builds sub-packages first, then the umbrella re-exports. If you only need a single package, filter: `pnpm --filter @aarekaz/switchboard-core build`.
- **Running tests:** `pnpm test -- --run` for a single headless pass. Vitest runs in watch mode by default, so always pass `--run` in CI or agent contexts.
- **Lint and typecheck** are zero-error; existing warnings are `@typescript-eslint/no-explicit-any` in adapter code and are not treated as errors.
- **`pnpm dev`** starts tsup watch for all packages and tries to run the hello-world example (which needs `DISCORD_TOKEN`). Expect that example to fail without tokens — the watch builders for the packages still work fine.
- **`tsx` is only installed inside `examples/hello-world`**, not at the root. To run ad-hoc TypeScript scripts from the root, use `node --import tsx/esm <file>` from within that directory, or reference the binary at `examples/hello-world/node_modules/.bin/tsx`.
- Standard commands are documented in `CLAUDE.md` and `CONTRIBUTING.md`; refer there for the full list.
