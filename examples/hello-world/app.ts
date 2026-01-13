/**
 * Unified Hello World example
 *
 * Run with PLATFORM=discord or PLATFORM=slack to switch platforms.
 */

import 'dotenv/config';

import { createBot } from '@aarekaz/switchboard';
import '@aarekaz/switchboard/discord';
import '@aarekaz/switchboard/slack';

type SupportedPlatform = 'discord' | 'slack';

type DiscordCredentials = {
  token: string;
};

type SlackCredentials = {
  botToken: string;
  appToken: string;
};

function resolvePlatform(): SupportedPlatform {
  const value = process.env.PLATFORM?.toLowerCase();
  if (value === 'discord' || value === 'slack') {
    return value;
  }
  return 'discord';
}

function getCredentials(platform: SupportedPlatform): DiscordCredentials | SlackCredentials {
  if (platform === 'discord') {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      throw new Error('DISCORD_TOKEN environment variable is required for Discord');
    }
    return { token };
  }

  const botToken = process.env.SLACK_BOT_TOKEN;
  const appToken = process.env.SLACK_APP_TOKEN;
  if (!botToken || !appToken) {
    throw new Error(
      'SLACK_BOT_TOKEN and SLACK_APP_TOKEN environment variables are required for Slack'
    );
  }

  return { botToken, appToken };
}

async function main() {
  const platform = resolvePlatform();
  const platformLabel = platform === 'discord' ? 'Discord' : 'Slack';

  const bot = createBot({
    platform,
    credentials: getCredentials(platform),
  });

  console.log(`Connecting to ${platformLabel}...`);

  bot.onMessage(async (ctx) => {
    console.log(`Message from ${ctx.userId}: ${ctx.text}`);

    if (ctx.text.toLowerCase().includes('ping')) {
      const result = await ctx.reply('pong!');

      if (result.ok) {
        console.log('Replied with pong!');
      } else {
        console.error('Failed to reply:', result.error);
      }
    }

    if (ctx.text.toLowerCase().includes('hello')) {
      const result = await ctx.reply(`Hello, <@${ctx.userId}>!`);

      if (result.ok) {
        console.log('Sent greeting!');
      }
    }

    if (ctx.text.toLowerCase().includes('react')) {
      const result = await ctx.react('thumbsup');

      if (result.ok) {
        console.log('Added reaction!');
      } else {
        console.error('Failed to add reaction:', result.error);
      }
    }
  });

  await bot.start();
  console.log(`Bot is running! Send "ping" or "hello" in ${platformLabel} to test.`);
  console.log('   Press Ctrl+C to stop.');
}

main().catch((error) => {
  console.error('Error starting bot:', error);
  process.exit(1);
});
