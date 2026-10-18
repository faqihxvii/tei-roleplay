// Load test: a host and many phones play a whole game over raw sockets, against a local build or the live site.
//   npm run loadtest -- --rooms 1 --players 40            starts dist/room.mjs locally and measures its CPU and memory
//   npm run loadtest -- --base https://play.economic.co.id --rooms 1 --players 40
// Bots think for a random moment before each action (--think-ms), like a class would. Each phone drops and
// resumes once. The report prints at the end, and is written as Markdown with --out.
import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import WebSocket from 'ws';
import type { Decision, Role } from '../../engine/src/types';
import type { ServerMessage } from '../../room/src/protocol';
import type { HostView, PlayerView } from '../../room/src/views';

const { values: args } = parseArgs({
  options: {
    base: { type: 'string' },
    rooms: { type: 'string', default: '1' },
    players: { type: 'string', default: '40' },
    'stagger-ms': { type: 'string', default: '0' },
    'think-ms': { type: 'string', default: '2500' },
    'join-gap-ms': { type: 'string', default: '150' },
    port: { type: 'string', default: '8899' },
    out: { type: 'string' },
    profile: { type: 'string' },
  },
});

const ROOMS = Number(args.rooms);
const PLAYERS = Number(args.players);
const THINK_MS = Number(args['think-ms']);
const JOIN_GAP_MS = Number(args['join-gap-ms']);
const local = !args.base;
const base = (args.base ?? `http://127.0.0.1:${args.port}`).replace(/\/$/, '');
const wsUrl = base.replace(/^http/, 'ws') + '/ws';

const latencies: number[] = [];
const errors = new Map<string, number>();
let bytesIn = 0;
let messagesIn = 0;
const think = () => sleep(THINK_MS * (0.2 + Math.random()));
const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;
const bump = (code: string) => errors.set(code, (errors.get(code) ?? 0) + 1);

class Socket {
  ws!: WebSocket;
  private sentAt: number[] = [];
  onState: (message: ServerMessage) => void = () => {};

  async open(): Promise<void> {
    this.ws = new WebSocket(wsUrl);
    this.ws.on('message', data => {
      const text = String(data);
      bytesIn += text.length;
      messagesIn++;
      const message = JSON.parse(text) as ServerMessage;
      if (message.t === 'error') bump(message.code);
      if (message.t === 'host-state' || message.t === 'player-state') {
        const t = performance.now();
        for (const sent of this.sentAt) latencies.push(t - sent);
        this.sentAt = [];
      }
      this.onState(message);
    });
    await new Promise<void>((resolve, reject) => {
      this.ws.once('open', () => resolve());
      this.ws.once('error', reject);
    });
  }

  send(message: object, timed = true): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    if (timed) this.sentAt.push(performance.now());
    this.ws.send(JSON.stringify(message));
  }

  close(): void {
    this.ws.close();
  }
}

/** One lever choice per role, staying inside what the view says is allowed this year. */
function proposal(view: PlayerView): Decision {
  const ctx = view.decision!;
  // Mostly steady hands, so the country usually survives all five years and the test runs a full game.
  const card = Math.random() < 0.15 ? ctx.hand.filter(c => c.playable).map(c => c.id) : [];
  const cardId = card.length ? pick(card) : null;
  const step = (lever: 'pajak' | 'bunga') => (ctx.frozen.includes(lever) || Math.random() < 0.7 ? 0 : pick([-1, 1] as const));
  switch (ctx.role) {
    case 'pemerintah': return { role: 'pemerintah', cardId, pajak: step('pajak') };
    case 'bankSentral': return { role: 'bankSentral', cardId, bunga: step('bunga'), tolakCetakUang: false };
    case 'pengusaha': return { role: 'pengusaha', cardId, hargaNaik: !ctx.frozen.includes('harga') && Math.random() < 0.2 };
    case 'buruh': return { role: 'buruh', cardId, upah: Math.random() < 0.7 ? 0 : pick([1, 2] as const), mogok: false };
    case 'masyarakat': return { role: 'masyarakat', cardId, konsumsi: Math.random() < 0.7 ? 'biasa' : pick(ctx.canBelanja ? ['hemat', 'belanja'] as const : ['hemat'] as const), viral: null };
  }
}

