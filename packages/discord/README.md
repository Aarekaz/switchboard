# @switchboard/discord

Discord adapter for Switchboard SDK.

## Installation

```bash
npm install @switchboard/core @switchboard/discord
# or
pnpm add @switchboard/core @switchboard/discord
```

## Usage

Simply import the Discord adapter and it will auto-register with Switchboard core:

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
    await bot.reply(message, 'pong! 🏓');
  }
});

await bot.start();
```

## Getting a Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" → "Add Bot"
4. Copy the token
5. Enable "Message Content Intent" under "Privileged Gateway Intents"

## Inviting Your Bot

1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`
3. Select permissions: `Send Messages`, `Read Message History`, `Add Reactions`
4. Copy the generated URL and open it in your browser
5. Select a server and authorize

## Discord-Specific Features

You can use Discord-specific features by passing platform-specific options:

```typescript
import { EmbedBuilder } from 'discord.js';

await bot.sendMessage('channel-id', 'Check out this embed!', {
  discord: {
    embeds: [
      new EmbedBuilder()
        .setTitle('Hello!')
        .setDescription('This is a Discord embed')
        .setColor(0x0099ff),
    ],
  },
});
```

## Known Limitations

- **Message editing/deletion**: Requires implementing message caching (coming in Phase 5)
- **Reactions**: Requires implementing message caching (coming in Phase 5)
- **Threads**: Requires implementing message caching (coming in Phase 5)

These features will be fully supported once we implement the message cache system.

## Documentation

For full documentation, visit [github.com/Aarekaz/switchboard](https://github.com/Aarekaz/switchboard)

## License

MIT
