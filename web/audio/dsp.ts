// A small offline synthesis kit for TEI's temporary sound (docs/art-audio.md, "Audio"). Physical
// models rather than beeps: decaying resonators for bells, coins and wood; filtered noise for paper,
// cloth and crowds; pitched membranes for kendang; band-limited saws through a filter for brass.
// Everything renders to Float32 at 48 kHz, deterministic from a seed.

export const SR = 48_000;

export type Mono = Float32Array;

export const samples = (seconds: number) => Math.max(1, Math.round(seconds * SR));
export const silence = (seconds: number): Mono => new Float32Array(samples(seconds));
export const db = (d: number) => 10 ** (d / 20);

/** mulberry32: the same generator the engine uses, so a seed always gives the same sound. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, range: (lo: number, hi: number) => lo + (hi - lo) * next(), pick: <T>(xs: T[]) => xs[Math.floor(next() * xs.length)]! };
}
export type Rng = ReturnType<typeof rng>;

// ---------- sources ----------

export function white(seconds: number, r: Rng): Mono {
  const out = silence(seconds);
  for (let i = 0; i < out.length; i++) out[i] = r.next() * 2 - 1;
  return out;
}

/** Pink noise (Paul Kellet's filter): fuller and softer than white, good for paper and crowds. */
export function pink(seconds: number, r: Rng): Mono {
  const out = silence(seconds);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < out.length; i++) {
    const w = r.next() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return out;
}

/** Brown noise: a rumble for rails, machines and distant crowds. */
export function brown(seconds: number, r: Rng): Mono {
  const out = silence(seconds);
  let last = 0;
  for (let i = 0; i < out.length; i++) {
    last = (last + 0.02 * (r.next() * 2 - 1)) / 1.02;
    out[i] = last * 3.5;
  }
  return out;
}

type Freq = number | ((t: number) => number);
const at = (f: Freq, t: number) => (typeof f === 'number' ? f : f(t));

export function sine(seconds: number, freq: Freq, phase = 0): Mono {
  const out = silence(seconds);
  let p = phase;
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.sin(p);
    p += (2 * Math.PI * at(freq, i / SR)) / SR;
  }
  return out;
}

// PolyBLEP keeps saws and squares from aliasing into fizz.
function blep(t: number, dt: number): number {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

export function saw(seconds: number, freq: Freq, phase = 0): Mono {
  const out = silence(seconds);
  let p = phase;
  for (let i = 0; i < out.length; i++) {
    const dt = at(freq, i / SR) / SR;
    out[i] = 2 * p - 1 - blep(p, dt);
    p += dt;
    if (p >= 1) p -= 1;
  }
  return out;
}

export function square(seconds: number, freq: Freq, width = 0.5, phase = 0): Mono {
  const out = silence(seconds);
  let p = phase;
  for (let i = 0; i < out.length; i++) {
    const dt = at(freq, i / SR) / SR;
    let v = p < width ? 1 : -1;
    v += blep(p, dt);
    v -= blep((p + 1 - width) % 1, dt);
    out[i] = v;
    p += dt;
    if (p >= 1) p -= 1;
  }
  return out;
}

/**
 * Modal synthesis: a struck object is a handful of decaying sines. Bells, coins, tins, wood and
 * gongs differ only in their partials, decays and the strike.
 */
export function modal(seconds: number, modes: { f: number; decay: number; amp: number }[], r?: Rng): Mono {
  const out = silence(seconds);
  for (const m of modes) {
    const k = Math.exp(-1 / (m.decay * SR));
    const w = (2 * Math.PI * m.f) / SR;
    let env = m.amp;
    const phase = r ? r.next() * Math.PI : 0;
    for (let i = 0; i < out.length && env > 1e-5; i++) {
      out[i]! += env * Math.sin(w * i + phase);
      env *= k;
    }
  }
  return out;
}

/** Karplus-Strong: a plucked or tapped string, also useful for tins and springs. */
export function pluck(seconds: number, freq: number, damping = 0.996, r: Rng = rng(1)): Mono {
  const out = silence(seconds);
  const n = Math.max(2, Math.round(SR / freq));
  const line = new Float32Array(n);
  for (let i = 0; i < n; i++) line[i] = r.next() * 2 - 1;
  let idx = 0;
  for (let i = 0; i < out.length; i++) {
    const next = (idx + 1) % n;
    const v = damping * 0.5 * (line[idx]! + line[next]!);
    out[i] = line[idx]!;
    line[idx] = v;
    idx = next;
  }
  return out;
}

// ---------- shaping ----------

export function envelope(buf: Mono, points: [number, number][], curve: 'lin' | 'exp' = 'lin'): Mono {
  // points: [time in seconds, level]; holds the last level after the final point.
  let j = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    while (j < points.length - 1 && t > points[j + 1]![0]) j++;
    const [t0, v0] = points[j]!;
    const [t1, v1] = points[Math.min(j + 1, points.length - 1)]!;
    let v: number;
    if (t >= t1 || t1 === t0) v = t >= t1 ? v1 : v0;
    else {
      const x = (t - t0) / (t1 - t0);
      v = curve === 'exp' && v0 > 0 && v1 > 0 ? v0 * (v1 / v0) ** x : v0 + (v1 - v0) * x;
    }
    buf[i]! *= v;
  }
  return buf;
}

