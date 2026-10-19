import assert from 'node:assert/strict';
import test from 'node:test';
import { canPlay } from '../../engine/src/game';
import { ROLES, type Decision, type Role } from '../../engine/src/types';
import { parseClientMessage } from '../src/protocol';
import { cleanNickname, MAX_PLAYERS, neutralDecision, Room, RoomError, STEP_MS } from '../src/room';
import { hostView, playerView } from '../src/views';

const T0 = 1_000_000;
let counter = 0;
const ids = () => ({ id: `id${++counter}xx`, token: `token-${counter}-aaaaaaaaaaaaaaaa` });

function roomWith(names: string[], options = { oknum: false }): Room {
  const room = Room.create({ code: 'BCDF', hostToken: 'host-token-aaaaaaaaaaaa', seed: 99, options, now: T0 });
  names.forEach((name, i) => room.join(name, ids(), T0 + i));
  return room;
}

const sizes = (room: Room) => ROLES.map(role => room.members(role).length);
const players = (room: Room) => hostView(room).players;

/** Ten players, two per team, briefed and at the start of year 1's Rapat Tim. */
function inRapat(options = { oknum: false }): Room {
  const room = roomWith(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], options);
  room.assign('seimbang', 1, T0);
  room.startBriefing(T0);
  room.next(T0); // krisis
  room.next(T0); // rapat
  return room;
}

const spokesperson = (room: Room, role: Role) => room.spokesperson(role)!.id;

test('nicknames are cleaned and must be unique regardless of case', () => {
  assert.equal(cleanNickname('  Budi \n  Santoso\u0007 '), 'Budi Santoso');
  assert.equal(cleanNickname('   '), null);
  assert.equal(cleanNickname('x'.repeat(40))!.length, 16);
  const room = roomWith(['Budi']);
  assert.throws(() => room.join('budi', ids(), T0), (e: RoomError) => e.code === 'nama-dipakai');
  assert.throws(() => room.join(' ', ids(), T0), (e: RoomError) => e.code === 'nama-kosong');
});

test('a room holds at most forty players', () => {
  const room = roomWith(Array.from({ length: MAX_PLAYERS }, (_, i) => `P${i}`));
  assert.throws(() => room.join('Satu lagi', ids(), T0), (e: RoomError) => e.code === 'ruangan-penuh');
});

test('random assignment deals everyone into teams that differ by at most one', () => {
  const room = roomWith(Array.from({ length: 23 }, (_, i) => `P${i}`));
  room.assign('acak', 1, T0);
  const s = sizes(room);
  assert.equal(s.reduce((a, b) => a + b), 23);
  assert.ok(Math.max(...s) - Math.min(...s) <= 1);
});

