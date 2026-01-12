# @switchboard/discord

Discord adapter for Switchboard SDK.

## Installation

```bash
npm install @switchboard/discord
# or
pnpm add @switchboard/discord
```

## Usage

```typescript
import { createBot } from '@switchboard/core';
import '@switchboard/discord'; // Auto-registers Discord adapter

const bot = await createBot({
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

## Getting a Discord Bot Token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section
4. Click "Add Bot"
5. Copy the bot token
6. Enable the "Message Content Intent" under "Privileged Gateway Intents"

## Documentation

For full documentation, visit [github.com/Aarekaz/switchboard](https://github.com/Aarekaz/switchboard)

## License

MIT