async function phone(code: string, nickname: string, done: Promise<void>): Promise<void> {
  const socket = new Socket();
  let token = '';
  let view: PlayerView | null = null;
  const acted = new Set<string>();
  let dropped = false;

  const act = async (key: string, fn: (v: PlayerView) => void) => {
    if (acted.has(key)) return;
    acted.add(key);
    await think();
    if (view) fn(view);
  };

  const react = (v: PlayerView) => {
    const year = `${v.year}${v.practice ? 'p' : ''}`;
    if (v.phase === 'tahun' && v.step === 'krisis' && v.year === 2 && !dropped) {
      dropped = true;
      void reconnect();
      return;
    }
    if (v.phase === 'tahun' && v.decision && !v.decision.locked) {
      if (v.step === 'rapat') {
        void act(`propose-${year}`, cur => cur.decision && socket.send({ t: 'propose', decision: proposal(cur) }));
        if (v.me.isSpokesperson && v.decision.myProposal) void act(`ready-rapat-${year}`, () => socket.send({ t: 'ready', on: true }));
      }
      if (v.step === 'lobi' && v.me.isSpokesperson && v.lobby) {
        const me = v.me.role!;
        void act(`pact-${year}`, cur => {
          const to = pick((Object.keys(cur.lobby?.terms ?? {}) as Role[]).filter(r => r !== me));
          const fromTerm = cur.lobby?.terms[me]?.[0]?.id;
          const toTerm = cur.lobby?.terms[to]?.[0]?.id;
          if (fromTerm && toTerm) socket.send({ t: 'pactPropose', to, fromTerm, toTerm });
        });
        for (const pact of v.pacts) {
          if (pact.to === me && pact.status === 'diajukan') void act(`respond-${pact.id}`, () => socket.send({ t: 'pactRespond', pactId: pact.id, accept: Math.random() < 0.6 }));
        }
        void act(`ready-lobi-${year}`, () => socket.send({ t: 'ready', on: true }));
      }
      if (v.step === 'pengesahan' && v.me.isSpokesperson) void act(`lock-${year}`, cur => cur.decision && socket.send({ t: 'lock', decision: cur.decision.majority }));
    }
    if (v.phase === 'tebak' && v.me.isSpokesperson && v.final && !v.final.mine) {
      void act('final', cur => {
        const agendas: Record<string, string> = {};
        for (const [role, options] of Object.entries(cur.final?.options ?? {})) if (role !== cur.me.role && options[0]) agendas[role] = options[0].id;
        socket.send({ t: 'final', vote: { agendas, oknum: null } });
      });
    }
  };

  const bindHandlers = () => {
    socket.onState = message => {
      if (message.t === 'welcome' && message.as === 'player') token = message.token;
      if (message.t === 'player-state') {
        view = message.view;
        react(view);
      }
    };
  };

  const reconnect = async () => {
    socket.close();
    await sleep(500 + Math.random() * 1500);
    await socket.open();
    bindHandlers();
    socket.send({ t: 'resume', code, token });
  };

  await socket.open();
  bindHandlers();
  socket.send({ t: 'join', code, nickname });
  await done;
  socket.close();
}

async function room(index: number): Promise<{ code: string; ms: number; ending: string }> {
  await sleep(index * Number(args['stagger-ms']));
  const started = performance.now();
  const created = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ oknum: true, tempo: 'normal' }) });
  if (created.status !== 201) throw new Error(`room ${index}: create failed ${created.status} ${await created.text()}`);
  const { code, hostToken } = (await created.json()) as { code: string; hostToken: string };

  const host = new Socket();
  await host.open();
  let finish!: () => void;
  const done = new Promise<void>(resolve => { finish = resolve; });
  let ending = '';
  let lastKey = '';
  host.onState = message => {
    if (message.t !== 'host-state') return;
    const v: HostView = message.view;
    const key = `${v.phase}/${v.year}/${v.step}/${v.practice}`;
    if (v.phase === 'selesai') {
      ending = v.results?.ending ?? '?';
      finish();
      return;
    }
    if (key === lastKey) return;
    lastKey = key;
    // Untimed steps wait for the facilitator, who reads them out first.
    const untimed = v.phase === 'briefing' || (v.phase === 'tahun' && (v.step === 'krisis' || v.step === 'pengungkapan' || v.step === 'koran'));
    if (untimed) void sleep(THINK_MS).then(() => host.send({ t: 'next' }));
  };
  host.send({ t: 'host', code, token: hostToken }, false);

  const phones: Promise<void>[] = [];
  for (let i = 0; i < PLAYERS; i++) {
    phones.push(phone(code, `B${index}-${i}`, done));
    await sleep(JOIN_GAP_MS);
  }
  await sleep(1000);
  host.send({ t: 'assign', mode: 'seimbang' });
  await sleep(500);
  host.send({ t: 'startBriefing' });
  await Promise.race([done, sleep(30 * 60_000).then(() => { throw new Error(`room ${code}: no finish in 30 min`); })]);
  host.close();
  await Promise.all(phones);
  return { code, ms: performance.now() - started, ending };
}

// ---------- server sampling ----------

