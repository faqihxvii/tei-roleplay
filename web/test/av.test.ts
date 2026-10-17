import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ROLE_COLOR, ROLE_INK } from '../../engine/src/content/roles';
import { ROLES, type Role } from '../../engine/src/types';
import { neutralDecision, Room } from '../../room/src/room';
import { hostView, playerView, type HostView } from '../../room/src/views';
import { endExpression } from '../src/art';
import { CUE_IDS, CUES } from '../src/audio/cues';
import { cuesFor, musicFor, revealCue } from '../src/audio/derive';
import { BUZZ, buzzFor } from '../src/haptics';

const T0 = 1_000_000;
let counter = 0;
const ids = () => ({ id: `av${++counter}xx`, token: `token-av-${counter}-aaaaaaaaaaaaaa` });

function room(): Room {
  const r = Room.create({ code: 'BCDF', hostToken: 'host-token-aaaaaaaaaaaa', seed: 7, options: { oknum: false }, now: T0 });
  for (const name of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) r.join(name, ids(), T0);
  r.assign('seimbang', 1, T0);
  return r;
}
const jubir = (r: Room, role: Role) => r.spokesperson(role)!.id;

/** Steps the room and collects every cue the main screen would play along the way. */
function recorder(r: Room) {
  let prev: HostView | null = hostView(r);
  const heard: string[] = [];
  return {
    heard,
    step(action: () => void) {
      action();
      const next = hostView(r);
      heard.push(...cuesFor(prev, next));
      prev = next;
    },
  };
}

test('the first view of a session is silent; joining and the briefing make their sounds', () => {
  const r = Room.create({ code: 'BCDF', hostToken: 'host-token-aaaaaaaaaaaa', seed: 7, options: { oknum: false }, now: T0 });
  assert.deepEqual(cuesFor(null, hostView(r)), []);
  const rec = recorder(r);
  rec.step(() => r.join('Budi', ids(), T0));
  rec.step(() => r.startBriefing(T0));
  assert.deepEqual(rec.heard, ['gabung', 'briefing']);
});

test('a year sounds like a newsroom: phase cues, one stamp per team, pacts, pause and resume', () => {
  const r = room();
  const rec = recorder(r);
  rec.step(() => r.startBriefing(T0));
  rec.step(() => r.next(T0)); // krisis
  rec.step(() => r.next(T0)); // rapat
  rec.step(() => r.next(T0)); // lobi
  rec.step(() => r.proposePact(jubir(r, 'pengusaha'), 'buruh', 'usahaTidakPhk', 'buruhTidakMogok', 'p1', T0));
  assert.ok(!rec.heard.includes('pakta.sepakat'), 'an offer is private until accepted');
  rec.step(() => r.respondPact(jubir(r, 'buruh'), 'p1', true, T0));
  rec.step(() => r.next(T0)); // pengesahan
  rec.step(() => r.pause(T0));
  rec.step(() => r.resume(T0 + 5000));
  for (const role of ROLES.slice(0, 3)) rec.step(() => r.lock(jubir(r, role), neutralDecision(role), T0));
  assert.deepEqual(rec.heard, [
    'briefing', 'fase.krisis', 'fase.rapat', 'fase.lobi', 'pakta.sepakat', 'fase.pengesahan', 'jeda', 'lanjut', 'sah', 'sah', 'sah',
  ]);
  // The next phase does not replay the stamps.
  rec.heard.length = 0;
  rec.step(() => r.next(T0));
  assert.deepEqual(rec.heard, ['fase.pengungkapan']);
});

test('the paced reveal plays cards, then causes by direction, then pacts, then the verdict', () => {
  const r = room();
  r.startBriefing(T0);
  r.next(T0); r.next(T0); r.next(T0); // lobi
  r.proposePact(jubir(r, 'pengusaha'), 'buruh', 'usahaTahanHarga', 'buruhUpahModerat', 'p1', T0);
  r.respondPact(jubir(r, 'buruh'), 'p1', true, T0);
  r.next(T0); // pengesahan
  r.lock(jubir(r, 'pengusaha'), { role: 'pengusaha', cardId: null, hargaNaik: true }, T0); // breaks the pact
  r.next(T0);
  const reveal = hostView(r).reveal!;
  const total = reveal.teams.length + reveal.groups.length + reveal.pacts.length + 1;
  const all = Array.from({ length: total }, (_, i) => revealCue(reveal, i + 1)).flat();
  assert.deepEqual(revealCue(reveal, 0), []);
  assert.deepEqual(all.slice(0, 5), ['kartu.buka', 'kartu.buka', 'kartu.buka', 'kartu.buka', 'kartu.buka']);
  assert.ok(all.slice(5, 5 + reveal.groups.length).every(c => c === 'sebab.baik' || c === 'sebab.buruk'));
  assert.equal(all[5 + reveal.groups.length], 'pakta.robek');
});

