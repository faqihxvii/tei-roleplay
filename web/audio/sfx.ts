import type { CueId } from '../src/audio/cues';
import { brown, envelope, filter, gain, mix, modal, normalize, perc, pink, reverb, rng, silence, sine, trim, white, type Mono, type Rng } from './dsp';
import { brass, bonang, dung, murmur, note, tak, tung, whistle } from './instruments';

// Temporary synthesized foley for every cue (web/src/audio/cues.ts describes the real recording each
// one stands in for). Mono, peak-normalised; the manifest gain sets the mix.

// ---------- building blocks ----------

function burst(r: Rng, seconds: number, type: 'lowpass' | 'highpass' | 'bandpass', freq: number, q: number, attack: number, decay: number, source: 'white' | 'pink' = 'white'): Mono {
  const n = source === 'white' ? white(seconds, r) : pink(seconds, r);
  return perc(filter(n, type, freq, q), attack, decay);
}

/** A thud: a sinking sine for the weight, low noise for the contact. */
function thud(r: Rng, freq: number, decay: number, contact = 0.5): Mono {
  const body = perc(sine(decay * 5, t => freq * (1 + 0.8 * Math.exp(-t * 40))), 0.001, decay);
  return mix(body, burst(r, 0.12, 'lowpass', 1200, 0.7, 0.0005, 0.02), 0, contact);
}

/** Wood: a block or gavel, three short modes. */
function wood(r: Rng, freq: number, decay = 0.07): Mono {
  const out = modal(0.4, [{ f: freq, decay, amp: 1 }, { f: freq * 2.57, decay: decay * 0.6, amp: 0.5 }, { f: freq * 4.3, decay: decay * 0.35, amp: 0.3 }], r);
  return mix(out, burst(r, 0.02, 'bandpass', 3000, 1, 0.0002, 0.003), 0, 0.6);
}

/** Paper moving: band-passed noise sweeping between two frequencies under a swell. */
function swish(r: Rng, seconds: number, from: number, to: number, q = 1.2): Mono {
  const out = filter(pink(seconds, r), 'bandpass', t => from + (to - from) * (t / seconds), q);
  envelope(out, [[0, 0], [seconds * 0.35, 1], [seconds, 0]]);
  return gain(out, 2.2);
}

/** Crackle: a fast scatter of tiny clicks (paper fibres tearing, crinkles, grit). */
function crackle(r: Rng, seconds: number, density: number, freq: number, grow = 0): Mono {
  const out = silence(seconds);
  for (let t = 0; t < seconds; t += 1 / density) {
    const d = (1 + grow * (t / seconds));
    if (r.next() > 0.6 / d) mix(out, burst(r, 0.01, 'bandpass', freq * r.range(0.6, 1.6), 2, 0.0002, r.range(0.0008, 0.003)), t + r.range(0, 1 / density), r.range(0.3, 1));
  }
  return out;
}

const done = (buf: Mono, wet = 0.12, size = 0.6) => normalize(trim(reverb(buf, wet, size, 0.5, 0.8)));

// ---------- the cues ----------

function gabung(r: Rng): Mono {
  // A pushpin into cork: a sharp point, then the soft give of the board.
  const out = silence(0.3);
  mix(out, burst(r, 0.02, 'bandpass', r.range(3500, 5200), 2.5, 0.0002, 0.004), 0, 1);
  mix(out, thud(r, r.range(160, 220), 0.03, 0.2), 0.004, 0.8);
  return done(out, 0.08);
}

function briefingCue(r: Rng): Mono {
  // A brown envelope torn open, then the sheet slid out.
  const out = silence(1.2);
  mix(out, gain(crackle(r, 0.45, 260, 2200, 1.5), 1.2), 0);
  mix(out, gain(filter(pink(0.45, r), 'bandpass', 1800, 0.9), 0.5), 0);
  mix(out, swish(r, 0.5, 900, 3200), 0.55, 0.8);
  return done(out);
}

