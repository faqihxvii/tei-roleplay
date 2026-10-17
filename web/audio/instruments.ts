import { envelope, filter, gain, mix, modal, perc, pink, saw, silence, sine, square, white, type Mono, type Rng } from './dsp';

// Instruments shared by the cues and the three loops: a satirical brass band with kendang
// (GDD, "Musik": brass dan kendang), plus bonang for a local colour and a murmuring crowd.

export const hz = (semitonesFromA4: number) => 440 * 2 ** (semitonesFromA4 / 12);
/** D4 as the home note of every loop. */
export const D4 = hz(-7);
export const note = (semitonesFromD4: number) => D4 * 2 ** (semitonesFromD4 / 12);

/**
 * Brass: two detuned saws and a soft square through a low-pass whose opening follows the attack,
 * with a late vibrato. `bright` 0–1 opens the bell; `mute` closes it for a muted trumpet.
 */
export function brass(freq: number, seconds: number, opts: { bright?: number; vibrato?: number; slide?: number; mute?: boolean } = {}): Mono {
  const len = seconds + 0.12;
  const bright = opts.bright ?? 0.6;
  const slide = opts.slide ?? 0; // semitones over the note, for falls
  const vib = opts.vibrato ?? 0.12;
  const f = (t: number) => freq * 2 ** ((slide * Math.min(1, t / seconds)) / 12) * (1 + (t > 0.18 ? vib * 0.01 * Math.sin(2 * Math.PI * 5.2 * t) : 0));
  const a = saw(len, f);
  const b = saw(len, t => f(t) * 1.004);
  const c = square(len, t => f(t) / 2, 0.42);
  const out = silence(len);
  mix(out, a, 0, 0.5); mix(out, b, 0, 0.5); mix(out, c, 0, 0.22);
  const peakCut = (opts.mute ? 900 : 1500 + 3500 * bright);
  const sustainCut = (opts.mute ? 600 : 900 + 1800 * bright);
  filter(out, 'lowpass', t => (t < 0.05 ? 300 + (peakCut - 300) * (t / 0.05) : sustainCut + (peakCut - sustainCut) * Math.exp(-(t - 0.05) * 8)), opts.mute ? 2.2 : 1.1);
  if (opts.mute) filter(out, 'peak', 1400, 3, 9);
  envelope(out, [[0, 0], [0.03, 1], [0.12, 0.82], [seconds, 0.75], [seconds + 0.1, 0]]);
  return gain(out, 0.5);
}

/** Tuba: brass an octave or two down, rounder and with no vibrato. */
export function tuba(freq: number, seconds: number): Mono {
  const len = seconds + 0.1;
  const out = silence(len);
  mix(out, saw(len, freq), 0, 0.6);
  mix(out, sine(len, freq), 0, 0.7);
  filter(out, 'lowpass', t => 380 + 500 * Math.exp(-t * 10), 0.9);
  envelope(out, [[0, 0], [0.025, 1], [seconds * 0.7, 0.7], [seconds + 0.08, 0]]);
  return gain(out, 0.7);
}

/** Kendang, low stroke: a membrane whose pitch sinks as it rings. */
export function dung(r: Rng, freq = 92): Mono {
  const out = sine(0.5, t => freq * (1 + 0.45 * Math.exp(-t * 28)));
  perc(out, 0.002, 0.16);
  const skin = filter(perc(white(0.06, r), 0.001, 0.012), 'lowpass', 900);
  return mix(out, skin, 0, 0.35);
}

/** Kendang, open mid stroke. */
export function tung(r: Rng, freq = 178): Mono {
  const out = sine(0.3, t => freq * (1 + 0.25 * Math.exp(-t * 35)));
  perc(out, 0.002, 0.09);
  const skin = filter(perc(white(0.04, r), 0.001, 0.008), 'bandpass', 1400, 1.2);
  return mix(gain(out, 0.8), skin, 0, 0.4);
}

/** Kendang, slap (tak) and the small ketipung tek. */
export function tak(r: Rng, small = false): Mono {
  const body = sine(0.12, small ? 520 : 330);
  perc(body, 0.001, small ? 0.025 : 0.035);
  const slap = filter(perc(white(0.08, r), 0.0005, small ? 0.012 : 0.02), 'bandpass', small ? 3800 : 2500, 1.4);
  return mix(gain(body, 0.5), slap, 0, 1.1);
}

export function shaker(r: Rng, accent = 1): Mono {
  const out = filter(white(0.09, r), 'highpass', 5500, 0.8);
  envelope(out, [[0, 0], [0.015, accent], [0.08, 0]]);
  return gain(out, 0.35);
}

/** Bonang: a gong-chime kettle, partials slightly off harmonic. */
export function bonang(freq: number, r: Rng): Mono {
  return gain(modal(1.4, [
    { f: freq, decay: 0.55, amp: 1 },
    { f: freq * 2.76, decay: 0.22, amp: 0.4 },
    { f: freq * 4.12, decay: 0.12, amp: 0.25 },
    { f: freq * 0.5, decay: 0.3, amp: 0.15 },
  ], r), 0.4);
}

/** A crowd murmur: several voices of band-passed noise, each with its own syllable rhythm. */
export function murmur(seconds: number, r: Rng, voices = 6, excited = 0): Mono {
  const out = silence(seconds);
  for (let v = 0; v < voices; v++) {
    const centre = r.range(350, 1100) * (1 + excited * 0.4);
    const rate = r.range(3.2, 6.5) * (1 + excited * 0.5);
    const phase = r.next() * 10;
    const voice = filter(pink(seconds, r), 'bandpass', t => centre * (1 + 0.15 * Math.sin(2 * Math.PI * 0.7 * t + phase)), 4);
    for (let i = 0; i < voice.length; i++) {
      const t = i / 48_000;
      const syl = Math.max(0, Math.sin(2 * Math.PI * rate * t + phase)) ** 1.5;
      voice[i]! *= syl * (0.6 + 0.4 * Math.sin(2 * Math.PI * 0.31 * t + v));
    }
    mix(out, voice, 0, 1.6 / Math.sqrt(voices));
  }
  return filter(out, 'lowpass', 2600);
}

/** A pea whistle: a high tone trilled by the pea, with breath. */
export function whistle(seconds: number, r: Rng, freq = 2900, trill = 32): Mono {
  const tone = sine(seconds, t => freq * (1 + 0.012 * Math.sin(2 * Math.PI * trill * t)));
  am(tone, t => 0.7 + 0.3 * Math.sin(2 * Math.PI * trill * t));
  const breath = filter(white(seconds, r), 'bandpass', freq, 6);
  mix(tone, breath, 0, 0.5);
  envelope(tone, [[0, 0], [0.02, 1], [seconds - 0.04, 0.9], [seconds, 0]]);
  return gain(tone, 0.45);
}

function am(buf: Mono, fn: (t: number) => number): Mono {
  for (let i = 0; i < buf.length; i++) buf[i]! *= fn(i / 48_000);
  return buf;
}

