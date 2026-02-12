import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    discord: 'src/discord.ts',
    slack: 'src/slack.ts',
    telegram: 'src/telegram.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  tsconfig: 'tsconfig.build.json',
  external: [
    '@aarekaz/switchboard-core',
    '@aarekaz/switchboard-discord',
    '@aarekaz/switchboard-slack',
    '@aarekaz/switchboard-telegram',
  ],
});