function krisis(r: Rng): Mono {
  // A burst on the newsroom typewriter, the carriage bell, the return.
  const out = silence(1.9);
  let t = 0;
  for (let i = 0; i < 9; i++) {
    const key = mix(burst(r, 0.03, 'bandpass', 2600, 2, 0.0002, 0.006), wood(r, r.range(900, 1300), 0.03), 0, 0.7);
    mix(out, key, t, r.range(0.6, 1));
    t += r.range(0.06, 0.11);
  }
  const bell = modal(1.2, [{ f: 2093, decay: 0.5, amp: 1 }, { f: 2093 * 2.32, decay: 0.25, amp: 0.45 }, { f: 2093 * 3.9, decay: 0.12, amp: 0.25 }], r);
  mix(out, bell, t + 0.05, 0.55);
  mix(out, gain(swish(r, 0.35, 500, 1400, 2), 0.5), t + 0.25);
  mix(out, thud(r, 140, 0.05, 0.6), t + 0.6, 0.6);
  return done(out);
}

function rapat(r: Rng): Mono {
  // Chairs dragged back, then a room settling into talk.
  const out = silence(1.8);
  for (const start of [0, 0.22, 0.5]) {
    const scrape = filter(brown(0.32, r), 'bandpass', t => 420 + 260 * Math.sin(t * 40) + r.range(-40, 40), 5);
    envelope(scrape, [[0, 0], [0.04, 1], [0.26, 0.8], [0.32, 0]]);
    mix(out, gain(scrape, 3), start);
  }
  const talk = murmur(1.6, r, 8);
  envelope(talk, [[0, 0], [0.7, 0.9], [1.6, 0]]);
  mix(out, talk, 0.2, 0.7);
  return done(out, 0.2, 0.9);
}

function lobi(r: Rng): Mono {
  // A market handbell, and the crowd rising to meet it.
  const out = silence(2.0);
  for (const start of [0, 0.28, 0.56]) {
    const bell = modal(0.9, [{ f: 1318, decay: 0.35, amp: 1 }, { f: 1318 * 2.4, decay: 0.18, amp: 0.4 }, { f: 1318 * 3.7, decay: 0.08, amp: 0.25 }], r);
    mix(out, bell, start, 0.5);
  }
  const crowd = murmur(1.9, r, 10, 0.4);
  envelope(crowd, [[0, 0], [1.2, 1], [1.9, 0]]);
  mix(out, crowd, 0.1, 0.9);
  return done(out, 0.25, 1);
}

function pengesahan(r: Rng): Mono {
  // Two raps of the session gavel.
  const out = silence(1.0);
  for (const start of [0, 0.32]) {
    mix(out, wood(r, 240, 0.09), start, 1);
    mix(out, thud(r, 110, 0.06, 0.4), start, 0.6);
  }
  return done(out, 0.22, 1.1);
}

function pengungkapan(r: Rng): Mono {
  // A kendang roll that speeds up and lands on dung and tak.
  const out = silence(1.7);
  let t = 0;
  let gap = 0.13;
  let high = false;
  while (t < 1.05) {
    mix(out, high ? tung(r, 200) : tak(r, true), t, 0.35 + 0.5 * (t / 1.05));
    high = !high;
    t += gap;
    gap = Math.max(0.035, gap * 0.9);
  }
  mix(out, dung(r, 88), 1.1, 1);
  mix(out, tak(r), 1.1, 0.7);
  return done(out, 0.15);
}

function koran(r: Rng): Mono {
  // The press thumps and clacks four turns, then the paper lands on the table.
  const out = silence(2.3);
  for (let i = 0; i < 4; i++) {
    const t = i * 0.3;
    mix(out, thud(r, 70, 0.08, 0.4), t, 0.8);
    mix(out, modal(0.3, [{ f: 1900, decay: 0.05, amp: 1 }, { f: 3100, decay: 0.03, amp: 0.5 }], r), t + 0.14, 0.25);
    mix(out, burst(r, 0.2, 'highpass', 4000, 0.7, 0.01, 0.06), t + 0.05, 0.2);
  }
  mix(out, swish(r, 0.35, 600, 4000, 0.9), 1.35, 1);
  mix(out, mix(thud(r, 160, 0.03, 1), burst(r, 0.1, 'bandpass', 2400, 0.8, 0.0005, 0.03, 'pink'), 0, 0.8), 1.68, 1);
  return done(out);
}

