import assert from 'node:assert/strict';
import test from 'node:test';
import { ROLES } from '../../engine/src/types';
import { parseClientMessage } from '../src/protocol';
import { BRIEFING_MS, cleanNickname, MAX_PLAYERS, Room, RoomError } from '../src/room';

const T0 = 1_000_000;
let counter = 0;
const ids = () => ({ id: `id${++counter}xx`, token: `token-${counter}-aaaaaaaaaaaaaaaa` });

function roomWith(names: string[], options = { oknum: false }): Room {
  const room = Room.create({ code: 'BCDF', hostToken: 'host-token-aaaaaaaaaaaa', seed: 99, options, now: T0 });
  names.forEach((name, i) => room.join(name, ids(), T0 + i));
  return room;
}

const sizes = (room: Room) => ROLES.map(role => room.members(role).length);

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
  const [a, b] = room.hostView().players;
  room.move(a!.id, 'buruh', T0);
  room.move(b!.id, 'buruh', T0);
  room.assign('seimbang', 1, T0);
  assert.deepEqual(sizes(room).sort(), [1, 1, 1, 2, 2]);
  assert.equal(room.hostView().players[0]!.role, 'buruh'); // the earliest joiner stays put
});

test('starting the briefing seats everyone and hands empty teams to the facilitator', () => {
  const room = roomWith(['A', 'B', 'C']);
  room.startBriefing(T0);
  const view = room.hostView();
  assert.equal(view.phase, 'briefing');
  assert.ok(view.players.every(p => p.role));
  assert.deepEqual(view.offlineRoles, ['buruh', 'masyarakat']);
  assert.equal(view.phaseEndsAt, T0 + BRIEFING_MS);
});

test('a phone sees only its own team agenda, and the host screen sees none', () => {
  const room = roomWith(['A', 'B', 'C', 'D', 'E', 'F']);
  room.startBriefing(T0);
  const host = JSON.stringify(room.hostView());
  for (const player of room.hostView().players) {
    const view = room.playerView(player.id);
    assert.equal(view.team!.role, player.role);
    assert.ok(view.team!.agenda!.name);
    assert.ok(!host.includes(view.team!.agenda!.description));
  }
});

test('agendas stay hidden in the lobby', () => {
  const room = roomWith(['A']);
  room.assign('seimbang', 1, T0);
  assert.equal(room.playerView(room.hostView().players[0]!.id).team!.agenda, null);
});

test('latecomers join the smallest team and take it off facilitator control', () => {
  const room = roomWith(['A', 'B', 'C', 'D']);
  room.startBriefing(T0);
  assert.deepEqual(room.hostView().offlineRoles, ['masyarakat']);
  const late = room.join('Telat', ids(), T0 + 5000);
  assert.equal(late.role, 'masyarakat');
  assert.deepEqual(room.hostView().offlineRoles, []);
});

test('the spokesperson is the earliest joiner in year one', () => {
  const room = roomWith(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  room.assign('seimbang', 1, T0);
  for (const role of ROLES) assert.equal(room.spokesperson(role)!.id, room.members(role)[0]!.id);
});

test('a player resumes by token, and a kicked player cannot', () => {
  const room = roomWith([]);
  const player = room.join('Budi', ids(), T0);
  assert.equal(room.playerByToken(player.token)!.id, player.id);
  room.kick(player.id, T0);
  assert.equal(room.playerByToken(player.token), undefined);
});

test('the briefing timer starts year one on its own, and extra time pushes it back', () => {
  const room = roomWith(['A']);
  room.startBriefing(T0);
  room.addTime(T0 + 1000);
  assert.equal(room.tick(T0 + BRIEFING_MS), false);
  assert.equal(room.tick(T0 + BRIEFING_MS + 30_000), true);
  assert.equal(room.phase, 'tahun');
});

test('a restored room keeps its game and players but counts nobody as connected', () => {
  const room = roomWith(['A', 'B'], { oknum: true });
  room.connect(room.hostView().players[0]!.id);
  room.startBriefing(T0);
  const restored = Room.restore(JSON.parse(JSON.stringify(room.snapshot())));
  assert.deepEqual(restored.snapshot().game, room.snapshot().game);
  assert.ok(restored.hostView().players.every(p => !p.connected));
});

test('only well-formed client messages get through', () => {
  assert.deepEqual(parseClientMessage('{"t":"join","code":" bcdf ","nickname":"Ani"}'), { t: 'join', code: 'BCDF', nickname: 'Ani' });
  assert.equal(parseClientMessage('{"t":"join","code":"BC","nickname":"Ani"}'), null);
  assert.equal(parseClientMessage('{"t":"move","playerId":"abcd","role":"presiden"}'), null);
  assert.equal(parseClientMessage('{"t":"assign","mode":"acak","extra":1}')?.t, 'assign');
  assert.equal(parseClientMessage('[1,2]'), null);
  assert.equal(parseClientMessage('not json'), null);
});