/** Percussive envelope: a quick attack and an exponential fall. */
export function perc(buf: Mono, attack: number, decay: number): Mono {
  const a = samples(attack);
  const k = Math.exp(-1 / (decay * SR));
  let env = 1;
  for (let i = 0; i < buf.length; i++) {
    if (i < a) buf[i]! *= i / a;
    else { buf[i]! *= env; env *= k; }
  }
  return buf;
}

export function gain(buf: Mono, g: number): Mono {
  for (let i = 0; i < buf.length; i++) buf[i]! *= g;
  return buf;
}

/** Amplitude modulation by any function of time (tremolo, syllables, a pea in a whistle). */
export function am(buf: Mono, fn: (t: number) => number): Mono {
  for (let i = 0; i < buf.length; i++) buf[i]! *= fn(i / SR);
  return buf;
}

export function drive(buf: Mono, amount: number): Mono {
  const norm = Math.tanh(amount);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i]! * amount) / norm;
  return buf;
}

// RBJ biquads; the frequency may glide (coefficients are refreshed every 16 samples).
type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'peak' | 'highshelf';

export function filter(buf: Mono, type: FilterType, freq: Freq, q = 0.707, gainDb = 0): Mono {
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const update = (f: number) => {
    const w = (2 * Math.PI * Math.min(Math.max(f, 10), SR * 0.45)) / SR;
    const cos = Math.cos(w), alpha = Math.sin(w) / (2 * q);
    let a0: number;
    if (type === 'lowpass') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; }
    else if (type === 'highpass') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; }
    else if (type === 'bandpass') { b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; }
    else if (type === 'highshelf') {
      const A = 10 ** (gainDb / 40), s2 = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) + (A - 1) * cos + s2); b1 = -2 * A * ((A - 1) + (A + 1) * cos); b2 = A * ((A + 1) + (A - 1) * cos - s2);
      a0 = (A + 1) - (A - 1) * cos + s2; a1 = 2 * ((A - 1) - (A + 1) * cos); a2 = (A + 1) - (A - 1) * cos - s2;
    }
    else { const A = 10 ** (gainDb / 40); b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A; }
    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  };
  update(at(freq, 0));
  for (let i = 0; i < buf.length; i++) {
    if (typeof freq !== 'number' && i % 16 === 0) update(freq(i / SR));
    const x = buf[i]!;
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    buf[i] = y;
  }
  return buf;
}

/** Adds `src` into `dst` starting at `start` seconds; returns dst. Out-of-range samples are dropped. */
export function mix(dst: Mono, src: Mono, start = 0, g = 1): Mono {
  const o = Math.round(start * SR);
  for (let i = 0; i < src.length; i++) {
    const j = o + i;
    if (j >= 0 && j < dst.length) dst[j]! += src[i]! * g;
  }
  return dst;
}

