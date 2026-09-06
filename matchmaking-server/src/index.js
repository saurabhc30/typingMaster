import { DurableObject } from "cloudflare:workers";

const QUEUE_NAME = "global";
const MAX_WAIT_MS = 120_000;
const ALARM_MS = 30_000;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

function json(payload) { return JSON.stringify(payload); }
function safeName(name) { return String(name || "Player").replace(/\s+/g, " ").trim().slice(0, 20) || "Player"; }
function safeCount(value) { const n = Number(value); return Number.isFinite(n) ? Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Math.floor(n))) : MIN_PLAYERS; }
function send(ws, payload) { try { if (ws.readyState === WebSocket.OPEN) { ws.send(json(payload)); return true; } } catch (_) { } return false; }

export default {
  async fetch(request, env) {
    if (request.method === "GET" && new URL(request.url).pathname === "/health") return Response.json({ ok: true, service: "typingmeter-matchmaking" });
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response("TypingMeter Quick Match server is running.", { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
    const id = env.MATCHMAKER.idFromName(QUEUE_NAME);
    return env.MATCHMAKER.get(id).fetch(request);
  }
};

export class Matchmaker extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.ctx = ctx; }

  async fetch(request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response("WebSocket endpoint", { status: 426 });
    const pair = new WebSocketPair(), client = pair[0], server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ status: "connected", peerId: "", name: "Player", playerCount: MIN_PLAYERS, queuedAt: 0 });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    let data;
    try { data = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message)); }
    catch (_) { send(ws, { type: "error", message: "Invalid matchmaking message." }); return; }

    if (data.type === "ping") { send(ws, { type: "pong" }); return; }
    if (data.type === "cancel") { this.resetSocket(ws); send(ws, { type: "cancelled" }); return; }
    if (data.type !== "queue") return;

    const peerId = String(data.peerId || "").trim();
    if (!peerId || peerId.length > 100) { send(ws, { type: "error", message: "Invalid player connection." }); return; }
    const name = safeName(data.name), playerCount = safeCount(data.playerCount), now = Date.now();
    const current = ws.deserializeAttachment() || {};
    if (current.status === "queued") { send(ws, { type: "queued", count: this.countQueued(playerCount), playerCount }); return; }

    this.cleanupQueue(now);

    // Put the current player into the exact-size queue first. Then evaluate
    // the whole queue. This is important for 3–10 player Quick Match: the
    // third player must trigger a 3-player match instead of waiting for a
    // fourth connection.
    ws.serializeAttachment({ status: "queued", peerId, name, playerCount, queuedAt: now });
    const matched = this.tryMatch(playerCount);
    if (!matched) {
      send(ws, { type: "queued", count: this.countQueued(playerCount), playerCount });
      await this.ensureAlarm();
    }
  }

  webSocketClose(ws) { try { ws.close(); } catch (_) { } }
  webSocketError(ws) { try { ws.close(); } catch (_) { } }

  tryMatch(playerCount) {
    const group = this.ctx.getWebSockets()
      .filter(ws => {
        if (ws.readyState !== WebSocket.OPEN) return false;
        const d = ws.deserializeAttachment() || {};
        return d.status === "queued" && !!d.peerId && d.playerCount === playerCount;
      })
      .sort((a, b) => {
        const da = a.deserializeAttachment() || {};
        const db = b.deserializeAttachment() || {};
        return (Number(da.queuedAt) || 0) - (Number(db.queuedAt) || 0);
      })
      .slice(0, playerCount);

    if (group.length < playerCount) return false;

    const host = group[0];
    const hostData = host.deserializeAttachment() || {};
    const hostPeerId = String(hostData.peerId || "").trim();
    if (!hostPeerId) return false;

    const matchId = crypto.randomUUID();
    const peerIds = group.map(socket => String((socket.deserializeAttachment() || {}).peerId || "").trim());

    // Reserve every socket before sending any notification.
    for (const socket of group) {
      const d = socket.deserializeAttachment() || {};
      socket.serializeAttachment({
        status: "matched",
        peerId: d.peerId,
        name: d.name,
        playerCount,
        queuedAt: 0,
        hostPeerId,
        matchId
      });
    }

    group.forEach((socket, index) => {
      const d = socket.deserializeAttachment() || {};
      const ok = send(socket, {
        type: "match",
        role: index === 0 ? "host" : "guest",
        hostPeerId,
        peerId: d.peerId,
        playerCount,
        name: d.name,
        matchId,
        peerIds
      });
      if (!ok) {
        try { socket.close(1011, "Match connection failed"); } catch (_) { }
      }
    });
    return true;
  }
  resetSocket(ws) { ws.serializeAttachment({ status: "connected", peerId: "", name: "Player", playerCount: MIN_PLAYERS, queuedAt: 0 }); }
  countQueued(playerCount) { return this.ctx.getWebSockets().filter(ws => { const d = ws.deserializeAttachment(); return d?.status === "queued" && d.playerCount === playerCount; }).length; }
  cleanupQueue(now) {
    for (const ws of this.ctx.getWebSockets()) {
      const d = ws.deserializeAttachment();
      if (!d || d.status !== "queued") continue;
      if (!d.queuedAt || now - d.queuedAt > MAX_WAIT_MS) {
        send(ws, { type: "error", code: "MATCH_TIMEOUT", message: "No full match found within 2 minutes. Please try Quick Match again." });
        try { ws.close(1000, "Queue timeout"); } catch (_) { }
      }
    }
  }
  async ensureAlarm() { const existing = await this.ctx.storage.getAlarm(); if (existing == null) await this.ctx.storage.setAlarm(Date.now() + ALARM_MS) }
  async alarm() { const now = Date.now(); this.cleanupQueue(now); if (this.ctx.getWebSockets().some(ws => ws.deserializeAttachment()?.status === "queued")) await this.ctx.storage.setAlarm(Date.now() + ALARM_MS) }
}