function sah(r: Rng): Mono {
  // A rubber stamp: weight, rubber, ink pad.
  const out = silence(0.5);
  mix(out, thud(r, r.range(78, 96), 0.08, 0.9), 0, 1);
  mix(out, burst(r, 0.06, 'bandpass', r.range(500, 700), 3, 0.001, 0.015), 0.003, 0.6);
  mix(out, burst(r, 0.05, 'highpass', 3000, 0.7, 0.002, 0.01), 0.01, 0.15);
  return done(out, 0.1);
}

function paktaSepakat(r: Rng): Mono {
  // A signature in three strokes, then the sheet folded.
  const out = silence(1.1);
  let t = 0;
  for (let s = 0; s < 3; s++) {
    const len = r.range(0.12, 0.22);
    const stroke = filter(white(len, r), 'bandpass', t2 => 2600 + 1600 * Math.sin(2 * Math.PI * r.range(9, 14) * t2), 3);
    envelope(stroke, [[0, 0], [0.02, 1], [len - 0.03, 0.8], [len, 0]]);
    mix(out, gain(stroke, 0.9), t);
    t += len + r.range(0.03, 0.07);
  }
  mix(out, swish(r, 0.22, 1500, 700, 1), t + 0.08, 0.7);
  mix(out, thud(r, 200, 0.02, 0.3), t + 0.3, 0.3);
  return done(out);
}

function kartuBuka(r: Rng): Mono {
  const out = silence(0.4);
  mix(out, swish(r, 0.12, r.range(1500, 2500), r.range(5000, 7000), 0.8), 0, 0.8);
  mix(out, burst(r, 0.03, 'bandpass', r.range(2500, 3500), 1.5, 0.0003, 0.006), 0.12, 1);
  return done(out, 0.08);
}

function sebabBaik(r: Rng): Mono {
  // A coin into a tin, with two small bounces.
  const out = silence(1.0);
  const base = r.range(1900, 2300);
  const tin = (amp: number) => modal(0.6, [{ f: base, decay: 0.25, amp }, { f: base * 1.73, decay: 0.16, amp: amp * 0.6 }, { f: base * 2.41, decay: 0.1, amp: amp * 0.4 }, { f: base * 3.6, decay: 0.05, amp: amp * 0.3 }], r);
  mix(out, tin(1), 0);
  mix(out, tin(0.45), 0.11);
  mix(out, tin(0.2), 0.18);
  return done(out, 0.12);
}

function sebabBuruk(r: Rng): Mono {
  // A thick file dropped on the desk, its pages settling.
  const out = silence(0.8);
  mix(out, thud(r, r.range(95, 125), 0.07, 0.8), 0, 1);
  mix(out, burst(r, 0.3, 'bandpass', 1800, 0.8, 0.005, 0.08, 'pink'), 0.02, 0.5);
  return done(out, 0.12);
}

function paktaTepat(r: Rng): Mono {
  // Palms meeting, a squeeze, two pats on the shoulder.
  const out = silence(0.9);
  mix(out, burst(r, 0.12, 'bandpass', 1300, 0.9, 0.001, 0.03, 'pink'), 0, 1);
  mix(out, burst(r, 0.12, 'lowpass', 700, 0.8, 0.001, 0.04, 'pink'), 0.06, 0.6);
  for (const t of [0.42, 0.62]) mix(out, mix(thud(r, 150, 0.03, 0.2), burst(r, 0.08, 'bandpass', 900, 1, 0.001, 0.02, 'pink'), 0, 1), t, 0.6);
  return done(out, 0.15);
}

function paktaRobek(r: Rng): Mono {
  // Paper ripped in two: a crackle that thickens, then the halves separate.
  const out = silence(1.0);
  mix(out, gain(crackle(r, 0.6, 500, 2500, 3), 1.2), 0);
  const body = filter(white(0.6, r), 'bandpass', t => 1200 + 2500 * (t / 0.6), 1.5);
  envelope(body, [[0, 0], [0.4, 0.7], [0.6, 0]]);
  mix(out, body, 0, 0.6);
  mix(out, swish(r, 0.2, 3000, 1200), 0.58, 0.5);
  return done(out);
}