/** A small Schroeder room: four combs and two allpasses. `size` scales the delays. */
export function reverb(buf: Mono, wet = 0.25, size = 1, damp = 0.4, seconds = 1.2): Mono {
  const out = new Float32Array(buf.length + samples(seconds));
  const combs = [1557, 1617, 1491, 1422].map(d => ({ d: Math.round(d * size * (SR / 44100)), fb: 0.78, store: 0 }));
  const lines = combs.map(c => new Float32Array(c.d));
  const idx = combs.map(() => 0);
  const ap = [225, 556].map(d => ({ d: Math.round(d * size * (SR / 44100)) }));
  const apLines = ap.map(a => new Float32Array(a.d));
  const apIdx = ap.map(() => 0);
  for (let i = 0; i < out.length; i++) {
    const x = i < buf.length ? buf[i]! : 0;
    let y = 0;
    combs.forEach((c, k) => {
      const line = lines[k]!;
      const v = line[idx[k]!]!;
      c.store = v * (1 - damp) + c.store * damp;
      line[idx[k]!] = x + c.store * c.fb;
      idx[k] = (idx[k]! + 1) % c.d;
      y += v;
    });
    y *= 0.25;
    ap.forEach((a, k) => {
      const line = apLines[k]!;
      const v = line[apIdx[k]!]!;
      const inp = y + v * 0.5;
      line[apIdx[k]!] = inp;
      y = v - inp * 0.5;
      apIdx[k] = (apIdx[k]! + 1) % a.d;
    });
    out[i] = x * (1 - wet * 0.5) + y * wet;
  }
  return out;
}

export function peak(buf: Mono): number {
  let p = 0;
  for (let i = 0; i < buf.length; i++) p = Math.max(p, Math.abs(buf[i]!));
  return p;
}

export function rms(buf: Mono): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i]! * buf[i]!;
  return Math.sqrt(s / buf.length);
}

export function normalize(buf: Mono, peakDb = -1.5): Mono {
  const p = peak(buf);
  return p > 0 ? gain(buf, db(peakDb) / p) : buf;
}

/**
 * Loudness of the loudest 400 ms, K-weighted as in EBU R128 (a high shelf and a low cut), in LUFS.
 * Momentary rather than integrated, because a stamp lasts a tenth of a second.
 */
export function momentaryMax(buf: Mono): number {
  const k = filter(filter(buf.slice(), 'highshelf', 1681, 0.707, 4), 'highpass', 38, 0.5);
  const win = samples(0.4);
  const hop = samples(0.1);
  let best = 0;
  for (let start = 0; start === 0 || start + win <= k.length; start += hop) {
    let sum = 0;
    const end = Math.min(k.length, start + win);
    for (let i = start; i < end; i++) sum += k[i]! * k[i]!;
    best = Math.max(best, sum / win);
    if (end === k.length) break;
  }
  return best > 0 ? -0.691 + 10 * Math.log10(best) : -Infinity;
}

/**
 * Brings a sound to the target momentary-max loudness, but never past `ceilingDb` peak: a click
 * stays a little quieter rather than being squashed flat by a limiter.
 */
export function loudness(buf: Mono, targetLufs = -18, ceilingDb = -1.5): Mono {
  const now = momentaryMax(buf);
  const p = peak(buf);
  if (!Number.isFinite(now) || p === 0) return buf;
  return gain(buf, Math.min(db(targetLufs - now), db(ceilingDb) / p));
}

/** Trims trailing near-silence (keeps 30 ms) and fades the last 10 ms, so files stay small and click-free. */
export function trim(buf: Mono, threshold = db(-60)): Mono {
  let end = buf.length;
  while (end > 0 && Math.abs(buf[end - 1]!) < threshold) end--;
  const out = buf.slice(0, Math.min(buf.length, end + samples(0.03)));
  const fade = Math.min(out.length, samples(0.01));
  for (let i = 0; i < fade; i++) out[out.length - 1 - i]! *= i / fade;
  return out;
}

/** 32-bit float WAV, mono or interleaved stereo, for ffmpeg to encode. */
export function wav(channels: Mono[]): Buffer {
  const n = channels[0]!.length;
  const ch = channels.length;
  const data = Buffer.alloc(n * ch * 4);
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) data.writeFloatLE(channels[c]![i]!, (i * ch + c) * 4);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(3, 20); header.writeUInt16LE(ch, 22);
  header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * ch * 4, 28); header.writeUInt16LE(ch * 4, 32); header.writeUInt16LE(32, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
