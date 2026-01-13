/**
 * DX Comparison Example
 *
 * This example demonstrates the improved Developer Experience (DX)
 * with the new Context API compared to the legacy approach.
 */

import 'dotenv/config';
import { createBot } from '@aarekaz/switchboard-core';
import '@aarekaz/switchboard-discord';

async function main() {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN environment variable is required');
  }

  const bot = createBot({
    platform: 'discord',
    credentials: {
      token: process.env.DISCORD_TOKEN,
    },
  });

  console.log('Connecting to Discord...');

  // ═══════════════════════════════════════════════════════════════
  // NEW CONTEXT API (RECOMMENDED)
  // ═══════════════════════════════════════════════════════════════

  bot.onMessage(async (ctx) => {
    // Access message data conveniently
    console.log(`Message from ${ctx.userId}: ${ctx.text}`);

    // Simple ping-pong
    if (ctx.text.toLowerCase().includes('ping')) {
      await ctx.reply('pong!');
    }

    // Greet users
    if (ctx.text.toLowerCase().includes('hello')) {
      await ctx.reply(`Hello, <@${ctx.userId}>!`);
    }

    // Edit message demo
    if (ctx.text.toLowerCase().includes('edit')) {
      const result = await ctx.reply('Processing...');

      if (result.ok) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Create context for the sent message and edit it
        const sentMessage = result.value;
        await bot.editMessage(sentMessage, 'Done!');
      }
    }

    // React to messages
    if (ctx.text.toLowerCase().includes('react')) {
      await ctx.react('thumbsup');
    }

    // Create threads
    if (ctx.text.toLowerCase().includes('thread')) {
      await ctx.createThread('Starting a discussion!');
    }

    // Send to same channel
    if (ctx.text.toLowerCase().includes('broadcast')) {
      await ctx.send('Broadcasting to channel!');
    }

    // Delete messages
    if (ctx.text.toLowerCase().includes('delete me')) {
      await ctx.delete();
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // COMPARISON: OLD WAY (Still supported for backwards compatibility)
  // ═══════════════════════════════════════════════════════════════

  /*
  // This still works, but is more verbose:

  bot.onMessage(async (message) => {
    console.log(`Message from ${message.userId}: ${message.text}`);

    if (message.text.toLowerCase().includes('ping')) {
      await bot.reply(message, 'pong!');
    }

    if (message.text.toLowerCase().includes('hello')) {
      await bot.reply(message, `Hello, <@${message.userId}>!`);
    }

    if (message.text.toLowerCase().includes('react')) {
      await bot.addReaction(message, 'thumbsup');
    }

    if (message.text.toLowerCase().includes('thread')) {
      await bot.createThread(message, 'Starting a discussion!');
    }

    if (message.text.toLowerCase().includes('broadcast')) {
      await bot.sendMessage(message.channelId, 'Broadcasting to channel!');
    }

    if (message.text.toLowerCase().includes('delete me')) {
      await bot.deleteMessage(message);
    }
  });
  */

  await bot.start();
  console.log('Bot is running with new Context API!');
  console.log('');
  console.log('Try these commands:');
  console.log('  - "ping" → Simple reply');
  console.log('  - "hello" → Mention you');
  console.log('  - "edit" → Edit message');
  console.log('  - "react" → Add reaction');
  console.log('  - "thread" → Create thread');
  console.log('  - "broadcast" → Send to channel');
  console.log('  - "delete me" → Delete your message');
  console.log('');
  console.log('Press Ctrl+C to stop.');
}

main().catch((error) => {
  console.error('Error starting bot:', error);
  process.exit(1);
});
