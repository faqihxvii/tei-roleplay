import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ROLES, type Role } from '../../engine/src/types';
import { parseClientMessage } from '../src/protocol';
import { sessionReport, type SessionReport } from '../src/report';
import { FileReportStore } from '../src/reportStore';
import { ADD_TIME_MS, BRIEFING_MS, neutralDecision, Room, RoomError, STEP_MS } from '../src/room';
import { createRoomServer } from '../src/server';
import { MemoryStore } from '../src/store';
import { MAX_CLIENT_ERRORS } from '../src/telemetry';
import { hostView, playerView } from '../src/views';

const T0 = 1_000_000;
let counter = 0;
const ids = () => ({ id: `tl${++counter}xx`, token: `token-tl-${counter}-aaaaaaaaaaaaaa` });
const NAMES = ['Budi', 'Siti', 'Andi', 'Rina', 'Joko', 'Maya', 'Dewi', 'Tono', 'Lina', 'Agus'];

function room(options: { oknum: boolean; latihan?: boolean; kuis?: boolean } = { oknum: false }): Room {
  const r = Room.create({ code: 'BCDF', hostToken: 'host-token-aaaaaaaaaaaa', seed: 11, options, now: T0 });
  NAMES.forEach((name, i) => r.join(name, ids(), T0 + i));
  r.assign('seimbang', 1, T0);
  return r;
}
const jubir = (r: Room, role: Role) => r.spokesperson(role)!.id;

/** Plays to the end by skipping every phase, then votes so the game scores. */
function finish(r: Room, at: number): void {
  while (r.phase === 'tahun') r.next(at);
  for (const role of ROLES) r.submitFinal(jubir(r, role), { agendas: {}, oknum: null }, at);
}

test('each phase records its planned and real length, pauses, added time and how it ended', () => {
  const r = room();
  r.startBriefing(T0);
  r.next(T0 + 20_000); // the facilitator cuts the briefing short
  // Krisis: paused for 10 s, 30 s added, then the clock runs out.
  r.pause(T0 + 25_000);
  r.resume(T0 + 35_000);
  r.addTime(T0 + 36_000);
  const ends = r.state.phaseEndsAt!;
  assert.equal(r.tick(ends), true);
  // Rapat, lobi by the clock; pengesahan ends early when every team has locked.
  r.tick(r.state.phaseEndsAt!);
  r.tick(r.state.phaseEndsAt!);
  const lockAt = r.state.phaseEndsAt! - 1000;
  for (const role of ROLES) r.lock(jubir(r, role), neutralDecision(role), lockAt);

  const steps = r.state.telemetry.steps;
  assert.deepEqual(steps.map(s => [s.phase, s.step, s.endedBy]), [
    ['briefing', null, 'fasilitator'],
    ['tahun', 'krisis', 'waktu'],
    ['tahun', 'rapat', 'waktu'],
    ['tahun', 'lobi', 'waktu'],
    ['tahun', 'pengesahan', 'otomatis'],
  ]);
  assert.equal(steps[0]!.plannedMs, BRIEFING_MS);
  assert.equal(steps[0]!.actualMs, 20_000);
  assert.equal(steps[1]!.plannedMs, STEP_MS.krisis);
  assert.equal(steps[1]!.pausedMs, 10_000);
  assert.equal(steps[1]!.addedMs, ADD_TIME_MS);
  assert.equal(steps[1]!.actualMs, STEP_MS.krisis + 10_000 + ADD_TIME_MS - 1000 + 1000);
  assert.equal(steps[1]!.year, 1);
  const t = r.state.telemetry;
  assert.deepEqual([t.pauses, t.addTimes, t.skips], [1, 1, 1]);
  assert.equal(t.current?.step, 'pengungkapan');
});

test('the Year 0 practice is timed as year 0, and the report never mixes in its pacts', () => {
  const r = room({ oknum: false, latihan: true });
  r.startBriefing(T0);
  r.begin(true, T0);
  r.next(T0); r.next(T0); // lobi of the practice
  r.proposePact(jubir(r, 'pengusaha'), 'buruh', 'usahaTidakPhk', 'buruhTidakMogok', 'pr1', T0);
  r.respondPact(jubir(r, 'buruh'), 'pr1', true, T0);
  const during = sessionReport(r);
  assert.equal(during.pacts.length, 0, 'practice pacts belong to the throwaway country');
  r.endPractice(T0);
  const timed = r.state.telemetry.steps.filter(s => s.phase === 'tahun');
  assert.ok(timed.length >= 3 && timed.every(s => s.year === 0));
  assert.equal(sessionReport(r).practicePlayed, true);
});

