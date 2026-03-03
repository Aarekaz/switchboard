/**
 * Hello World example for Telegram
 *
 * A simple bot that responds to "ping" and "hello" messages
 */

// Load environment variables from .env file
import 'dotenv/config';

import { createBot } from '@aarekaz/switchboard';
import '@aarekaz/switchboard/telegram';

async function main() {
  // Validate environment variable
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
  }

  // Create a Telegram bot
  const bot = createBot({
    platform: 'telegram',
    credentials: {
      token: process.env.TELEGRAM_BOT_TOKEN,
    },
  });

  console.log('Connecting to Telegram...');

  // Listen for messages
  bot.onMessage(async (message) => {
    console.log(`Message from ${message.userId}: ${message.text}`);

    // Respond to "ping" with "pong"
    if (message.text.toLowerCase().includes('ping')) {
      const result = await bot.reply(message, 'pong!');

      if (result.ok) {
        console.log('Replied with pong!');
      } else {
        console.error('Failed to reply:', result.error);
      }
    }

    // Respond to "hello" with a greeting
    if (message.text.toLowerCase().includes('hello')) {
      const result = await bot.reply(
        message,
        `Hello! Welcome to Switchboard on Telegram.`
      );

      if (result.ok) {
        console.log('Sent greeting!');
      }
    }
  });

  // Start the bot (connects to Telegram via long polling)
  await bot.start();
  console.log('Bot is running! Send "ping" or "hello" in Telegram to test.');
  console.log('   Press Ctrl+C to stop.');
}

main().catch((error) => {
  console.error('Error starting bot:', error);
  process.exit(1);
});
