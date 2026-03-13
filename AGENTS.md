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

- **No external services required.** This is a pure SDK library with no databases, Docker, or backend servers. All development tasks (build, test, lint, typecheck) run locally without network dependencies.
- **Build order matters.** Packages must build before the umbrella re-exports. Use `pnpm build` (not `pnpm -r build`) which handles the correct order: packages first, then umbrella.
- **Test command.** Use `pnpm test -- --run` for a single non-watch test run. `pnpm test` alone starts vitest in watch mode.
- **Telegram adapter** exists at `packages/telegram` (not yet listed in the Repository Layout above) alongside Discord and Slack.
- **Running the hello-world example** requires platform API tokens (`DISCORD_TOKEN`, `SLACK_BOT_TOKEN`/`SLACK_APP_TOKEN`). Without tokens, the example will error on startup as expected. To verify the SDK works without tokens, import from the built packages and exercise `createBot`, `registry`, and `Result<T>` utilities programmatically.
- **Node.js punycode deprecation warning** (`DEP0040`) appears during tests and is harmless — it comes from transitive dependencies, not from Switchboard code.
- See `CLAUDE.md` for the full command reference and coding conventions.
