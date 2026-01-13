# Switchboard (v0.3.3)

**Build chat bots once, deploy everywhere.**

Switchboard is a universal SDK for chat platforms that enables developers to build bots once and deploy them seamlessly across Slack, Teams, Discord, and Google Chat.

<img width="1176" height="1042" alt="carbon" src="https://github.com/user-attachments/assets/415332a5-b66a-4522-a816-d096c6b64aa6" />

## Installation

```bash
pnpm add @aarekaz/switchboard
```

## Quick Start

```ts
import { createBot } from '@aarekaz/switchboard';
import '@aarekaz/switchboard/discord';

const bot = createBot({
  token: process.env.DISCORD_TOKEN,
  platform: 'discord',
});
```

Swap platforms by changing one line:

```ts
import '@aarekaz/switchboard/slack';
```

## Design Philosophy that I am drilling in this SDK

**"Pit of Success"** - Make the right thing the easiest thing.

1. **Platforms are implementation details** - Your bot logic should be platform-agnostic
2. **One Line Swap** - Switching platforms should require changing exactly one line
3. **Progressive Disclosure** - Start simple (90% use cases), add power when needed (10% use cases)
4. **Type Safety as a Feature** - Full TypeScript support without manual type annotations

