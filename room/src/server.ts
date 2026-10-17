import express from 'express';
import { existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import path from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import { newId, newSeed, newToken, RateLimiter, roomCode } from './ids';
import { HOST_ONLY, parseClientMessage, PLAYER_ONLY, type ClientMessage, type ServerMessage } from './protocol';
import { Room, RoomError } from './room';
import type { SnapshotStore } from './store';
import { hostView, playerView } from './views';

export interface RoomServerOptions {
  store: SnapshotStore;
  /** Built client to serve in production; omitted in development, where Vite serves it. */
  publicDir?: string;
  /** Extra origins allowed to open sockets, besides the server's own host. */
  allowedOrigins?: string[];
  /** Number of reverse proxies in front of the server, to read the client IP from X-Forwarded-For. */
  trustProxy?: number;
  /** Rooms idle this long with nobody connected are deleted. */
  roomTtlMs?: number;
  now?: () => number;
}

interface Conn {
  ws: WebSocket;
  ip: string;
  code?: string;
  kind?: 'host' | 'player';
  playerId?: string;
  windowStart: number;
  messages: number;
}

interface LiveRoom {
  room: Room;
  conns: Set<Conn>;
  saveTimer?: NodeJS.Timeout;
}

const MAX_MESSAGES_PER_SECOND = 20;
const HEARTBEAT_MS = 15_000;
const SAVE_DEBOUNCE_MS = 500;
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

export async function createRoomServer(options: RoomServerOptions) {
  const now = options.now ?? Date.now;
  const store = options.store;
  const rooms = new Map<string, LiveRoom>();
  const createLimit = new RateLimiter(10, 60_000);
  // A whole class often shares one school IP, so these stay generous.
  const joinLimit = new RateLimiter(120, 60_000);
  const lookupLimit = new RateLimiter(120, 60_000);

  for (const snapshot of await store.loadAll()) rooms.set(snapshot.code, { room: Room.restore(snapshot), conns: new Set() });

  const app = express();
  app.disable('x-powered-by');
  if (options.trustProxy) app.set('trust proxy', options.trustProxy);
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Phones need no camera: the QR is scanned with the phone's own camera app.
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
  app.use(express.json({ limit: '2kb' }));

  app.get('/healthz', (_req, res) => { res.json({ ok: true, rooms: rooms.size }); });

  app.post('/api/rooms', (req, res) => {
    if (!createLimit.allow(req.ip ?? 'unknown')) {
      res.status(429).json({ message: 'Terlalu banyak ruangan dibuat. Tunggu sebentar.' });
      return;
    }
    let code = roomCode();
    while (rooms.has(code)) code = roomCode();
    const hostToken = newToken();
    const room = Room.create({ code, hostToken, seed: newSeed(), options: { oknum: req.body?.oknum === true }, tempo: req.body?.tempo === 'santai' ? 'santai' : 'normal', now: now() });
    rooms.set(code, { room, conns: new Set() });
    void persist(code);
    res.status(201).json({ code, hostToken });
  });

  app.get('/api/rooms/:code', (req, res) => {
    if (!lookupLimit.allow(req.ip ?? 'unknown')) {
      res.status(429).json({ message: 'Terlalu banyak percobaan. Tunggu sebentar.' });
      return;
    }
    const live = rooms.get(req.params.code.toUpperCase());
    if (!live) {
      res.status(404).json({ message: 'Kode ruangan tidak ditemukan.' });
      return;
    }
    res.json({ code: live.room.code, phase: live.room.phase });
  });

  if (options.publicDir && existsSync(options.publicDir)) {
    const publicDir = options.publicDir;
    app.use(express.static(publicDir, { index: false, maxAge: '1h' }));
    app.get('/{*splat}', (_req, res) => { res.sendFile(path.join(publicDir, 'index.html')); });
  }

  const server: Server = createServer(app);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });

  server.on('upgrade', (req, socket, head) => {
    if (new URL(req.url ?? '/', 'http://x').pathname !== '/ws' || !originAllowed(req)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const conn: Conn = { ws, ip: clientIp(req), windowStart: now(), messages: 0 };
    let alive = true;
    ws.on('pong', () => { alive = true; });
    const heartbeat = setInterval(() => {
      if (!alive) { ws.terminate(); return; }
      alive = false;
      ws.ping();
    }, HEARTBEAT_MS);

    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      const t = now();
      if (t - conn.windowStart >= 1000) { conn.windowStart = t; conn.messages = 0; }
      if (++conn.messages > MAX_MESSAGES_PER_SECOND) {
        send(ws, { t: 'error', code: 'terlalu-cepat', message: 'Terlalu banyak aksi sekaligus.' });
        return;
      }
      const message = parseClientMessage(data.toString());
      if (!message) {
        send(ws, { t: 'error', code: 'pesan-salah', message: 'Pesan tidak dikenali.' });
        return;
      }
      handle(conn, message);
    });

    ws.on('close', () => {
      clearInterval(heartbeat);
      unbind(conn);
    });
  });

  function handle(conn: Conn, message: ClientMessage): void {
    try {
      if (message.t === 'host' || message.t === 'join' || message.t === 'resume') {
        const live = rooms.get(message.code);
        if (!live) {
          send(conn.ws, { t: 'error', code: 'ruangan-tidak-ada', message: 'Kode ruangan tidak ditemukan atau sudah ditutup.' });
          return;
        }
        unbind(conn);
        if (message.t === 'host') {
          if (!live.room.isHost(message.token)) {
            send(conn.ws, { t: 'error', code: 'bukan-host', message: 'Tautan host ini tidak berlaku.' });
            return;
          }
          bind(conn, live, 'host');
          send(conn.ws, { t: 'welcome', as: 'host' });
        } else {
          let player = message.t === 'resume' ? live.room.playerByToken(message.token) : undefined;
          if (message.t === 'resume' && !player) throw new RoomError('token-salah');
          if (message.t === 'join') {
            if (!joinLimit.allow(conn.ip)) {
              send(conn.ws, { t: 'error', code: 'terlalu-cepat', message: 'Terlalu banyak percobaan masuk. Tunggu sebentar.' });
              return;
            }
            player = live.room.join(message.nickname, { id: newId(), token: newToken() }, now());
          }
          bind(conn, live, 'player', player!.id);
          send(conn.ws, { t: 'welcome', as: 'player', playerId: player!.id, token: player!.token });
        }
        changed(live, message.t === 'join');
        return;
      }

      const live = conn.code ? rooms.get(conn.code) : undefined;
      if (!live || (HOST_ONLY.has(message.t) && conn.kind !== 'host')) {
        send(conn.ws, { t: 'error', code: 'bukan-host', message: 'Hanya fasilitator yang bisa melakukan ini.' });
        return;
      }
      if (PLAYER_ONLY.has(message.t) && !conn.playerId) {
        send(conn.ws, { t: 'error', code: 'pesan-salah', message: 'Masuk sebagai pemain dulu.' });
        return;
      }
      const room = live.room;
      const before = `${room.phase}/${room.step}`;
      const t = now();
      const playerId = conn.playerId!;
      switch (message.t) {
        case 'assign': room.assign(message.mode, newSeed(), t); break;
        case 'move': room.move(message.playerId, message.role, t); break;
        case 'kick':
          room.kick(message.playerId, t);
          for (const other of live.conns) {
            if (other.playerId === message.playerId) {
              send(other.ws, { t: 'kicked' });
              other.playerId = undefined;
              other.ws.close(4000, 'kicked');
            }
          }
          break;
        case 'startBriefing': room.startBriefing(t); break;
        case 'next': room.next(t); break;
        case 'pause': room.pause(t); break;
        case 'resume-clock': room.resume(t); break;
        case 'addTime': room.addTime(t); break;
        case 'tempo': room.setTempo(message.tempo, t); break;
        case 'hostDecide': room.hostDecide(message.role, message.decision, t); break;
        case 'hostFinal': room.hostFinal(message.role, message.vote, t); break;
        case 'propose': room.propose(playerId, message.decision, t); break;
        case 'lock': room.lock(playerId, message.decision, t); break;
        case 'pactPropose': room.proposePact(playerId, message.to, message.fromTerm, message.toTerm, newId(), t); break;
        case 'pactRespond': room.respondPact(playerId, message.pactId, message.accept, t); break;
        case 'final': room.submitFinal(playerId, message.vote, t); break;
      }
      changed(live, `${room.phase}/${room.step}` !== before);
    } catch (error) {
      if (!(error instanceof RoomError)) throw error;
      send(conn.ws, { t: 'error', code: error.code, message: error.message });
    }
  }

  function bind(conn: Conn, live: LiveRoom, kind: 'host' | 'player', playerId?: string): void {
    conn.code = live.room.code;
    conn.kind = kind;
    conn.playerId = playerId;
    live.conns.add(conn);
    if (playerId) live.room.connect(playerId);
  }

  function unbind(conn: Conn): void {
    const live = conn.code ? rooms.get(conn.code) : undefined;
    if (!live) return;
    live.conns.delete(conn);
    if (conn.playerId) {
      live.room.disconnect(conn.playerId);
      broadcast(live);
    }
    conn.code = conn.kind = conn.playerId = undefined;
  }

  /** Broadcasts fresh views and saves: right away on a phase change or join, debounced otherwise. */
  function changed(live: LiveRoom, saveNow: boolean): void {
    broadcast(live);
    clearTimeout(live.saveTimer);
    if (saveNow) void persist(live.room.code);
    else live.saveTimer = setTimeout(() => void persist(live.room.code), SAVE_DEBOUNCE_MS);
  }

  function broadcast(live: LiveRoom): void {
    const t = now();
    const host = hostView(live.room);
    for (const conn of live.conns) {
      if (conn.kind === 'host') send(conn.ws, { t: 'host-state', now: t, view: host });
      else if (conn.playerId) send(conn.ws, { t: 'player-state', now: t, view: playerView(live.room, conn.playerId) });
    }
  }

  async function persist(code: string): Promise<void> {
    const live = rooms.get(code);
    if (!live) return;
    try {
      await store.save(live.room.snapshot());
    } catch (error) {
      console.error(`[room ${code}] snapshot gagal disimpan`, error);
    }
  }

  const ticker = setInterval(() => {
    const t = now();
    for (const live of rooms.values()) if (live.room.tick(t)) changed(live, true);
  }, 1000);

  const sweeper = setInterval(() => {
    const t = now();
    for (const [code, live] of rooms) {
      if (!live.conns.size && t - live.room.updatedAt > (options.roomTtlMs ?? DEFAULT_TTL_MS)) {
        rooms.delete(code);
        void store.remove(code);
      }
    }
  }, 10 * 60 * 1000);

  function originAllowed(req: IncomingMessage): boolean {
    const origin = req.headers.origin;
    if (!origin) return true; // non-browser clients; browsers always send Origin on WebSocket
    let host: string;
    try {
      host = new URL(origin).host;
    } catch {
      return false;
    }
    if (host === req.headers.host) return true;
    if (options.allowedOrigins?.includes(origin)) return true;
    return process.env.NODE_ENV !== 'production' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  }

  function clientIp(req: IncomingMessage): string {
    const hops = options.trustProxy ?? 0;
    const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',').map(s => s.trim()).filter(Boolean);
    return (hops && forwarded.length >= hops ? forwarded[forwarded.length - hops] : req.socket.remoteAddress) ?? 'unknown';
  }

  return {
    server,
    rooms,
    async close(): Promise<void> {
      clearInterval(ticker);
      clearInterval(sweeper);
      for (const live of rooms.values()) {
        clearTimeout(live.saveTimer);
        await persist(live.room.code);
        for (const conn of live.conns) conn.ws.terminate();
      }
      wss.close();
      await new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}