test('balanced assignment keeps manual placements and fills the gaps', () => {
  const room = roomWith(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  const [a, b] = players(room);
  room.move(a!.id, 'buruh', T0);
  room.move(b!.id, 'buruh', T0);
  room.assign('seimbang', 1, T0);
  assert.deepEqual(sizes(room).sort(), [1, 1, 1, 2, 2]);
  assert.equal(players(room)[0]!.role, 'buruh');
});

test('starting the briefing seats everyone and hands empty teams to the facilitator', () => {
  const room = roomWith(['A', 'B', 'C']);
  room.startBriefing(T0);
  const view = hostView(room);
  assert.equal(view.phase, 'briefing');
  assert.ok(view.players.every(p => p.role));
  assert.deepEqual(view.offlineRoles, ['buruh', 'masyarakat']);
  assert.equal(view.phaseEndsAt, null); // the facilitator moves the briefing on
});

test('the host screen never receives agendas, hands or private resources', () => {
  const room = inRapat();
  const host = hostView(room);
  const { console: _console, ...projected } = host;
  const text = JSON.stringify(projected);
  for (const role of ROLES) {
    const phone = playerView(room, spokesperson(room, role));
    assert.ok(phone.team!.agenda!.name);
    assert.ok(!text.includes(phone.team!.agenda!.description));
    for (const card of phone.decision!.hand) assert.ok(!text.includes(card.name));
  }
  for (const stat of ['modal', 'solidaritas', 'kredibilitas', 'tabungan']) assert.ok(!(stat in host.stats!));
});

test('a phone sees only its own team, its own resource and no exact card numbers', () => {
  const room = inRapat();
  const view = playerView(room, spokesperson(room, 'pengusaha'));
  assert.equal(view.team!.resource!.stat, 'modal');
  assert.equal(view.decision!.role, 'pengusaha');
  assert.ok(view.decision!.hand.every(card => card.effects.every(e => /^[▲▼]+$/.test(e.arrows))));
  assert.equal(playerView(room, spokesperson(room, 'pemerintah')).team!.resource, null);
});

test('latecomers join the smallest team and take it off facilitator control', () => {
  const room = roomWith(['A', 'B', 'C', 'D']);
  room.startBriefing(T0);
  assert.deepEqual(hostView(room).offlineRoles, ['masyarakat']);
  const late = room.join('Telat', ids(), T0 + 5000);
  assert.equal(late.role, 'masyarakat');
  assert.deepEqual(hostView(room).offlineRoles, []);
});

test('a player resumes by token, and a kicked player cannot', () => {
  const room = roomWith([]);
  const player = room.join('Budi', ids(), T0);
  assert.equal(room.playerByToken(player.token)!.id, player.id);
  room.kick(player.id, T0);
  assert.equal(room.playerByToken(player.token), undefined);
});

test('only Rapat, Lobi and Pengesahan run on a clock, and Santai stretches them by half', () => {
  const room = roomWith(['A']);
  room.setTempo('santai', T0);
  room.startBriefing(T0);
  assert.equal(room.state.phaseEndsAt, null);
  assert.equal(room.tick(T0 + 60 * 60_000), false);
  let t = T0;
  room.next(t);
  const clocks: [string, number | null][] = [];
  for (let i = 0; i < 6; i++) {
    const endsAt = room.state.phaseEndsAt;
    clocks.push([room.step!, endsAt === null ? null : endsAt - t]);
    if (endsAt === null) room.next(t);
    else room.tick((t = endsAt));
  }
  assert.deepEqual(clocks, [
    ['krisis', null], ['rapat', STEP_MS.rapat! * 1.5], ['lobi', STEP_MS.lobi! * 1.5],
    ['pengesahan', STEP_MS.pengesahan! * 1.5], ['pengungkapan', null], ['koran', null],
  ]);
  assert.equal(room.step, 'krisis');
  assert.equal(room.year, 2);
});

test('every spokesperson saying done ends Rapat and Lobi early; offline and sealed teams count as done', () => {
  const room = inRapat();
  const member = room.members('buruh').find(p => p.id !== spokesperson(room, 'buruh'))!;
  assert.throws(() => room.setReady(member.id, true, T0), (e: RoomError) => e.code === 'bukan-jubir');
  assert.equal(room.setReady(spokesperson(room, 'buruh'), true, T0), false);
  assert.equal(hostView(room).teams.find(t => t.role === 'buruh')!.ready, true);
  assert.equal(room.setReady(spokesperson(room, 'buruh'), false, T0), false);
  assert.equal(hostView(room).teams.find(t => t.role === 'buruh')!.ready, false);
  room.hostDecide('pemerintah', neutralDecision('pemerintah'), T0); // sealed early: counts as done
  for (const role of ['bankSentral', 'pengusaha', 'buruh'] as const) assert.equal(room.setReady(spokesperson(room, role), true, T0), false);
  assert.equal(room.hostReady('masyarakat', true, T0), true);
  assert.equal(room.step, 'lobi');
  assert.ok(hostView(room).teams.every(t => t.ready === !!room.state.locked[t.role]), 'the flags reset in the next step');
  for (const role of ['bankSentral', 'pengusaha', 'buruh', 'masyarakat'] as const) room.setReady(spokesperson(room, role), true, T0);
  assert.equal(room.step, 'pengesahan');
  assert.throws(() => room.setReady(spokesperson(room, 'buruh'), true, T0), (e: RoomError) => e.code === 'fase-salah');
  assert.throws(() => room.hostReady('buruh', true, T0), (e: RoomError) => e.code === 'fase-salah');

  const small = roomWith(['A', 'B']);
  small.assign('seimbang', 1, T0);
  small.startBriefing(T0);
  small.next(T0);
  small.next(T0); // rapat, with three teams played by the facilitator
  const seated = ROLES.filter(r => small.members(r).length);
  small.setReady(spokesperson(small, seated[0]!), true, T0);
  assert.equal(small.setReady(spokesperson(small, seated[1]!), true, T0), true);
  assert.equal(small.step, 'lobi');
});

test('pausing freezes the clock and extra time is kept while paused', () => {
  const room = inRapat();
  const left = room.state.phaseEndsAt! - T0;
  room.pause(T0);
  room.addTime(T0);
  assert.equal(room.tick(T0 + 10 * 60_000), false);
  room.resume(T0 + 10 * 60_000);
  assert.equal(room.state.phaseEndsAt, T0 + 10 * 60_000 + left + 30_000);
});

test('an unlocked team plays what most members proposed, with ties going to the first proposal', () => {
  const room = inRapat();
  const [first, second] = room.members('pemerintah');
  const hand = room.state.game!.hands.pemerintah.filter(id => canPlay(room.state.game!, 'pemerintah', id));
  room.propose(first!.id, { role: 'pemerintah', cardId: hand[0] ?? null, pajak: 1 }, T0);
  room.propose(second!.id, { role: 'pemerintah', cardId: null, pajak: 1 }, T0);
  assert.deepEqual(room.majority('pemerintah'), { role: 'pemerintah', cardId: hand[0] ?? null, pajak: 1 });
  assert.deepEqual(room.tally('pemerintah').pajak, [{ value: 1, count: 2 }]);
  assert.deepEqual(room.majority('buruh'), neutralDecision('buruh'));
});

test('proposals are checked against the hand and powers', () => {
  const room = inRapat();
  const id = room.members('buruh')[0]!.id;
  assert.throws(() => room.propose(id, { role: 'buruh', cardId: 'gov_bansos', upah: 0, mogok: false }, T0), (e: RoomError) => e.code === 'keputusan-salah');
  assert.throws(() => room.propose(id, { role: 'pemerintah', cardId: null, pajak: 0 }, T0), (e: RoomError) => e.code === 'keputusan-salah');
  const outsider = room.join('Telat', ids(), T0);
  room.move(outsider.id, null, T0);
  assert.throws(() => room.propose(outsider.id, neutralDecision('buruh'), T0), (e: RoomError) => e.code === 'tanpa-tim');
});

test('only the spokesperson locks, only in Pengesahan, and the last lock starts the reveal', () => {
  const room = inRapat();
  const member = room.members('buruh').find(p => p.id !== spokesperson(room, 'buruh'))!;
  assert.throws(() => room.lock(spokesperson(room, 'buruh'), neutralDecision('buruh'), T0), (e: RoomError) => e.code === 'fase-salah');
  room.next(T0); // lobi
  room.next(T0); // pengesahan
  assert.throws(() => room.lock(member.id, neutralDecision('buruh'), T0), (e: RoomError) => e.code === 'bukan-jubir');
  for (const role of ROLES.slice(0, 4)) assert.equal(room.lock(spokesperson(room, role), neutralDecision(role), T0), false);
  assert.throws(() => room.propose(spokesperson(room, 'buruh'), neutralDecision('buruh'), T0), (e: RoomError) => e.code === 'sudah-dikunci');
  assert.equal(room.hostDecide('masyarakat', neutralDecision('masyarakat'), T0), true);
  assert.equal(room.step, 'pengungkapan');
  const reveal = hostView(room).reveal!;
  assert.equal(reveal.year, 1);
  assert.equal(reveal.teams.length, 5);
  assert.equal(reveal.teams.find(t => t.role === 'masyarakat')!.source, 'fasilitator');
  assert.ok(reveal.groups.every(g => g.changes.every(c => ['harga', 'kerja', 'kas', 'kepercayaan', 'keresahan'].includes(c.stat))));
});

test('pacts: offer, accept, check after the reveal, and score', () => {
  const room = inRapat();
  room.next(T0); // lobi
  const usaha = spokesperson(room, 'pengusaha');
  const buruh = spokesperson(room, 'buruh');
  assert.throws(() => room.proposePact(room.members('pengusaha').find(p => p.id !== usaha)!.id, 'buruh', 'usahaTidakPhk', 'buruhTidakMogok', 'pact1', T0), (e: RoomError) => e.code === 'bukan-jubir');
  assert.throws(() => room.proposePact(usaha, 'buruh', 'buruhTidakMogok', 'usahaTidakPhk', 'pactX', T0), (e: RoomError) => e.code === 'pakta-salah');
  room.proposePact(usaha, 'buruh', 'usahaTahanHarga', 'buruhUpahModerat', 'pact1', T0);
  room.proposePact(usaha, 'buruh', 'usahaTidakPhk', 'buruhTidakMogok', 'pact2', T0);
  room.respondPact(buruh, 'pact1', true, T0);
  assert.equal(hostView(room).pacts.length, 1); // only agreed pacts reach the public table
  assert.equal(playerView(room, buruh).pacts.length, 2);
  room.next(T0); // pengesahan: the unanswered offer expires
  assert.equal(room.state.pacts.find(p => p.id === 'pact2')!.status, 'kedaluwarsa');
  room.lock(usaha, { role: 'pengusaha', cardId: null, hargaNaik: true }, T0); // breaks "menahan harga"
  room.lock(buruh, { role: 'buruh', cardId: null, upah: 1, mogok: false }, T0);
  room.next(T0); // the rest by vote
  const pact = hostView(room).reveal!.pacts[0]!;
  assert.deepEqual(pact.result, { keptFrom: false, keptTo: true });
  assert.deepEqual(room.pactTally().pengusaha, { kept: 0, broken: 1 });
  assert.deepEqual(room.pactTally().buruh, { kept: 1, broken: 0 });
  assert.ok(room.state.years[0]!.frontPage.tags.includes('pakta_dilanggar'));
});

test('a team is limited to three live pacts per year', () => {
  const room = inRapat();
  room.next(T0);
  const usaha = spokesperson(room, 'pengusaha');
  room.proposePact(usaha, 'buruh', 'usahaTidakPhk', 'buruhTidakMogok', 'p1', T0);
  room.proposePact(usaha, 'buruh', 'usahaTahanHarga', 'buruhUpahModerat', 'p2', T0);
  room.proposePact(usaha, 'masyarakat', 'usahaTahanHarga', 'wargaTidakHemat', 'p3', T0);
  assert.throws(() => room.proposePact(usaha, 'pemerintah', 'usahaInvestasi', 'pemPajakTidakNaik', 'p4', T0), (e: RoomError) => e.code === 'pakta-penuh');
});

/** Plays every remaining year with neutral votes, skipping through each step. */
function playOut(room: Room): void {
  while (room.phase === 'tahun') room.next(T0);
}

test('a full game ends in guesses, then scores with the engine', () => {
  const room = inRapat({ oknum: true });
  playOut(room);
  assert.equal(room.phase, 'tebak');
  assert.equal(room.state.years.length, room.state.game!.log.length);
  assert.equal(room.state.phaseEndsAt, null); // guessing ends when every team is in, or on the facilitator
  const game = room.state.game!;
  const oknum = ROLES.find(r => game.agendas[r] === 'oknum')!;
  // Everyone except the Oknum names it; each guesses one agenda right.
  for (const role of ROLES) {
    const target = ROLES.find(r => r !== role && game.agendas[r] !== 'oknum')!;
    const vote = { agendas: { [target]: game.agendas[target] }, oknum: role === oknum ? ROLES.find(r => r !== role)! : oknum };
    room.submitFinal(spokesperson(room, role), vote, T0);
  }
  assert.equal(room.phase, 'selesai');
  const results = hostView(room).results!;
  assert.equal(results.oknum!.role, oknum);
  assert.equal(results.oknum!.identified, true);
  assert.equal(results.teams.find(t => t.role === oknum)!.score, 0);
  assert.ok(results.teams.filter(t => t.role !== oknum).every(t => t.correctGuesses === 1));
  assert.equal(results.headlines.length, room.state.years.length);
  assert.equal(results.timeline[0]!.year, 0);
});

test('front pages never repeat a headline variant within a session', () => {
  const room = inRapat();
  playOut(room);
  const ids = room.state.years.flatMap(y => y.frontPage.variantIds);
  assert.equal(new Set(ids).size, ids.length);
  for (const year of room.state.years) {
    assert.ok(year.frontPage.headline.length > 10);
    assert.ok(!year.frontPage.headline.includes('{'));
    assert.equal(year.frontPage.voices.length, 3);
  }
});

test('a restored room keeps its game and players but counts nobody as connected', () => {
  const room = inRapat({ oknum: true });
  room.connect(players(room)[0]!.id);
  const restored = Room.restore(JSON.parse(JSON.stringify(room.snapshot())));
  assert.deepEqual(restored.snapshot().game, room.snapshot().game);
  assert.ok(hostView(restored).players.every(p => !p.connected));
  assert.equal(restored.step, 'rapat');
});

test('only well-formed client messages get through', () => {
  assert.deepEqual(parseClientMessage('{"t":"join","code":" bcdf ","nickname":"Ani"}'), { t: 'join', code: 'BCDF', nickname: 'Ani' });
  assert.equal(parseClientMessage('{"t":"join","code":"BC","nickname":"Ani"}'), null);
  assert.equal(parseClientMessage('{"t":"move","playerId":"abcd","role":"presiden"}'), null);
  assert.equal(parseClientMessage('[1,2]'), null);
  assert.equal(parseClientMessage('not json'), null);
  const decision: Decision = { role: 'buruh', cardId: null, upah: 2, mogok: false };
  assert.deepEqual(parseClientMessage(JSON.stringify({ t: 'propose', decision: { ...decision, extra: 'x' } })), { t: 'propose', decision });
  assert.equal(parseClientMessage(JSON.stringify({ t: 'propose', decision: { ...decision, upah: 3 } })), null);
  assert.equal(parseClientMessage(JSON.stringify({ t: 'pactPropose', to: 'buruh', fromTerm: 'nope', toTerm: 'buruhTidakMogok' })), null);
});

test('the talking steps add up to seven minutes: Rapat 3, Negosiasi 3, Pengesahan 1', () => {
  assert.deepEqual(STEP_MS, { rapat: 180_000, lobi: 180_000, pengesahan: 60_000 });
});

test('a snapshot from the join-flow release still restores', () => {
  const room = roomWith(['A']);
  const old = room.snapshot() as unknown as Record<string, unknown>;
  for (const key of ['step', 'tempo', 'pausedMs', 'seq', 'proposals', 'locked', 'pacts', 'years', 'finals', 'results', 'usedVariants']) delete old[key];
  old.phase = 'lobi';
  const restored = Room.restore(old as never);
  assert.equal(restored.phase, 'gabung');
  restored.startBriefing(T0);
  restored.next(T0);
  assert.equal(restored.step, 'krisis');
});

/** A finished game where every team voted, ready for the debrief. */
function finished(): Room {
  const room = inRapat();
  const usaha = spokesperson(room, 'pengusaha');
  // Year 1: invest if possible, so year 2 has a delayed effect to trace.
  const game = room.state.game!;
  const invest = game.hands.pengusaha.find(id => id === 'ent_investasi' && canPlay(game, 'pengusaha', id));
  if (invest) room.propose(usaha, { role: 'pengusaha', cardId: invest, hargaNaik: false }, T0);
  room.propose(spokesperson(room, 'bankSentral'), { role: 'bankSentral', cardId: null, bunga: 1, tolakCetakUang: false }, T0);
  playOut(room);
  for (const role of ROLES) room.submitFinal(spokesperson(room, role), { agendas: {}, oknum: null }, T0);
  return room;
}

test('the debrief opens on the results and every chain adds up to the change it explains', () => {
  const room = finished();
  const view = hostView(room);
  assert.equal(view.debrief!.section, 'hasil');
  assert.equal(view.history!.length, room.state.game!.log.length);
  const game = room.state.game!;
  for (const log of game.log) {
    for (const stat of ['harga', 'kerja', 'kas', 'kepercayaan', 'keresahan'] as const) {
      room.setDebrief({ focus: { stat, year: log.year } }, T0);
      const chain = hostView(room).debrief!.chain!;
      const sum = chain.links.reduce((a, l) => a + l.amount, 0);
      if (!chain.clamped) assert.equal(sum, chain.to - chain.from, `${stat} tahun ${log.year}`);
    }
  }
});

test('a rate rise is traced back to the year Bank Sentral made it', () => {
  const room = finished();
  if (room.state.game!.log.length < 2) return; // collapsed in year 1: nothing delayed to trace
  room.setDebrief({ focus: { stat: 'kerja', year: 2 } }, T0);
  const link = hostView(room).debrief!.chain!.links.find(l => l.label.includes('menaikkan bunga'));
  assert.ok(link, 'delayed effect of the rate rise appears in year 2');
  assert.deepEqual(link!.origin, { year: 1, label: 'Bank Sentral menaikkan bunga', role: 'bankSentral' });
});

test('the debrief is driven by the facilitator and followed by the phones', () => {
  const room = finished();
  assert.throws(() => inRapat().setDebrief({ section: 'agenda' }, T0), (e: RoomError) => e.code === 'fase-salah');
  room.setDebrief({ section: 'agenda', agendaShown: 9, round: -3 }, T0);
  const d = playerView(room, spokesperson(room, 'buruh')).debrief!;
  assert.equal(d.section, 'agenda');
  assert.equal(d.agendaShown, 5);
  assert.equal(d.round, 0);
  assert.equal(d.agendas.length, 5);
  assert.ok(d.titles.some(t => t.title === 'Paling Berpengaruh'));
  assert.equal(d.rounds.length, 3);
  assert.ok(!('history' in playerView(room, spokesperson(room, 'buruh'))));
});

test('every crisis card has a sourced Di Dunia Nyata note', async () => {
  const { CRISIS_CARDS } = await import('../../engine/src/content/crises');
  const { REAL_WORLD } = await import('../src/content/realWorld');
  for (const card of CRISIS_CARDS) {
    const note = REAL_WORLD[card.id];
    assert.ok(note, card.id);
    assert.match(note!.url, /^https:\/\//);
    assert.ok(note!.text.split(/\s+/).length <= 50, `${card.id} is short enough to read aloud`);
  }
});

test('Year 0 practice gives the talking steps under four minutes', async () => {
  const { PRACTICE_MS } = await import('../src/room');
  assert.equal(Object.values(PRACTICE_MS).reduce((a, b) => a! + b!), 220_000);
});

/** Ten players briefed, with the practice option on. */
function briefedWithPractice(): Room {
  const room = roomWith(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], { oknum: false, latihan: true } as never);
  room.assign('seimbang', 1, T0);
  room.startBriefing(T0);
  return room;
}

test('Year 0 runs on a throwaway country and leaves the real game untouched', () => {
  const room = briefedWithPractice();
  const real = structuredClone(room.state.game!);
  room.next(T0); // the facilitator's button: practice is on
  assert.equal(room.inPractice, true);
  assert.equal(hostView(room).year, 0);
  assert.equal(hostView(room).practice, true);
  assert.equal(hostView(room).crisis!.title, 'Gosip Harga Naik Beredar di Grup Keluarga');
  assert.equal(room.state.phaseEndsAt, null); // the practice crisis waits for the facilitator

  room.next(T0); // rapat
  assert.equal(room.state.phaseEndsAt, T0 + 90_000);
  room.propose(spokesperson(room, 'pemerintah'), { role: 'pemerintah', cardId: null, pajak: 1 }, T0);
  room.next(T0); // lobi
  room.proposePact(spokesperson(room, 'pengusaha'), 'buruh', 'usahaTidakPhk', 'buruhTidakMogok', 'latihan1', T0);
  room.respondPact(spokesperson(room, 'buruh'), 'latihan1', true, T0);
  room.next(T0); // pengesahan
  room.next(T0); // pengungkapan
  assert.equal(hostView(room).reveal!.year, 0);
  room.next(T0); // koran
  assert.equal(hostView(room).frontPage!.year, 0);
  room.next(T0); // practice over: year 1 of the real game

  assert.equal(room.inPractice, false);
  assert.equal(room.step, 'krisis');
  assert.equal(hostView(room).year, 1);
  assert.deepEqual(room.state.game, real);
  assert.deepEqual(room.state.pacts, []);
  assert.deepEqual(room.state.years, []);
  assert.deepEqual(room.pactTally().pengusaha, { kept: 0, broken: 0 });
  assert.equal(room.state.phaseEndsAt, null);
});

test('the facilitator can skip the practice or end it early', () => {
  const skip = briefedWithPractice();
  skip.begin(false, T0);
  assert.equal(skip.inPractice, false);
  assert.equal(hostView(skip).year, 1);

  const early = briefedWithPractice();
  const real = structuredClone(early.state.game!);
  early.next(T0);
  early.next(T0);
  early.endPractice(T0);
  assert.equal(early.step, 'krisis');
  assert.deepEqual(early.state.game, real);
  assert.throws(() => early.endPractice(T0), (e: RoomError) => e.code === 'fase-salah');
});

test('a refresh during the practice restores it, and the practice still ends cleanly', () => {
  const room = briefedWithPractice();
  room.next(T0);
  const restored = Room.restore(JSON.parse(JSON.stringify(room.snapshot())));
  assert.equal(restored.inPractice, true);
  restored.endPractice(T0);
  assert.deepEqual(restored.state.game, room.state.practice!.game);
});

test('quiz: five questions, each with one right answer among four', async () => {
  const { QUIZ } = await import('../src/content/quiz');
  assert.equal(QUIZ.length, 5);
  for (const q of QUIZ) {
    assert.equal(q.options.length, 4);
    assert.ok(q.correct >= 0 && q.correct < 4);
    assert.equal(new Set(q.options).size, 4);
  }
  // The key is spread out, so "always pick B" scores poorly.
  assert.ok(new Set(QUIZ.map(q => q.correct)).size >= 3);
});

test('quiz: the pre quiz closes when play starts, the post quiz opens in the debrief', async () => {
  const { QUIZ } = await import('../src/content/quiz');
  const right = QUIZ.map(q => q.correct);
  const room = roomWith(['A', 'B', 'C', 'D', 'E'], { oknum: false, kuis: true } as never);
  const [a, b, c] = players(room).map(p => p.id);
  assert.equal(playerView(room, a!).myQuiz!.open, 'pra');
  assert.ok(!JSON.stringify(playerView(room, a!)).includes('"correct"'));
  room.submitQuiz(a!, 'pra', [-1, -1, -1, -1, -1], T0);
  assert.throws(() => room.submitQuiz(a!, 'pra', right, T0), (e: RoomError) => e.code === 'fase-salah'); // once only
  assert.throws(() => room.submitQuiz(b!, 'pra', [0, 0, 0], T0), (e: RoomError) => e.code === 'keputusan-salah');
  assert.throws(() => room.submitQuiz(b!, 'pra', [9, 0, 0, 0, 0], T0), (e: RoomError) => e.code === 'keputusan-salah');
  room.startBriefing(T0);
  room.submitQuiz(b!, 'pra', right, T0); // still allowed in the briefing
  room.next(T0); // year 1 begins
  assert.equal(playerView(room, c!).myQuiz!.open, null);
  assert.throws(() => room.submitQuiz(c!, 'pra', right, T0), (e: RoomError) => e.code === 'fase-salah');

  playOut(room);
  for (const role of ROLES) room.submitFinal(spokesperson(room, role), { agendas: {}, oknum: null }, T0);
  assert.equal(playerView(room, a!).myQuiz!.open, null); // not until the debrief gets there
  room.setDebrief({ section: 'kuis' }, T0);
  assert.equal(playerView(room, a!).myQuiz!.open, 'pasca');
  room.submitQuiz(a!, 'pasca', right, T0);
  room.submitQuiz(b!, 'pasca', right, T0);

  const summary = hostView(room).quiz!;
  assert.equal(summary.praDone, 2);
  assert.equal(summary.pascaDone, 2);
  assert.equal(summary.results!.praMean, 50); // one blank, one perfect
  assert.equal(summary.results!.pascaMean, 100);
  assert.equal(summary.results!.gain, 50);
  assert.ok(summary.results!.questions.every(q => q.answer === null));
  assert.deepEqual(playerView(room, a!).myQuiz!.scores, { pra: 0, pasca: 5 });
  assert.equal(playerView(room, a!).myQuiz!.review, null);

  room.setDebrief({ quizReveal: true }, T0);
  assert.ok(hostView(room).quiz!.results!.questions.every(q => q.answer));
  assert.equal(playerView(room, a!).myQuiz!.review!.length, 5);
  assert.equal(hostView(room).quizRows!.find(r => r.nickname === 'A')!.pascaScore, 5);
});

test('quiz: the section is refused when the room plays without it', () => {
  const room = finished();
  assert.throws(() => room.setDebrief({ section: 'kuis' }, T0), (e: RoomError) => e.code === 'fase-salah');
  assert.equal(hostView(room).quiz, null);
});

test('Harian TEI copy follows the GDD rules', async () => {
  const { HEADLINES, COMBO_HEADLINES, TAG_WEIGHT, ADS } = await import('../src/content/koran');
  const all: string[] = [];
  for (const tag of Object.keys(TAG_WEIGHT) as (keyof typeof HEADLINES)[]) {
    const variants = HEADLINES[tag];
    assert.ok(variants.length >= 8, `${tag} has ${variants.length} variants; the GDD asks for at least 8`);
    for (const text of variants) {
      const slots = text.match(/\{[a-z]+\}/g) ?? [];
      // Only broken-pact headlines know who to name.
      assert.ok(slots.every(s => tag === 'pakta_dilanggar' && (s === '{pelanggar}' || s === '{korban}')), `${tag}: unknown slot in "${text}"`);
      assert.ok(text.length <= 100, `too long for a front page: "${text}"`);
      all.push(text);
    }
  }
  assert.equal(new Set(all).size, all.length, 'every headline is unique');
  const pairs = COMBO_HEADLINES.map(c => [...c.tags].sort().join('+'));
  assert.equal(new Set(pairs).size, pairs.length, 'one combination headline per tag pair');
  for (const combo of COMBO_HEADLINES) assert.ok(combo.tags.every(t => t in TAG_WEIGHT));
  // No real brands or platforms (GDD, "Pedoman menulis satir").
  const banned = /whatsapp|instagram|tiktok|facebook|twitter|gojek|grab|shopee|tokopedia|indomie|pertamina|\bpln\b|\bbi\b|\bojk\b/i;
  for (const text of [...all, ...COMBO_HEADLINES.map(c => c.text), ...ADS.map(a => a.text)]) assert.ok(!banned.test(text), `real brand or institution in "${text}"`);
});

test('a session of five years can print a fresh headline every year', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const room = Room.create({ code: 'BCDF', hostToken: 'host-token-aaaaaaaaaaaa', seed, options: { oknum: false }, now: T0 });
    ['A', 'B', 'C', 'D', 'E'].forEach((n, i) => room.join(n, ids(), T0 + i));
    room.startBriefing(T0);
    playOut(room);
    const headlines = room.state.years.map(y => y.frontPage.headline);
    assert.equal(new Set(headlines).size, headlines.length, `seed ${seed}: ${headlines.join(' | ')}`);
  }
});