function bahaya(r: Rng): Mono {
  // A protest whistle somewhere down the street.
  const out = silence(1.6);
  for (const [t, len] of [[0, 0.25], [0.32, 0.25], [0.66, 0.55]] as const) mix(out, whistle(len, r, 2750, 28), t, 1);
  mix(out, gain(murmur(1.5, r, 6, 0.5), 0.5), 0.1);
  filter(out, 'lowpass', 3200);
  return normalize(trim(reverb(out, 0.45, 1.4, 0.55, 1.2)), -3);
}

function kolaps(r: Rng): Mono {
  // The crowd erupts: roar, a long whistle, a megaphone voice cutting through.
  const out = silence(3.2);
  const roar = murmur(3.0, r, 16, 1);
  mix(roar, filter(pink(3.0, r), 'bandpass', 900, 0.6), 0, 0.5);
  envelope(roar, [[0, 0], [0.5, 1], [2.4, 0.85], [3.0, 0]]);
  mix(out, roar, 0, 1);
  mix(out, whistle(1.2, r, 3100, 30), 0.4, 0.7);
  // A megaphone: buzzy formants chopped into syllables.
  const megaphone = filter(filter(gain(sine(1.1, t => 165 + 25 * Math.sin(t * 9)), 1), 'peak', 1000, 4, 12), 'bandpass', 1500, 1.2);
  const voice = mix(megaphone, filter(white(1.1, r), 'bandpass', 1600, 3), 0, 0.3);
  for (let i = 0; i < voice.length; i++) voice[i] = Math.tanh(voice[i]! * 6) * Math.max(0, Math.sin((i / 48_000) * 2 * Math.PI * 4.5)) ** 0.6;
  mix(out, voice, 1.3, 0.35);
  return normalize(trim(reverb(out, 0.3, 1.2, 0.5, 1)));
}

function waktuHampir(r: Rng): Mono {
  // A desk clock: tick, tock, for ten seconds.
  const out = silence(10.1);
  for (let i = 0; i < 20; i++) {
    const tick = mix(burst(r, 0.02, 'bandpass', i % 2 ? 1700 : 2300, 4, 0.0002, 0.004), wood(r, i % 2 ? 900 : 1200, 0.015), 0, 0.5);
    mix(out, tick, i * 0.5, i % 2 ? 0.75 : 1);
  }
  return normalize(trim(reverb(out, 0.1, 0.4)));
}

function jeda(r: Rng): Mono {
  const out = silence(0.6);
  mix(out, whistle(0.38, r), 0);
  return done(out, 0.12);
}

function lanjut(r: Rng): Mono {
  const out = silence(0.8);
  mix(out, whistle(0.16, r), 0);
  mix(out, whistle(0.2, r), 0.24);
  return done(out, 0.12);
}

function tebak(r: Rng): Mono {
  // A filing drawer rolled out, folders flicked through.
  const out = silence(1.6);
  const rail = filter(brown(0.5, r), 'bandpass', 260, 2);
  mix(rail, filter(white(0.5, r), 'bandpass', 3200, 6), 0, 0.15);
  envelope(rail, [[0, 0], [0.05, 1], [0.42, 0.9], [0.5, 0]]);
  mix(out, gain(rail, 2.5), 0);
  mix(out, modal(0.3, [{ f: 820, decay: 0.08, amp: 1 }, { f: 1960, decay: 0.05, amp: 0.4 }], r), 0.5, 0.5);
  for (let i = 0; i < 6; i++) mix(out, swish(r, 0.09, 1200, 4500, 1), 0.65 + i * 0.12, 0.55);
  return done(out);
}

function chord(freqs: number[], seconds: number, opts: Parameters<typeof brass>[2] = {}): Mono {
  const out = silence(seconds + 0.2);
  for (const f of freqs) mix(out, brass(f, seconds, opts), 0, 0.5);
  return out;
}

