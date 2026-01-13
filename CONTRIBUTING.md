# Contributing to Switchboard

Thank you for your interest in contributing to Switchboard! This document provides guidelines and instructions for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Adding a New Platform Adapter](#adding-a-new-platform-adapter)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow:

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and help them get started
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone is learning

## Getting Started

### Prerequisites

- **Node.js**: 18+
- **pnpm**: Latest version (`npm install -g pnpm`)
- **Git**: Latest version
- **TypeScript**: Knowledge of TypeScript is required

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/switchboard.git
   cd switchboard
   ```

3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/Aarekaz/switchboard.git
   ```

## Development Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Build all packages**:
   ```bash
   pnpm build
   ```

3. **Run tests** (when available):
   ```bash
   pnpm test
   ```

4. **Set up environment variables** (for examples):
   ```bash
   cd examples/hello-world
   cp .env.example .env
   # Edit .env with your tokens
   ```

## Project Structure

```
switchboard/
├── packages/
│   ├── core/           # Core types, client, and registry
│   ├── discord/        # Discord platform adapter
│   └── slack/          # Slack platform adapter
├── examples/
│   └── hello-world/    # Example bots
├── docs/
│   ├── adr/           # Architecture Decision Records
│   └── api/           # API reference documentation
├── .github/
│   └── workflows/      # CI/CD workflows
└── README.md
```

### Package Organization

- **@switchboard/core**: Platform-agnostic interfaces and types
- **@switchboard/discord**: Discord-specific implementation
- **@switchboard/slack**: Slack-specific implementation

Each package follows this structure:
```
package/
├── src/
│   ├── adapter.ts      # Platform adapter implementation
│   ├── normalizers.ts  # Platform → Unified type conversion
│   ├── types.ts        # Platform-specific types
│   ├── register.ts     # Auto-registration logic
│   └── index.ts        # Public API exports
├── README.md           # Package documentation
├── package.json
└── tsup.config.ts      # Build configuration
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/modifications

### 2. Make Your Changes

- Write clean, readable code
- Follow the [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation as needed

### 3. Build and Test

```bash
# Build all packages
pnpm build

# Run type checking
pnpm typecheck

# Run linter (when configured)
pnpm lint

# Run tests (when configured)
pnpm test
```

### 4. Commit Your Changes

Follow our [commit message guidelines](#commit-messages):

```bash
git add .
git commit -m "feat: add thread support to Discord adapter"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @switchboard/core test

# Run tests in watch mode
pnpm test --watch
```

### Writing Tests

Tests should be colocated with source files:
```
src/
├── adapter.ts
└── adapter.test.ts
```

Example test structure:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { DiscordAdapter } from './adapter';

describe('DiscordAdapter', () => {
  let adapter: DiscordAdapter;

  beforeEach(() => {
    adapter = new DiscordAdapter();
  });

  it('should normalize Discord messages correctly', () => {
    const discordMessage = { /* ... */ };
    const normalized = normalizeMessage(discordMessage);

    expect(normalized).toMatchObject({
      id: expect.any(String),
      channelId: expect.any(String),
      userId: expect.any(String),
      text: expect.any(String),
    });
  });
});
```

## Coding Standards

### TypeScript

- **Use strict mode**: All packages use `strict: true`
- **Explicit types**: Prefer explicit return types on functions
- **No `any`**: Avoid `any`, use `unknown` or proper types
- **Interfaces over types**: Use `interface` for object shapes

### Code Style

- **No emojis**: Keep codebase professional (no decorative emojis in code/logs)
- **Naming conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and types
  - `SCREAMING_SNAKE_CASE` for constants
- **File naming**: `kebab-case.ts`

### Documentation

- **JSDoc comments**: Document all public APIs
- **Examples**: Include usage examples in docstrings
- **Types first**: Let TypeScript be the documentation where possible

Example:
```typescript
/**
 * Send a message to a channel
 *
 * @param channelId - The ID of the channel to send to
 * @param text - The message text to send
 * @param options - Optional message options
 * @returns Result containing the sent message or an error
 *
 * @example
 * ```typescript
 * const result = await bot.sendMessage('123', 'Hello!');
 * if (result.ok) {
 *   console.log('Sent:', result.value.id);
 * }
 * ```
 */
async sendMessage(
  channelId: string,
  text: string,
  options?: SendMessageOptions
): Promise<Result<UnifiedMessage>>;
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **refactor**: Code refactoring (no feature/fix)
- **test**: Test additions/modifications
- **chore**: Build process, tooling changes
- **perf**: Performance improvements

### Scopes

- `core` - Changes to @switchboard/core
- `discord` - Changes to @switchboard/discord
- `slack` - Changes to @switchboard/slack
- `examples` - Changes to examples
- `docs` - Documentation changes

### Examples

```bash
# Feature
feat(discord): add voice channel support

# Bug fix
fix(slack): handle rate limiting correctly

# Documentation
docs(core): update API reference for Result type

# Refactor
refactor(core): simplify adapter registry

# Multiple scopes
feat(discord,slack): add file upload support
```

### Co-authoring

If pair programming or collaborating:
```
feat(slack): implement message editing

Co-authored-by: Jane Developer <jane@example.com>
```

## Pull Request Process

### Before Submitting

- [ ] Code builds without errors (`pnpm build`)
- [ ] All tests pass (`pnpm test`)
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with `main`

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No breaking changes (or documented)

## Related Issues
Closes #123
```

### Review Process

1. **Automated checks**: CI must pass (build, tests, lint)
2. **Code review**: At least one maintainer approval required
3. **Address feedback**: Respond to review comments
4. **Merge**: Maintainer will merge when approved

## Adding a New Platform Adapter

Want to add support for Teams, WhatsApp, or another platform? Here's how:

### 1. Create Package Structure

```bash
mkdir -p packages/your-platform/src
cd packages/your-platform
```

### 2. Required Files

Create these files:

**package.json**:
```json
{
  "name": "@switchboard/your-platform",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "dependencies": {
    "@switchboard/core": "workspace:*",
    "your-platform-sdk": "^1.0.0"
  }
}
```

**src/types.ts**: Platform-specific types

**src/normalizers.ts**: Convert platform types to Switchboard types

**src/adapter.ts**: Implement `PlatformAdapter` interface

**src/register.ts**: Auto-registration logic

**src/index.ts**: Export everything

**README.md**: Setup guide and documentation

**tsup.config.ts**: Build configuration

### 3. Implement PlatformAdapter

```typescript
import type { PlatformAdapter, Result, UnifiedMessage } from '@switchboard/core';

export class YourPlatformAdapter implements PlatformAdapter {
  readonly name = 'your-platform-adapter';
  readonly platform = 'your-platform' as const;

  async connect(credentials: unknown): Promise<void> {
    // Implement connection logic
  }

  async disconnect(): Promise<void> {
    // Implement disconnection
  }

  isConnected(): boolean {
    // Return connection status
  }

  async sendMessage(
    channelId: string,
    text: string,
    options?: SendMessageOptions
  ): Promise<Result<UnifiedMessage>> {
    // Implement message sending
  }

  // Implement all other required methods...
}
```

### 4. Add Example

Create `examples/hello-world/your-platform.ts`

### 5. Documentation

- Write comprehensive README
- Document platform-specific limitations
- Add setup instructions with screenshots

### 6. Submit PR

Follow the [PR process](#pull-request-process) to submit your adapter!

## Documentation

### API Reference

API documentation lives in `docs/api/`. Update when:
- Adding new public APIs
- Changing function signatures
- Deprecating functionality

### Architecture Decision Records (ADRs)

For significant architectural decisions, create an ADR in `docs/adr/`:

```bash
cp docs/adr/template.md docs/adr/006-your-decision.md
```

See [docs/adr/README.md](./docs/adr/README.md) for the template.

### README Updates

Keep package READMEs up to date:
- Add new features to feature lists
- Update examples to show new functionality
- Document breaking changes

## Questions?

- **GitHub Discussions**: For questions and ideas
- **Issues**: For bugs and feature requests
- **Pull Requests**: For code contributions

Thank you for contributing to Switchboard!
