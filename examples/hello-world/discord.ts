/**
 * Hello World example for Discord
 *
 * This example will be functional once we implement the Discord adapter in Phase 2
 */

import { createBot } from '@switchboard/core';
import '@switchboard/discord';

async function main() {
  // Create a Discord bot
  const bot = await createBot({
    platform: 'discord',
    credentials: {
      token: process.env.DISCORD_TOKEN,
    },
  });

  console.log('Bot connected to Discord!');

  // Listen for messages
  bot.onMessage(async (message) => {
    console.log(`Received message: ${message.text}`);

    // Respond to "ping" with "pong"
    if (message.text.toLowerCase().includes('ping')) {
      const result = await bot.reply(message, 'pong! 🏓');

      if (result.ok) {
        console.log('Replied with pong!');
      } else {
        console.error('Failed to reply:', result.error);
      }
    }

    // Respond to "hello" with a greeting
    if (message.text.toLowerCase().includes('hello')) {
      await bot.reply(message, `Hello, <@${message.userId}>! 👋`);
    }
  });

  // Start the bot
  await bot.start();
  console.log('Bot is running. Press Ctrl+C to stop.');
}

main().catch((error) => {
  console.error('Error starting bot:', error);
  process.exit(1);
});
