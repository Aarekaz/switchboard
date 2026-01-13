import 'dotenv/config';
import { createBot } from '@switchboard/core';
import '@switchboard/slack';

async function main() {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN) {
    throw new Error(
      'SLACK_BOT_TOKEN and SLACK_APP_TOKEN environment variables are required'
    );
  }

  const bot = createBot({
    platform: 'slack',
    credentials: {
      botToken: process.env.SLACK_BOT_TOKEN,
      appToken: process.env.SLACK_APP_TOKEN,
    },
  });

  console.log('🤖 Connecting to Slack...');

  bot.onMessage(async (message) => {
    console.log(`📨 Message from ${message.userId}: ${message.text}`);

    if (message.text.toLowerCase().includes('ping')) {
      const result = await bot.reply(message, 'pong! 🏓');

      if (result.ok) {
        console.log('✅ Replied with pong!');
      } else {
        console.error('❌ Failed to reply:', result.error);
      }
    }

    if (message.text.toLowerCase().includes('hello')) {
      const result = await bot.reply(message, `Hello, <@${message.userId}>! 👋`);

      if (result.ok) {
        console.log('✅ Sent greeting!');
      }
    }
  });

  await bot.start();
  console.log('✅ Bot is running! Send "ping" or "hello" in Slack to test.');
  console.log('   Press Ctrl+C to stop.');
}

main().catch((error) => {
  console.error('Error starting bot:', error);
  process.exit(1);
});
