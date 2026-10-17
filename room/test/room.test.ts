import assert from 'node:assert/strict';
import test from 'node:test';
import { canPlay } from '../../engine/src/game';
import { ROLES, type Decision, type Role } from '../../engine/src/types';
import { parseClientMessage } from '../src/protocol';
import { BRIEFING_MS, cleanNickname, GUESS_MS, MAX_PLAYERS, neutralDecision, Room, RoomError, STEP_MS } from '../src/room';
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
  assert.equal(view.phaseEndsAt, T0 + BRIEFING_MS);
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

test('timers run each step in order, and Santai stretches them by half', () => {
  const room = roomWith(['A']);
  room.setTempo('santai', T0);
  room.startBriefing(T0);
  assert.equal(room.state.phaseEndsAt, T0 + BRIEFING_MS * 1.5);
  let t = T0 + BRIEFING_MS * 1.5;
  assert.equal(room.tick(t), true);
  const seen: string[] = [];
  for (let i = 0; i < 6; i++) {
    seen.push(room.step!);
    t = room.state.phaseEndsAt!;
    room.tick(t);
  }
  assert.deepEqual(seen, ['krisis', 'rapat', 'lobi', 'pengesahan', 'pengungkapan', 'koran']);
  assert.equal(room.step, 'krisis');
  assert.equal(room.year, 2);
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
  assert.equal(room.state.phaseEndsAt, T0 + GUESS_MS);
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

test('step durations add up to about six and a half minutes', () => {
  assert.equal(Object.values(STEP_MS).reduce((a, b) => a + b), 390_000);
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
