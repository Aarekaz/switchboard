/**
 * One Line Swap Example
 *
 * This example demonstrates the "One Line Swap" guarantee:
 * Change ONLY the platform line to switch between Discord and Slack
 *
 * Run with:
 *   PLATFORM=discord pnpm tsx one-line-swap.ts
 *   PLATFORM=slack pnpm tsx one-line-swap.ts
 */

import 'dotenv/config';
import { createBot } from '@switchboard/core';
import '@switchboard/discord';
import '@switchboard/slack';

async function main() {
  // ═══════════════════════════════════════════════════════════════
  // 🎯 ONE LINE SWAP: Change ONLY this line to switch platforms
  // ═══════════════════════════════════════════════════════════════
  const platform = (process.env.PLATFORM || 'discord') as 'discord' | 'slack';
  // ═══════════════════════════════════════════════════════════════

  // Get credentials based on platform
  const credentials = platform === 'discord'
    ? { token: process.env.DISCORD_TOKEN }
    : {
        botToken: process.env.SLACK_BOT_TOKEN,
        appToken: process.env.SLACK_APP_TOKEN,
      };

  // Create bot (same API regardless of platform)
  const bot = createBot({ platform, credentials });

  console.log(`🤖 Connecting to ${platform}...`);

  // ═══════════════════════════════════════════════════════════════
  // ALL CODE BELOW IS IDENTICAL FOR BOTH PLATFORMS
  // This is the power of Switchboard!
  // ═══════════════════════════════════════════════════════════════

  bot.onMessage(async (message) => {
    console.log(`📨 [${platform}] Message from ${message.userId}: ${message.text}`);

    // Test 1: Simple reply
    if (message.text.toLowerCase().includes('ping')) {
      const result = await bot.reply(message, 'pong! 🏓');

      if (result.ok) {
        console.log(`✅ [${platform}] Replied with pong!`);
      } else {
        console.error(`❌ [${platform}] Failed to reply:`, result.error);
      }
    }

    // Test 2: Mention user
    if (message.text.toLowerCase().includes('hello')) {
      const result = await bot.reply(message, `Hello, <@${message.userId}>! 👋`);

      if (result.ok) {
        console.log(`✅ [${platform}] Sent greeting!`);
      }
    }

    // Test 3: Edit message (demonstrates MessageRef)
    if (message.text.toLowerCase().includes('edit')) {
      const sendResult = await bot.reply(message, 'Original message');

      if (sendResult.ok) {
        console.log(`✅ [${platform}] Sent message to edit`);

        // Wait a moment, then edit
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const editResult = await bot.editMessage(sendResult.value, 'Edited message! ✨');

        if (editResult.ok) {
          console.log(`✅ [${platform}] Successfully edited message`);
        } else {
          console.error(`❌ [${platform}] Failed to edit:`, editResult.error);
        }
      }
    }

    // Test 4: Add reaction (demonstrates MessageRef)
    if (message.text.toLowerCase().includes('react')) {
      const result = await bot.addReaction(message, '👍');

      if (result.ok) {
        console.log(`✅ [${platform}] Added reaction`);
      } else {
        console.error(`❌ [${platform}] Failed to add reaction:`, result.error);
      }
    }

    // Test 5: Thread reply
    if (message.text.toLowerCase().includes('thread')) {
      const result = await bot.createThread(message, 'Started a thread! 🧵');

      if (result.ok) {
        console.log(`✅ [${platform}] Created thread`);
      } else {
        console.error(`❌ [${platform}] Failed to create thread:`, result.error);
      }
    }
  });

  await bot.start();
  console.log(`✅ Bot is running on ${platform}!`);
  console.log('');
  console.log('Test commands:');
  console.log('  - "ping" → Bot replies with "pong!"');
  console.log('  - "hello" → Bot mentions you');
  console.log('  - "edit" → Bot edits its own message');
  console.log('  - "react" → Bot adds a reaction to your message');
  console.log('  - "thread" → Bot creates a thread');
  console.log('');
  console.log('Press Ctrl+C to stop.');
}

main().catch((error) => {
  console.error('Error starting bot:', error);
  process.exit(1);
});