test('the survey opens at Penutup, takes each player once, and is summarised without names', () => {
  const r = room();
  r.startBriefing(T0);
  r.begin(false, T0);
  finish(r, T0);
  const [a, b, c] = r.state.players;
  assert.equal(r.surveyOpenFor(a!.id), false);
  assert.throws(() => r.submitSurvey(a!.id, { seru: 5, jelas: 4, belajar: 4 }, null, T0), (e: RoomError) => e.code === 'fase-salah');
  r.setDebrief({ section: 'penutup' }, T0);
  assert.equal(playerView(r, a!.id).mySurvey!.open, true);
  assert.throws(() => r.submitSurvey(a!.id, { seru: 6, jelas: 4, belajar: 4 }, null, T0), (e: RoomError) => e.code === 'keputusan-salah');
  r.submitSurvey(a!.id, { seru: 5, jelas: 4, belajar: 3 }, '  Lobi paling seru,\u0007 tapi waktunya kurang  ', T0);
  r.submitSurvey(b!.id, { seru: 4, jelas: 2, belajar: 4 }, '', T0);
  r.submitSurvey(c!.id, { seru: 3, jelas: 3, belajar: 5 }, null, T0);
  assert.throws(() => r.submitSurvey(a!.id, { seru: 1, jelas: 1, belajar: 1 }, null, T0), (e: RoomError) => e.code === 'fase-salah');
  assert.deepEqual(playerView(r, a!.id).mySurvey, { ...playerView(r, a!.id).mySurvey!, open: false, done: true });

  const host = hostView(r).survey!;
  assert.equal(host.n, 3);
  assert.equal(host.eligible, NAMES.length);
  assert.deepEqual(host.means, { seru: 4, jelas: 3, belajar: 4 });
  assert.deepEqual(host.dist.seru, [0, 0, 1, 1, 1]);
  assert.deepEqual(host.comments, ['Lobi paling seru, tapi waktunya kurang']);
});

test('the session report carries no nicknames, player ids or tokens; comments only for the facilitator', () => {
  const r = room({ oknum: true, kuis: true });
  r.submitQuiz(r.state.players[0]!.id, 'pra', [1, 2, 0, 3, 1], T0);
  r.startBriefing(T0);
  r.begin(false, T0);
  r.next(T0); r.next(T0); // lobi
  r.proposePact(jubir(r, 'pengusaha'), 'buruh', 'usahaTidakPhk', 'buruhTidakMogok', 'p1', T0);
  r.respondPact(jubir(r, 'buruh'), 'p1', true, T0);
  finish(r, T0);
  r.setDebrief({ section: 'penutup' }, T0);
  r.submitSurvey(r.state.players[0]!.id, { seru: 5, jelas: 5, belajar: 5 }, 'Seru', T0);

  const report = sessionReport(r);
  const text = JSON.stringify(report);
  for (const p of r.state.players) {
    assert.ok(!text.includes(p.nickname), `nickname ${p.nickname} leaked`);
    assert.ok(!text.includes(p.id), 'player id leaked');
    assert.ok(!text.includes(p.token), 'token leaked');
  }
  assert.ok(!text.includes('host-token'));
  assert.equal(report.comments, undefined);
  assert.deepEqual(sessionReport(r, { includeComments: true }).comments, ['Seru']);

  assert.equal(report.players, NAMES.length);
  assert.equal(report.years.length, r.state.game!.log.length);
  assert.ok(report.years.every(y => ROLES.every(role => y.decisions[role] && !('role' in y.decisions[role]))));
  assert.equal(report.pacts.length, 1);
  assert.equal(report.measures.teamsWithPact, 0.4);
  assert.equal(report.measures.fun, 5);
  assert.ok(report.outcome && report.outcome.teams.length === 5);
  assert.equal(report.quiz?.praDone, 1);
  assert.equal(report.phase, 'selesai');
});

test('rejected actions, reconnects and browser errors are counted, with error text capped', () => {
  const r = room();
  r.noteError('fase-salah');
  r.noteError('fase-salah');
  r.noteError('bukan-jubir');
  r.noteReconnect('player');
  r.noteReconnect('host');
  r.noteClientError('phone', 'TypeError: x is undefined\n    at Phone (/assets/index.js:1:2)');
  r.noteClientError('phone', 'TypeError: x is undefined\n    at elsewhere');
  for (let i = 0; i < 40; i++) r.noteClientError('host', `Error ${i}`);
  const t = r.state.telemetry;
  assert.deepEqual(t.errors, { 'fase-salah': 2, 'bukan-jubir': 1 });
  assert.equal(t.reconnects, 1);
  assert.equal(t.hostReconnects, 1);
  assert.equal(t.clientErrors.length, MAX_CLIENT_ERRORS);
  assert.deepEqual(t.clientErrors[0], { where: 'phone', message: 'TypeError: x is undefined', count: 2 });
});

