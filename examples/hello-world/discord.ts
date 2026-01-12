/**
 * Hello World example for Discord
 *
 * A simple bot that responds to "ping" and "hello" messages
 */

// Load environment variables from .env file
import 'dotenv/config';

import { createBot } from '@switchboard/core';
import '@switchboard/discord';

async function main() {
  // Validate environment variable
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN environment variable is required');
  }

  // Create a Discord bot
  const bot = createBot({
    platform: 'discord',
    credentials: {
      token: process.env.DISCORD_TOKEN,
    },
  });

  console.log('🤖 Connecting to Discord...');

  // Listen for messages
  bot.onMessage(async (message) => {
    console.log(`📨 Message from ${message.userId}: ${message.text}`);

    // Respond to "ping" with "pong"
    if (message.text.toLowerCase().includes('ping')) {
      const result = await bot.reply(message, 'pong! 🏓');

      if (result.ok) {
        console.log('✅ Replied with pong!');
      } else {
        console.error('❌ Failed to reply:', result.error);
      }
    }

    // Respond to "hello" with a greeting
    if (message.text.toLowerCase().includes('hello')) {
      const result = await bot.reply(message, `Hello, <@${message.userId}>! 👋`);

      if (result.ok) {
        console.log('✅ Sent greeting!');
      }
    }
  });

  // Start the bot (connects to Discord)
  await bot.start();
  console.log('✅ Bot is running! Send "ping" or "hello" in Discord to test.');
  console.log('   Press Ctrl+C to stop.');
}

main().catch((error) => {
  console.error('Error starting bot:', error);
  process.exit(1);
});
