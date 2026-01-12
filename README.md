# Switchboard

**Build chat bots once, deploy everywhere.**

Switchboard is a universal SDK for chat platforms that enables developers to build bots once and deploy them seamlessly across Slack, Teams, Discord, and Google Chat.

```typescript
import { createBot } from '@switchboard/core';
import '@switchboard/discord'; // Auto-registers Discord adapter

const bot = createBot({
  platform: 'discord', // Change this one line to switch platforms!
  credentials: { token: process.env.DISCORD_TOKEN },
});

bot.onMessage(async (message) => {
  if (message.text.includes('ping')) {
    await bot.reply(message, 'pong! 🏓');
  }
});

await bot.start();
```

## ✨ Features

- 🎯 **One Line Platform Swap** - Change `platform: 'discord'` to `platform: 'slack'` and everything works
- 🔒 **Type-Safe** - Full TypeScript support with intelligent type inference
- 🎨 **Progressive Disclosure** - Simple things are simple, complex things are possible
- 🚀 **Modern DX** - Inspired by Vercel AI SDK, Hono, and tRPC
- 📦 **Tree-Shakeable** - Only bundle the platforms you use

## 📦 Installation

```bash
# Install core package and desired platform adapters
pnpm add @switchboard/core @switchboard/discord

# Or use npm
npm install @switchboard/core @switchboard/discord
```

## 🚀 Quick Start

See [`examples/hello-world`](./examples/hello-world) for a working example.

## 📊 Project Status

**Phase 2 Complete!** ✅ Discord adapter is fully functional.

- ✅ **Phase 1**: Core SDK and types
- ✅ **Phase 2**: Discord adapter
- ⏳ **Phase 3**: Slack adapter (coming next)
- ⏳ **Phase 4**: Middleware system
- ⏳ **Phase 5**: Teams & Google Chat adapters

See [`spec.md`](./spec.md) for the complete technical specification.

## 📚 Documentation

- [Technical Specification](./spec.md) - Architecture and design decisions
- [Setup Guide](./SETUP.md) - Installation and development instructions
- [Discord Adapter](./packages/discord/README.md) - Discord-specific documentation

## 🎯 Design Philosophy

**"Pit of Success"** - Make the right thing the easiest thing.

1. **Platforms are implementation details** - Your bot logic should be platform-agnostic
2. **One Line Swap** - Switching platforms should require changing exactly one line
3. **Progressive Disclosure** - Start simple (90% use cases), add power when needed (10% use cases)
4. **Type Safety as a Feature** - Full TypeScript support without manual type annotations

See the [Vision document](https://www.notion.so/2e499cb53fcb8187b523f19f376c0725) for more details.

## 🤝 Contributing

Contributions are welcome! This project is in active development.

## 📄 License

MIT

---

<img width="1176" height="1042" alt="carbon" src="https://github.com/user-attachments/assets/415332a5-b66a-4522-a816-d096c6b64aa6" />
