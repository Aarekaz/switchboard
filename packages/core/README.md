# @aarekaz/switchboard-core

Core types, interfaces, and client API for Switchboard - the universal chat platform SDK.

## Installation

```bash
npm install @aarekaz/switchboard-core
# or
pnpm add @aarekaz/switchboard-core
```

## Usage

```typescript
import { createBot } from '@aarekaz/switchboard-core';
import '@aarekaz/switchboard-discord'; // Auto-registers Discord adapter

const bot = createBot({
  platform: 'discord',
  credentials: {
    token: process.env.DISCORD_TOKEN,
  },
});

bot.onMessage(async (message) => {
  if (message.text.includes('ping')) {
    await bot.reply(message, 'pong!');
  }
});

await bot.start();
```

## Documentation

For full documentation, visit [github.com/Aarekaz/switchboard](https://github.com/Aarekaz/switchboard)

## License

MIT
