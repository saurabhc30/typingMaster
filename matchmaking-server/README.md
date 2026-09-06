# TypingMeter Quick Match — Cloudflare Worker + Durable Object

This folder is the ONLY backend folder that needs to be deployed to Cloudflare.

## What it does

- Keeps a temporary Quick Match queue.
- Matches two waiting players.
- Sends each browser the other player's PeerJS ID.
- Uses a SQLite-backed Durable Object.
- Uses WebSocket Hibernation so idle connections do not require a permanently running traditional server.
- Removes a player after 2 minutes if no opponent is found.
- Does NOT receive the typing passage or live typing progress.

## Deploy

1. Install Node.js.
2. Open a terminal in this folder.
3. Run:

```bash
npm install
npx wrangler login
npm run deploy
```

Wrangler will print the Worker URL, for example:

`https://typingmeter-matchmaking.<your-subdomain>.workers.dev`

For the browser WebSocket URL, change `https://` to `wss://`:

`wss://typingmeter-matchmaking.<your-subdomain>.workers.dev`

## Connect it to TypingMeter

Edit:

`../games/typing-race/matchmaking-config.js`

Set:

```js
window.TYPINGMETER_MATCHMAKING_URL = "wss://YOUR-WORKER.workers.dev";
```

Then redeploy the TypingMeter website to Vercel.

## Health check

Open the Worker URL followed by `/health` in a browser. It should return JSON similar to:

```json
{"ok":true,"service":"typingmeter-matchmaking"}
```

## Important

The Worker is matchmaking only. Private Race and Quick Match still use PeerJS for the actual player-to-player race connection.