test('music follows Keresahan, ducks under reading moments, and goes quiet for the debrief', () => {
  const r = room();
  assert.deepEqual(musicFor(hostView(r)), { mood: 'tenang', duck: false });
  r.startBriefing(T0);
  r.next(T0);
  const krisis = hostView(r);
  assert.equal(musicFor(krisis).duck, true);
  r.next(T0);
  const rapat = hostView(r);
  const calm = { ...rapat, stats: { ...rapat.stats!, keresahan: 3 } };
  assert.deepEqual(musicFor(calm), { mood: 'tenang', duck: false });
  assert.equal(musicFor({ ...rapat, stats: { ...rapat.stats!, keresahan: 5 } }).mood, 'tegang');
  assert.equal(musicFor({ ...rapat, stats: { ...rapat.stats!, keresahan: 8 } }).mood, 'krisis');
  assert.equal(musicFor({ ...calm, stats: { ...calm.stats!, kas: 0 } }).mood, 'krisis', 'an indicator in the collapse zone');
  assert.equal(musicFor({ ...calm, pausedMs: 1000 }).duck, true);
  assert.deepEqual(musicFor({ ...calm, phase: 'selesai' }), { mood: null, duck: false });
});

test('phones buzz on every phase change, with distinct patterns when the player must act', () => {
  const r = room();
  r.startBriefing(T0);
  r.next(T0); // krisis
  const spokes = jubir(r, 'buruh');
  const member = r.members('buruh').find(p => p.id !== spokes)!.id;
  let prevSpokes = playerView(r, spokes);
  let prevMember = playerView(r, member);
  const advance = (action: () => void) => {
    action();
    const a = playerView(r, spokes);
    const b = playerView(r, member);
    const out = [buzzFor(prevSpokes, a), buzzFor(prevMember, b)];
    prevSpokes = a;
    prevMember = b;
    return out;
  };
  assert.deepEqual(advance(() => r.next(T0)), [BUZZ.giliran, BUZZ.giliran]); // rapat
  assert.deepEqual(advance(() => r.next(T0)), [BUZZ.jubir, BUZZ.fase]); // lobi
  assert.deepEqual(advance(() => r.proposePact(jubir(r, 'pengusaha'), 'buruh', 'usahaTidakPhk', 'buruhTidakMogok', 'p1', T0)), [BUZZ.tawaran, null]);
  assert.deepEqual(advance(() => r.next(T0)), [BUZZ.jubir, BUZZ.fase]); // pengesahan
  assert.deepEqual(advance(() => r.lock(spokes, neutralDecision('buruh'), T0)), [null, BUZZ.sah]);
});

test('every cue has a trigger, a recording brief and a visual equivalent', () => {
  for (const id of CUE_IDS) {
    const cue = CUES[id];
    assert.ok(cue.trigger && cue.sound && cue.visual, id);
    assert.ok(cue.gain > 0 && cue.gain <= 1, id);
  }
});

test('the sound designer brief lists every cue in the code', () => {
  const brief = readFileSync(new URL('../../docs/art-audio.md', import.meta.url), 'utf8');
  for (const id of CUE_IDS) assert.ok(brief.includes(`| \`${id}\` | ${CUES[id].trigger} | ${CUES[id].sound} |`), `docs/art-audio.md: cue ${id} missing or out of date`);
});

test('the delivered audio and art manifests only name known cues and moods', () => {
  const audio = JSON.parse(readFileSync(new URL('../public/audio/manifest.json', import.meta.url), 'utf8')) as { sfx: Record<string, unknown>; music: Record<string, unknown> };
  for (const id of Object.keys(audio.sfx)) assert.ok(CUE_IDS.includes(id as never), `unknown cue ${id}`);
  for (const mood of Object.keys(audio.music)) assert.ok(['tenang', 'tegang', 'krisis'].includes(mood), `unknown mood ${mood}`);
  const art = JSON.parse(readFileSync(new URL('../public/art/manifest.json', import.meta.url), 'utf8')) as Record<string, unknown>;
  assert.deepEqual(Object.keys(art).sort(), ['crisis', 'diorama', 'peran']);
});

// WCAG relative luminance, for the role palette.
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

test('role marks stay readable: text on every role colour is at least 4.5:1', () => {
  for (const role of ROLES) assert.ok(contrast(ROLE_COLOR[role], ROLE_INK[role]) >= 4.5, `${role} ${contrast(ROLE_COLOR[role], ROLE_INK[role]).toFixed(2)}`);
});

test('role colours differ in lightness, so they stay apart without hue', () => {
  const l = ROLES.map(role => luminance(ROLE_COLOR[role])).sort((a, b) => a - b);
  // At least three clearly different lightness bands across the five roles.
  const bands = new Set(l.map(v => (v < 0.05 ? 0 : v < 0.2 ? 1 : 2)));
  assert.equal(bands.size, 3);
});

test('caricatures on the results screen: panic on collapse, pleased at the top, angry when the agenda failed', () => {
  assert.equal(endExpression({ score: 9, achieved: true }, true, 9), 'panik');
  assert.equal(endExpression({ score: 9, achieved: false }, false, 9), 'senang');
  assert.equal(endExpression({ score: 4, achieved: false }, false, 9), 'marah');
  assert.equal(endExpression({ score: 6, achieved: true }, false, 9), 'tenang');
});