test('survey and client-error messages are parsed strictly', () => {
  assert.deepEqual(parseClientMessage(JSON.stringify({ t: 'survey', answers: { seru: 4, jelas: 5, belajar: 3 }, comment: null })),
    { t: 'survey', answers: { seru: 4, jelas: 5, belajar: 3 }, comment: null });
  assert.equal(parseClientMessage(JSON.stringify({ t: 'survey', answers: { seru: 4, jelas: 5 }, comment: null })), null);
  assert.equal(parseClientMessage(JSON.stringify({ t: 'survey', answers: { seru: 4, jelas: 5, belajar: 3, extra: 1 }, comment: null })), null);
  assert.equal(parseClientMessage(JSON.stringify({ t: 'survey', answers: { seru: 0, jelas: 5, belajar: 3 }, comment: null })), null);
  assert.equal(parseClientMessage(JSON.stringify({ t: 'survey', answers: { seru: 4, jelas: 5, belajar: 3 }, comment: 'x'.repeat(1000) })), null);
  assert.deepEqual(parseClientMessage(JSON.stringify({ t: 'clientError', message: 'boom' })), { t: 'clientError', message: 'boom' });
  assert.equal(parseClientMessage(JSON.stringify({ t: 'clientError', message: 42 })), null);
});

test('old snapshots without telemetry or survey still restore', () => {
  const r = room();
  const old = r.snapshot() as unknown as Record<string, unknown>;
  delete old.telemetry;
  delete old.survey;
  delete old.surveyOpen;
  const restored = Room.restore(old as never);
  restored.startBriefing(T0);
  assert.equal(restored.state.telemetry.current?.phase, 'briefing');
  assert.deepEqual(restored.state.survey, {});
});

test('the server saves reports, posts them to a webhook, and serves them only with the token', async () => {
  const received: SessionReport[] = [];
  const hook = createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => { received.push(JSON.parse(body) as SessionReport); res.end('ok'); });
  });
  await new Promise<void>(resolve => hook.listen(0, '127.0.0.1', resolve));
  const hookUrl = `http://127.0.0.1:${(hook.address() as AddressInfo).port}/`;

  const dir = mkdtempSync(path.join(tmpdir(), 'tei-reports-'));
  const reports = new FileReportStore(dir);
  const app = await createRoomServer({ store: new MemoryStore(), reports: { store: reports, webhookUrl: hookUrl, token: 'rahasia-tim-tei-1234', webhookEveryMs: 0 } });
  await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  try {
    const { code, hostToken } = await (await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json() as { code: string; hostToken: string };
    const live = app.rooms.get(code)!;
    assert.ok(hostToken);
    for (const name of NAMES.slice(0, 5)) live.room.join(name, ids(), T0);
    live.room.startBriefing(T0);
    live.room.begin(false, T0);
    finish(live.room, T0);
    // Persist the way the server does after a change.
    await (app as unknown as { close(): Promise<void> }).close();
    await new Promise(resolve => setTimeout(resolve, 200));

    const saved = await reports.list();
    assert.equal(saved.length, 1);
    assert.equal(saved[0]!.phase, 'selesai');
    assert.ok(received.length >= 1, 'webhook received the finished session');
    assert.equal(received.at(-1)!.id, saved[0]!.id);
    assert.ok(!JSON.stringify(saved[0]).includes('Budi'));
  } finally {
    hook.close();
  }

  // The download endpoint: hidden without the right token.
  const app2 = await createRoomServer({ store: new MemoryStore(), reports: { store: reports, token: 'rahasia-tim-tei-1234' } });
  await new Promise<void>(resolve => app2.server.listen(0, '127.0.0.1', resolve));
  const base2 = `http://127.0.0.1:${(app2.server.address() as AddressInfo).port}`;
  try {
    assert.equal((await fetch(`${base2}/api/telemetry`)).status, 404);
    assert.equal((await fetch(`${base2}/api/telemetry`, { headers: { authorization: 'Bearer salah' } })).status, 404);
    const ok = await fetch(`${base2}/api/telemetry`, { headers: { authorization: 'Bearer rahasia-tim-tei-1234' } });
    assert.equal(ok.status, 200);
    assert.equal(((await ok.json()) as SessionReport[]).length, 1);
  } finally {
    await app2.close();
  }
});

test('closing the server posts the last report of every played session, even mid-game and inside the throttle', async () => {
  const received: SessionReport[] = [];
  const hook = createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => { received.push(JSON.parse(body) as SessionReport); res.end('ok'); });
  });
  await new Promise<void>(resolve => hook.listen(0, '127.0.0.1', resolve));
  const hookUrl = `http://127.0.0.1:${(hook.address() as AddressInfo).port}/`;
  const app = await createRoomServer({ store: new MemoryStore(), reports: { webhookUrl: hookUrl, webhookEveryMs: 60 * 60 * 1000 } });
  try {
    const playing = room();
    playing.startBriefing(T0);
    playing.begin(false, T0);
    const waiting = Room.create({ code: 'BCDG', hostToken: 'host-token-bbbbbbbbbbbb', seed: 3, options: { oknum: false }, now: T0 });
    app.rooms.set(playing.code, { room: playing, conns: new Set(), lastPosted: Date.now() });
    app.rooms.set(waiting.code, { room: waiting, conns: new Set() });
    await app.close();
    // Awaited by close(): no waiting needed.
    assert.equal(received.length, 1, 'only the played session, and only once');
    assert.equal(received[0]!.phase, 'tahun');
  } finally {
    hook.close();
  }
});
