import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import type { ServerMessage } from '../src/protocol';
import { createRoomServer } from '../src/server';
import { MemoryStore } from '../src/store';

// End to end over real sockets: a host and six phones join, get teams, and survive refreshes.

type Msg = ServerMessage;

class Client {
  private queue: Msg[] = [];
  private waiters: { match: (m: Msg) => boolean; resolve: (m: Msg) => void }[] = [];
  readonly ws: WebSocket;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = event => {
      const message = JSON.parse(String(event.data)) as Msg;
      const waiter = this.waiters.find(w => w.match(message));
      if (waiter) {
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        waiter.resolve(message);
      } else {
        this.queue.push(message);
      }
    };
  }

  opened(): Promise<void> {
    return new Promise(resolve => this.ws.addEventListener('open', () => resolve(), { once: true }));
  }

  send(message: object): void {
    this.ws.send(JSON.stringify(message));
  }

  /** Resolves with the next message that matches, including one already received. */
  next<T extends Msg['t']>(t: T, where: (m: Extract<Msg, { t: T }>) => boolean = () => true): Promise<Extract<Msg, { t: T }>> {
    const match = (m: Msg) => m.t === t && where(m as Extract<Msg, { t: T }>);
    const index = this.queue.findIndex(match);
    if (index >= 0) return Promise.resolve(this.queue.splice(index, 1)[0] as Extract<Msg, { t: T }>);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${t}`)), 3000);
      this.waiters.push({ match, resolve: m => { clearTimeout(timer); resolve(m as Extract<Msg, { t: T }>); } });
    });
  }

  /** How many messages of a kind arrived and were not taken by next(). */
  pending(t: Msg['t']): number {
    return this.queue.filter(m => m.t === t).length;
  }

  close(): void {
    this.ws.close();
  }
}

async function start(store = new MemoryStore()) {
  const room = await createRoomServer({ store });
  await new Promise<void>(resolve => room.server.listen(0, '127.0.0.1', resolve));
  const { port } = room.server.address() as AddressInfo;
  return { ...room, store, http: `http://127.0.0.1:${port}`, ws: `ws://127.0.0.1:${port}/ws` };
}

async function connect(url: string): Promise<Client> {
  const client = new Client(url);
  await client.opened();
  return client;
}

