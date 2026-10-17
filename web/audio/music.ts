import type { Mood } from '../src/audio/cues';
import { db, filter, gain, mix, reverb, rng, rms, samples, silence, type Mono, type Rng } from './dsp';
import { bonang, brass, dung, murmur, note, shaker, tak, tuba, tung } from './instruments';

// Three loops for the main screen (GDD, "Musik": tenang, tegang, krisis, switched by Keresahan).
// One tune in D at 96 bpm, 16 bars, so the 1.5 s crossfade between moods sounds like the same band
// changing its mind. A satirical marching band: tuba oompah, brass tune, kendang, a little bonang.

export const BPM = 96;
export const BARS = 16;
const STEP = 60 / BPM / 4; // a sixteenth
export const LOOP_SECONDS = BARS * 16 * STEP;

type Ev = [step: number, semitone: number, length: number];

// The tune, in sixteenths within a four-bar phrase, semitones from D4 (major scale).
const PHRASE_A: Ev[] = [
  [0, 7, 2], [2, 7, 2], [4, 12, 6], [12, 11, 2], [14, 9, 2],
  [16, 7, 2], [18, 7, 2], [20, 4, 6], [28, 5, 2], [30, 4, 2],
  [32, 2, 2], [34, 4, 2], [36, 5, 2], [38, 7, 2], [40, 9, 4], [44, 7, 4],
  [48, 5, 4], [52, 4, 4], [56, 2, 6],
];
const PHRASE_B: Ev[] = [
  ...PHRASE_A.slice(0, 16),
  [48, 4, 4], [52, 2, 4], [56, 0, 8],
];
const TUNE: Ev[] = [...PHRASE_A, ...shift(PHRASE_B, 64), ...shift(PHRASE_A, 128), ...shift(PHRASE_B, 192)];
/** Bass root per bar, semitones from D. */
const ROOTS = [0, 0, 5, 7, 0, 0, 5, 0, 9, 5, 7, 0, 0, 5, 7, 0];

function shift(evs: Ev[], by: number): Ev[] {
  return evs.map(([s, n, l]) => [s + by, n, l]);
}

/** Major to minor: the third, sixth and seventh come down a semitone. */
const minor = (n: number) => {
  const pc = ((n % 12) + 12) % 12;
  return pc === 4 || pc === 9 || pc === 11 ? n - 1 : n;
};

interface Track { l: Mono; r: Mono }
const track = (seconds: number): Track => ({ l: silence(seconds), r: silence(seconds) });

function place(t: Track, src: Mono, at: number, g: number, pan = 0): void {
  // Equal-power pan, -1 left to 1 right.
  const a = ((pan + 1) * Math.PI) / 4;
  mix(t.l, src, at, g * Math.cos(a));
  mix(t.r, src, at, g * Math.sin(a));
}

const time = (step: number) => step * STEP;

function oompah(t: Track, quality: 'major' | 'minor', busy: boolean): void {
  for (let bar = 0; bar < BARS; bar++) {
    const root = ROOTS[bar]!;
    const third = quality === 'major' && root !== 9 ? 4 : 3;
    const base = bar * 16;
    const bassNotes = busy ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 8];
    for (const s of bassNotes) {
      const n = s % 8 === 0 ? root : s % 4 === 0 ? root + 7 : root;
      place(t, tuba(note(n - 24), busy ? STEP * 1.6 : STEP * 3.2), time(base + s), busy ? 0.55 : 0.75, 0);
    }
    // The "pah" on the off-beats: a short brass chord.
    for (const s of [4, 12]) {
      for (const n of [root + third, root + 7]) place(t, brass(note(n - 12), STEP * 1.2, { bright: 0.3, vibrato: 0 }), time(base + s), 0.18, 0.35);
    }
  }
}

