# @switchboard/core

Core types, interfaces, and client API for Switchboard - the universal chat platform SDK.

## Installation

```bash
npm install @switchboard/core
# or
pnpm add @switchboard/core
```

## Usage

```typescript
import { createBot } from '@switchboard/core';
import '@switchboard/discord'; // Auto-registers Discord adapter

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
