# Switchboard Agent Notes

## Project Overview
- Monorepo for the Switchboard SDK (core + platform adapters) using pnpm workspaces.
- Packages are ESM TypeScript and built with tsup.
- Public package scope is `@aarekaz` with names like `@aarekaz/switchboard-core`.

## Repository Layout
- `packages/core`: core types and client API.
- `packages/discord`: Discord adapter.
- `packages/slack`: Slack adapter.
- `examples/hello-world`: sample bots (Discord + Slack).
- `docs/`: setup, API docs, ADRs, and guides.

## Package Naming
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