interface Sample { t: number; cpuMs: number; rssMb: number }
const samples: Sample[] = [];
let server: ChildProcess | null = null;
const TICK_HZ = 100;

function readProc(pid: number): { cpuMs: number; rssMb: number } {
  const stat = readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1]!.split(' ');
  const cpuMs = ((Number(stat[11]) + Number(stat[12])) / TICK_HZ) * 1000;
  const rss = /VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${pid}/status`, 'utf8'));
  return { cpuMs, rssMb: rss ? Number(rss[1]) / 1024 : 0 };
}

async function startLocal(): Promise<void> {
  const profile = args.profile ? ['--cpu-prof', `--cpu-prof-dir=${args.profile}`] : [];
  server = spawn('node', [...profile, 'dist/room.mjs'], {
    env: { ...process.env, NODE_ENV: 'production', PORT: args.port, ROOM_DATA_DIR: '/tmp/tei-loadtest/rooms', TELEMETRY_DIR: '/tmp/tei-loadtest/telemetry', RATE_LIMIT_SCALE: '20' },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${base}/healthz`)).ok) return;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('local server did not start');
}

function sampleLoop(): () => void {
  const timer = setInterval(async () => {
    if (server?.pid) samples.push({ t: performance.now(), ...readProc(server.pid) });
    else {
      try {
        const health = (await (await fetch(`${base}/healthz`)).json()) as { rssMb?: number };
        if (health.rssMb) samples.push({ t: performance.now(), cpuMs: NaN, rssMb: health.rssMb });
      } catch { bump('healthz-gagal'); }
    }
  }, 1000);
  return () => clearInterval(timer);
}

const pct = (list: number[], p: number) => {
  if (!list.length) return 0;
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
};

async function main(): Promise<void> {
  if (local) await startLocal();
  const stop = sampleLoop();
  const t0 = performance.now();
  let results: { code: string; ms: number; ending: string }[] = [];
  let failure: unknown = null;
  try {
    results = await Promise.all(Array.from({ length: ROOMS }, (_, i) => room(i)));
  } catch (error) {
    failure = error;
  }
  const wall = (performance.now() - t0) / 1000;
  stop();
  server?.kill('SIGTERM');

  // CPU: the busiest 10 s window and the whole-run mean, as a share of one core (Render free: 0.1).
  const cpu = samples.filter(s => !Number.isNaN(s.cpuMs));
  let peak = 0;
  for (let i = 0; i < cpu.length; i++) {
    const j = cpu.findIndex(s => s.t >= cpu[i]!.t + 10_000);
    if (j < 0) break;
    peak = Math.max(peak, (cpu[j]!.cpuMs - cpu[i]!.cpuMs) / (cpu[j]!.t - cpu[i]!.t));
  }
  const mean = cpu.length > 1 ? (cpu.at(-1)!.cpuMs - cpu[0]!.cpuMs) / (cpu.at(-1)!.t - cpu[0]!.t) : NaN;
  const rss = samples.map(s => s.rssMb);
  const lines = [
    `## ${local ? 'Lokal' : base} · ${ROOMS} ruangan × ${PLAYERS} HP · jeda pikir ${THINK_MS} ms`,
    '',
    `- Selesai: ${results.length}/${ROOMS} ruangan, ${wall.toFixed(0)} dtk${failure ? ` · **gagal:** ${String(failure)}` : ''}`,
    `- Ending: ${results.map(r => `${r.code} ${r.ending}`).join(', ') || '-'}`,
    `- Latensi aksi → tampilan baru: p50 ${pct(latencies, 50).toFixed(0)} ms · p95 ${pct(latencies, 95).toFixed(0)} ms · maks ${pct(latencies, 100).toFixed(0)} ms (${latencies.length} aksi)`,
    `- Data ke semua klien: ${(bytesIn / 1024 / 1024).toFixed(1)} MB, ${messagesIn} pesan, rata-rata ${(bytesIn / 1024 / wall).toFixed(0)} KB/dtk`,
    Number.isNaN(mean) ? '- CPU server: tidak terukur dari luar' : `- CPU server: rata-rata ${(mean * 100).toFixed(1)}% satu inti · puncak 10 dtk ${(peak * 100).toFixed(1)}% (Render free: 10%)`,
    rss.length ? `- Memori server (RSS): maks ${Math.max(...rss).toFixed(0)} MB (Render free: 512 MB)` : '- Memori server: tidak terukur',
    `- Error dari server: ${errors.size ? [...errors].map(([k, n]) => `${k} ×${n}`).join(', ') : 'tidak ada'}`,
    '',
  ];
  const report = lines.join('\n');
  console.log(report);
  if (args.out) writeFileSync(args.out, report);
  process.exit(failure ? 1 : 0);
}

await main();