function kendang(t: Track, r: Rng, density: 'light' | 'busy' | 'double'): void {
  for (let bar = 0; bar < BARS; bar++) {
    const base = bar * 16;
    // A walking kendang pattern; busier versions fill in the gaps with tak and ketipung.
    const pattern: [number, 'dung' | 'tung' | 'tak' | 'tek'][] =
      density === 'light' ? [[0, 'dung'], [6, 'tak'], [8, 'tung'], [11, 'tak'], [14, 'tek']]
        : density === 'busy' ? [[0, 'dung'], [3, 'tek'], [4, 'tak'], [6, 'tung'], [8, 'dung'], [10, 'tak'], [11, 'tek'], [12, 'tak'], [14, 'tung'], [15, 'tek']]
          : [[0, 'dung'], [1, 'tek'], [2, 'tak'], [3, 'tek'], [4, 'dung'], [6, 'tak'], [7, 'tek'], [8, 'dung'], [9, 'tek'], [10, 'tak'], [11, 'tung'], [12, 'dung'], [13, 'tek'], [14, 'tak'], [15, 'tung']];
    for (const [s, stroke] of pattern) {
      const hit = stroke === 'dung' ? dung(r) : stroke === 'tung' ? tung(r) : stroke === 'tak' ? tak(r) : tak(r, true);
      place(t, hit, time(base + s) + r.range(-0.004, 0.004), stroke === 'dung' ? 0.75 : 0.45, -0.25);
    }
    for (let s = 0; s < 16; s += density === 'light' ? 4 : 2) place(t, shaker(r, s % 4 === 0 ? 1 : 0.6), time(base + s), 0.5, 0.55);
  }
}

function tune(t: Track, mode: 'major' | 'minor', opts: { bright: number; mute?: boolean; gain: number; octave?: number; every?: number }): void {
  for (const [s, n, l] of TUNE) {
    if (opts.every && Math.floor(s / 64) % opts.every !== 0) continue;
    const semi = (mode === 'minor' ? minor(n) : n) + 12 * (opts.octave ?? 0);
    place(t, brass(note(semi), time(l) * 0.92, { bright: opts.bright, mute: opts.mute }), time(s), opts.gain, -0.2);
  }
}

function bonangLine(t: Track, r: Rng, mode: 'major' | 'minor'): void {
  // A bonang answering the tune in the second half of each phrase.
  for (let bar = 0; bar < BARS; bar++) {
    if (bar % 4 < 2) continue;
    const root = ROOTS[bar]!;
    for (const [s, n] of [[0, 0], [3, 7], [6, 12], [10, 7]] as const) {
      const semi = mode === 'minor' ? minor(root + n) : root + n;
      place(t, bonang(note(semi + 12), r), time(bar * 16 + s), 0.22, 0.5);
    }
  }
}

function stabs(t: Track, cluster: boolean): void {
  // Krisis: brass falls with a flattened second rubbing against the root.
  for (let bar = 0; bar < BARS; bar += 2) {
    const root = ROOTS[bar]!;
    const notes = cluster ? [root, root + 1, root + 7] : [root, root + 3, root + 7];
    for (const n of notes) place(t, brass(note(n - 12), STEP * 3, { bright: 0.75, slide: -2, vibrato: 0.4 }), time(bar * 16 + 14), 0.2, 0.3);
  }
}

/** Renders a loop as [left, right], with the reverb tail folded back to the start so it loops seamlessly. */
export function renderLoop(mood: Mood): [Mono, Mono] {
  const r = rng(mood === 'tenang' ? 11 : mood === 'tegang' ? 22 : 33);
  const tail = 3;
  const t = track(LOOP_SECONDS + tail);
  if (mood === 'tenang') {
    oompah(t, 'major', false);
    kendang(t, r, 'light');
    tune(t, 'major', { bright: 0.55, gain: 0.42 });
    bonangLine(t, r, 'major');
  } else if (mood === 'tegang') {
    oompah(t, 'minor', true);
    kendang(t, r, 'busy');
    tune(t, 'minor', { bright: 0.35, mute: true, gain: 0.4 });
    bonangLine(t, r, 'minor');
  } else {
    oompah(t, 'minor', true);
    kendang(t, r, 'double');
    tune(t, 'minor', { bright: 0.5, gain: 0.32, octave: -1, every: 2 });
    stabs(t, true);
    const crowd = murmur(LOOP_SECONDS, r, 10, 0.6);
    filter(crowd, 'lowpass', 1400);
    place(t, crowd, 0, 0.18, 0);
  }

  const out: [Mono, Mono] = [t.l, t.r].map((ch, i) => {
    const wet = reverb(ch, 0.18, i ? 1.05 : 0.95, 0.45, 1.4);
    // Fold everything past the loop point back onto its start.
    const loop = wet.slice(0, samples(LOOP_SECONDS));
    for (let j = loop.length; j < wet.length; j++) loop[j - loop.length]! += wet[j]!;
    return loop;
  }) as [Mono, Mono];

  // Gentle glue: level to about -20 dBFS RMS, with a soft ceiling at -1 dBFS.
  const level = Math.max(rms(out[0]), rms(out[1]));
  const g = db(-20) / level;
  for (const ch of out) {
    gain(ch, g);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.tanh(ch[i]! * 1.1) * db(-1);
  }
  return out;
}
