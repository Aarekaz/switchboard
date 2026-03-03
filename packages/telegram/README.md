# @aarekaz/switchboard-telegram

Telegram adapter for the [Switchboard SDK](https://github.com/Aarekaz/switchboard). Build your bot once, deploy on Telegram — or switch to any other platform with one line.

## Installation

```bash
pnpm add @aarekaz/switchboard @aarekaz/switchboard-telegram
```

## Quick Start

```typescript
import { createBot } from '@aarekaz/switchboard';
import '@aarekaz/switchboard/telegram'; // Auto-registers the adapter

const bot = createBot({
  platform: 'telegram',
  credentials: {
    token: process.env.TELEGRAM_BOT_TOKEN,
  },
});

bot.onMessage(async (message) => {
  if (message.text.includes('ping')) {
    await bot.reply(message, 'pong!');
  }
});

await bot.start();
```

## Setup

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the bot token
4. Set it as an environment variable: `TELEGRAM_BOT_TOKEN=your_token_here`

## Platform-Specific Features

Use the `telegram` option in `SendMessageOptions` for Telegram-specific features:

```typescript
await bot.sendMessage(chatId, 'Hello **world**', {
  telegram: {
    parse_mode: 'MarkdownV2',
    disable_notification: true,
    protect_content: true,
  },
});
```

### Available Options

| Option | Type | Description |
|--------|------|-------------|
| `parse_mode` | `'HTML' \| 'MarkdownV2'` | Message text formatting |
| `disable_web_page_preview` | `boolean` | Disable link previews |
| `disable_notification` | `boolean` | Send silently |
| `protect_content` | `boolean` | Prevent forwarding/saving |
| `reply_markup` | `object` | Inline keyboards, etc. |

## Known Limitations

- **`getChannels()`** returns chats the bot has seen since startup (Telegram bots cannot list all chats)
- **`getUsers(channelId)`** returns chat administrators only (Telegram has no API to list all members of large groups)
- **`getUsers()`** without a channelId returns an error (Telegram bots cannot enumerate all users)
- **`removeReaction()`** clears all bot reactions on a message, not just the specified emoji (Telegram API limitation)
- **Reactions** require the bot to be an admin and only support Telegram's allowed emoji set
- **File uploads** are not yet implemented
- **Webhook mode** is not yet supported — only long polling is available

## Connection Modes

Currently only **long polling** is supported, which requires zero infrastructure — just a bot token. Webhook support is planned for a future release.

## License

MIT