test('a full join flow: create, join, assign, brief, refresh, restart', async () => {
  const srv = await start();
  const created = await fetch(`${srv.http}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"oknum":true}' });
  assert.equal(created.status, 201);
  const { code, hostToken } = (await created.json()) as { code: string; hostToken: string };
  assert.match(code, /^[A-Z]{4}$/);
  assert.equal((await fetch(`${srv.http}/api/rooms/${code.toLowerCase()}`)).status, 200);
  assert.equal((await fetch(`${srv.http}/api/rooms/AEIO`)).status, 404); // vowels are never used in codes

  const host = await connect(srv.ws);
  host.send({ t: 'host', code, token: 'wrong-token-aaaaaaaaaaaa' });
  assert.equal((await host.next('error')).code, 'bukan-host');
  host.send({ t: 'host', code, token: hostToken });
  await host.next('welcome');

  const phones: Client[] = [];
  const tokens: string[] = [];
  for (const name of ['Ani', 'Budi', 'Citra', 'Dodi', 'Eka', 'Fajar']) {
    const phone = await connect(srv.ws);
    phone.send({ t: 'join', code, nickname: name });
    const welcome = await phone.next('welcome');
    assert.equal(welcome.as, 'player');
    tokens.push((welcome as { token: string }).token);
    phones.push(phone);
  }
  await host.next('host-state', m => m.view.players.length === 6 && m.view.players.every(p => p.connected));

  // Phones cannot run facilitator actions.
  phones[0]!.send({ t: 'startBriefing' });
  assert.equal((await phones[0]!.next('error')).code, 'bukan-host');

  host.send({ t: 'assign', mode: 'acak' });
  const assigned = await host.next('host-state', m => m.view.players.length === 6 && m.view.players.every(p => p.role !== null));
  const counts = new Map<string, number>();
  for (const p of assigned.view.players) counts.set(p.role!, (counts.get(p.role!) ?? 0) + 1);
  assert.equal(counts.size, 5);

  host.send({ t: 'startBriefing' });
  await host.next('host-state', m => m.view.phase === 'briefing');
  const briefing = await phones[0]!.next('player-state', m => m.view.phase === 'briefing');
  assert.ok(briefing.view.team?.agenda?.name);

  // A phone refreshes: same player, same team.
  phones[0]!.close();
  await host.next('host-state', m => m.view.players.some(p => !p.connected));
  const refreshed = await connect(srv.ws);
  refreshed.send({ t: 'resume', code, token: tokens[0] });
  const resumed = await refreshed.next('player-state');
  assert.equal(resumed.view.me.nickname, 'Ani');
  assert.equal(resumed.view.team?.role, briefing.view.team?.role);

  // The server restarts: the room comes back from its snapshot.
  for (const client of [host, refreshed, ...phones.slice(1)]) client.close();
  await srv.close();
  const again = await start(srv.store);
  const host2 = await connect(again.ws);
  host2.send({ t: 'host', code, token: hostToken });
  const restored = await host2.next('host-state');
  assert.equal(restored.view.phase, 'briefing');
  assert.equal(restored.view.players.length, 6);
  const phone2 = await connect(again.ws);
  phone2.send({ t: 'resume', code, token: tokens[1] });
  assert.equal((await phone2.next('player-state')).view.me.nickname, 'Budi');
  host2.close();
  phone2.close();
  await again.close();
});

test('a kicked phone is told so and cannot come back with its token', async () => {
  const srv = await start();
  const { code, hostToken } = (await (await fetch(`${srv.http}/api/rooms`, { method: 'POST' })).json()) as { code: string; hostToken: string };
  const host = await connect(srv.ws);
  host.send({ t: 'host', code, token: hostToken });
  const phone = await connect(srv.ws);
  phone.send({ t: 'join', code, nickname: 'Usil' });
  const welcome = (await phone.next('welcome')) as { playerId: string; token: string };
  host.send({ t: 'kick', playerId: welcome.playerId });
  await phone.next('kicked');
  const retry = await connect(srv.ws);
  retry.send({ t: 'resume', code, token: welcome.token });
  assert.equal((await retry.next('error')).code, 'token-salah');
  host.close();
  retry.close();
  await srv.close();
});

test('sockets from a foreign origin are refused', async () => {
  const srv = await start();
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const { WebSocket: NodeWs } = await import('ws');
    const ws = new NodeWs(srv.ws, { origin: 'https://evil.example' });
    const status = await new Promise<number>(resolve => ws.on('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0)));
    assert.equal(status, 403);
  } finally {
    process.env.NODE_ENV = previous;
    await srv.close();
  }
});

test('a burst of changes goes out as one broadcast, and an unchanged view is not sent again', async () => {
  const srv = await start();
  const { code, hostToken } = (await (await fetch(`${srv.http}/api/rooms`, { method: 'POST' })).json()) as { code: string; hostToken: string };
  const host = await connect(srv.ws);
  host.send({ t: 'host', code, token: hostToken });
  await host.next('host-state');
  const phones = await Promise.all(Array.from({ length: 8 }, () => connect(srv.ws)));
  phones.forEach((phone, i) => phone.send({ t: 'join', code, nickname: `P${i}` }));
  await host.next('host-state', m => m.view.players.length === 8);
  assert.ok(host.pending('host-state') <= 2, `host got ${host.pending('host-state') + 1} states for 8 joins`);

  // A rejected action changes nothing, so nobody is sent the same view again.
  phones[0]!.send({ t: 'ready', on: true });
  assert.equal((await phones[0]!.next('error')).code, 'tanpa-tim');
  await new Promise(resolve => setTimeout(resolve, 150));
  const before = host.pending('host-state');
  host.send({ t: 'pause' }); // nothing to pause: an error, no new state
  await host.next('error');
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(host.pending('host-state'), before);

  for (const client of [host, ...phones]) client.close();
  await srv.close();
});

test('reactions go to the main screen only, are not stored, and are rate-limited per phone', async () => {
  const srv = await start();
  const { code, hostToken } = (await (await fetch(`${srv.http}/api/rooms`, { method: 'POST' })).json()) as { code: string; hostToken: string };
  const host = await connect(srv.ws);
  host.send({ t: 'host', code, token: hostToken });
  await host.next('host-state');
  const a = await connect(srv.ws);
  const b = await connect(srv.ws);
  a.send({ t: 'join', code, nickname: 'Ani' });
  b.send({ t: 'join', code, nickname: 'Budi' });
  await a.next('welcome');
  await b.next('welcome');
  await new Promise(resolve => setTimeout(resolve, 150));
  a.send({ t: 'react', kind: 'tawa' });
  a.send({ t: 'react', kind: 'marah' }); // too soon: dropped
  const got = await host.next('reaction');
  assert.equal(got.kind, 'tawa');
  await new Promise(resolve => setTimeout(resolve, 200));
  assert.equal(host.pending('reaction'), 0, 'the second reaction inside the cool-down is dropped');
  assert.equal(b.pending('reaction'), 0, 'phones never receive reactions');
  for (const client of [host, a, b]) client.close();
  await srv.close();
});