function akhirBaik(r: Rng): Mono {
  // A short brass fanfare, one horn a little flat: a happy ending, mostly.
  const out = silence(2.6);
  mix(out, chord([note(-5), note(-1), note(2)], 0.18, { bright: 0.7 }), 0);
  mix(out, chord([note(-5), note(-1), note(2)], 0.18, { bright: 0.7 }), 0.22);
  mix(out, chord([note(0), note(4) * 0.985, note(7), note(12)], 1.3, { bright: 0.8, vibrato: 0.25 }), 0.46);
  mix(out, dung(r, 92), 0.46, 0.5);
  mix(out, bonang(note(12), r), 0.46, 0.3);
  return normalize(trim(reverb(out, 0.22, 1.1, 0.4, 1.2)));
}

function akhirKolaps(r: Rng): Mono {
  // The sad trombone: four falling notes, the last one sagging, then a gong.
  const out = silence(4.2);
  const notes = [note(-7), note(-8), note(-9)];
  notes.forEach((f, i) => mix(out, brass(f, 0.42, { bright: 0.35, mute: true }), i * 0.5, 0.9));
  mix(out, brass(note(-10), 1.1, { bright: 0.35, mute: true, slide: -1.5, vibrato: 0.9 }), 1.5, 0.9);
  const gong = modal(3.2, [{ f: 98, decay: 1.6, amp: 1 }, { f: 98 * 1.47, decay: 1.1, amp: 0.5 }, { f: 98 * 2.09, decay: 0.8, amp: 0.4 }, { f: 98 * 2.56, decay: 0.5, amp: 0.3 }, { f: 98 * 3.98, decay: 0.3, amp: 0.2 }], r);
  envelope(gong, [[0, 0], [0.02, 1], [3.2, 1]]);
  mix(out, gong, 2.75, 0.8);
  return normalize(trim(reverb(out, 0.2, 1.2, 0.45, 1.2)));
}

function halaman(r: Rng): Mono {
  const out = silence(0.7);
  mix(out, swish(r, 0.32, 900, 3500, 0.9), 0, 1);
  mix(out, gain(crackle(r, 0.25, 300, 3000), 0.5), 0.05);
  mix(out, burst(r, 0.05, 'bandpass', 1800, 1, 0.0005, 0.012, 'pink'), 0.33, 0.6);
  return done(out, 0.1);
}

function kuisJawaban(r: Rng): Mono {
  // Two taps of chalk on the board.
  const out = silence(0.6);
  for (const t of [0, 0.16]) {
    mix(out, burst(r, 0.03, 'bandpass', 2600, 3, 0.0002, 0.005), t, 1);
    mix(out, wood(r, 520, 0.02), t, 0.4);
    mix(out, gain(crackle(r, 0.03, 900, 5000), 0.3), t);
  }
  return done(out, 0.12);
}

const DESIGNS: Record<CueId, (r: Rng) => Mono> = {
  gabung, briefing: briefingCue,
  'fase.krisis': krisis, 'fase.rapat': rapat, 'fase.lobi': lobi, 'fase.pengesahan': pengesahan, 'fase.pengungkapan': pengungkapan, 'fase.koran': koran,
  sah, 'pakta.sepakat': paktaSepakat,
  'kartu.buka': kartuBuka, 'sebab.baik': sebabBaik, 'sebab.buruk': sebabBuruk, 'pakta.tepat': paktaTepat, 'pakta.robek': paktaRobek, bahaya, kolaps,
  'waktu.hampir': waktuHampir, jeda, lanjut,
  tebak, 'akhir.baik': akhirBaik, 'akhir.kolaps': akhirKolaps,
  halaman, 'kuis.jawaban': kuisJawaban,
};

/** Cues heard often enough to need variety (docs/art-audio.md: three variants). */
export const VARIANTS: Partial<Record<CueId, number>> = { gabung: 3, sah: 3, 'pakta.sepakat': 3, 'kartu.buka': 3, 'sebab.baik': 3, 'sebab.buruk': 3 };

/** Renders one cue variant; the seed is fixed per cue and variant, so builds are reproducible. */
export function renderCue(cue: CueId, variant = 0): Mono {
  let seed = 7;
  for (const ch of `${cue}:${variant}`) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
  return DESIGNS[cue](rng(seed));
}

