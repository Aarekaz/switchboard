# Hello World Example

A simple bot that responds to "ping" with "pong".

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Get a Discord bot token:
   - Go to https://discord.com/developers/applications
   - Create a new application
   - Go to "Bot" → "Add Bot"
   - Copy the token and paste it in `.env`
   - Enable "Message Content Intent"

3. Invite the bot to your server:
   - Go to "OAuth2" → "URL Generator"
   - Select scopes: `bot`
   - Select permissions: `Send Messages`, `Read Message History`
   - Copy the generated URL and open it in your browser

4. Run the example:
   ```bash
   pnpm dev
   ```

## Usage

Send a message containing "ping" in any channel where the bot is present, and it will reply with "pong! 🏓"

**Note:** This example will be functional once we implement the Discord adapter in Phase 2.
