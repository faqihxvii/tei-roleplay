import type { Howl as HowlType } from 'howler';
import { CUES, type CueId, type Mood } from './cues';
import { audioStatus, type AvSettings } from './settings';

// Main-screen audio on Howler (GDD, "Pilihan teknologi"). Phones never load this module.
// Files come from public/audio/manifest.json:
//   { "format": ["webm", "mp3"],
//     "sfx":   { "sah": ["sfx/sah-1", "sfx/sah-2"], "kolaps": { "files": ["sfx/kolaps"], "gain": 1 } },
//     "music": { "tenang": "music/tenang", "tegang": "music/tegang", "krisis": "music/krisis" } }
// Paths are relative to /audio/ and listed without extension; each is tried in the listed formats.
// Several files for one cue are variants played at random so repeats do not sound mechanical.

type Entry = string[] | { files: string[]; gain?: number };
interface Manifest {
  /** Set while the files are synthesized stand-ins (web/audio), so the console can say so. */
  temporary?: boolean;
  format?: string[];
  sfx?: Partial<Record<CueId, Entry>>;
  music?: Partial<Record<Mood, string | { file: string; gain?: number }>>;
}

const BASE = '/audio/';
const MUSIC_GAIN = 0.45;
const DUCKED = 0.3;
const FADE_MS = 1500;

/** Every cue requested, played or not, for the browser test and for checking a delivery. */
declare global { interface Window { __teiAudio?: { cue: CueId; at: number; played: boolean }[] } }

export interface AudioEngine {
  play(cues: CueId[]): void;
  /** Starts a cue part-way through, so a ten-second tick ends exactly when the clock does. */
  playFrom(cue: CueId, offsetSec: number): void;
  /** Cuts every playing copy of a cue: the tick stops the moment the clock pauses or changes. */
  stop(cue: CueId): void;
  music(state: { mood: Mood | null; duck: boolean }): void;
  apply(settings: AvSettings): void;
  dispose(): void;
}

export function createAudio(initial: AvSettings): AudioEngine {
  let settings = initial;
  let disposed = false;
  let Howl: typeof HowlType | null = null;
  let Howler: { volume(v: number): void; mute(m: boolean): void } | null = null;
  const sfx = new Map<CueId, { howls: HowlType[]; gain: number }>();
  const tracks = new Map<Mood, { howl: HowlType; gain: number }>();
  const lastPlayed = new Map<CueId, number>();
  const playing = new Map<CueId, { howl: HowlType; id: number }[]>();
  let mood: Mood | null = null;
  let duck = false;
  let wanted: { mood: Mood | null; duck: boolean } = { mood: null, duck: false };
  window.__teiAudio = [];

  const ready = (async () => {
    let manifest: Manifest;
    try {
      const res = await fetch(`${BASE}manifest.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(String(res.status));
      manifest = (await res.json()) as Manifest;
    } catch {
      audioStatus.set({ state: 'kosong' });
      return; // no audio delivered yet: the game is fully playable muted
    }
    const sfxCount = Object.keys(manifest.sfx ?? {}).length;
    const musicCount = Object.keys(manifest.music ?? {}).length;
    audioStatus.set(sfxCount + musicCount ? { state: 'siap', sfx: sfxCount, music: musicCount, temporary: !!manifest.temporary } : { state: 'kosong' });
    if (disposed || !(sfxCount + musicCount)) return;
    const howler = await import('howler');
    if (disposed) return;
    const HowlClass = howler.Howl;
    Howl = HowlClass;
    Howler = howler.Howler;
    const formats = manifest.format ?? ['webm', 'mp3'];
    const srcs = (path: string) => formats.map(f => `${BASE}${path}.${f}`);

    for (const [cue, entry] of Object.entries(manifest.sfx ?? {}) as [CueId, Entry][]) {
      if (!CUES[cue]) continue;
      const files = Array.isArray(entry) ? entry : entry.files;
      const gain = (Array.isArray(entry) ? undefined : entry.gain) ?? CUES[cue].gain;
      sfx.set(cue, { gain, howls: files.map(file => new HowlClass({ src: srcs(file), preload: true })) });
    }
    for (const [m, entry] of Object.entries(manifest.music ?? {}) as [Mood, string | { file: string; gain?: number }][]) {
      const file = typeof entry === 'string' ? entry : entry.file;
      const gain = (typeof entry === 'string' ? undefined : entry.gain) ?? MUSIC_GAIN;
      // Decoded whole (not streamed) so the loop point is sample-accurate: HTML5 audio leaves a gap.
      tracks.set(m, { gain, howl: new HowlClass({ src: srcs(file), loop: true, volume: 0, preload: true }) });
    }
    applyGlobal();
    setMusic(wanted);
  })();

  function applyGlobal() {
    Howler?.volume(settings.volume);
    Howler?.mute(settings.muted);
  }

  function trackVolume(m: Mood) {
    const track = tracks.get(m)!;
    return settings.music ? track.gain * (duck ? DUCKED : 1) : 0;
  }

  function setMusic(next: { mood: Mood | null; duck: boolean }) {
    wanted = next;
    if (!Howl) return;
    const previous = mood;
    mood = next.mood;
    duck = next.duck;
    if (previous && previous !== mood) {
      const old = tracks.get(previous);
      if (old) {
        old.howl.fade(old.howl.volume(), 0, FADE_MS);
        old.howl.once('fade', () => { if (mood !== previous) old.howl.pause(); });
      }
    }
    if (!mood) return;
    const track = tracks.get(mood);
    if (!track) return;
    if (!track.howl.playing()) track.howl.play();
    track.howl.fade(track.howl.volume(), trackVolume(mood), previous === mood ? 400 : FADE_MS);
  }

  /** Plays one variant of a cue and remembers it until it ends, so stop() can cut it. */
  function start(cue: CueId, entry: { howls: HowlType[]; gain: number }, offsetSec = 0): number {
    const howl = entry.howls[Math.floor(Math.random() * entry.howls.length)]!;
    const id = howl.play();
    howl.volume(entry.gain, id);
    if (offsetSec > 0) howl.seek(offsetSec, id);
    const list = playing.get(cue) ?? [];
    list.push({ howl, id });
    playing.set(cue, list);
    howl.once('end', () => playing.set(cue, (playing.get(cue) ?? []).filter(p => p.id !== id || p.howl !== howl)), id);
    return id;
  }

  return {
    playFrom(cue, offsetSec) {
      const entry = sfx.get(cue);
      const played = !!entry && settings.sfx && !settings.muted;
      window.__teiAudio?.push({ cue, at: Date.now(), played });
      if (!entry || !settings.sfx || disposed) return;
      start(cue, entry, offsetSec);
    },
    stop(cue) {
      for (const { howl, id } of playing.get(cue) ?? []) howl.stop(id);
      playing.delete(cue);
    },
    play(cues) {
      const now = Date.now();
      cues.forEach((cue, i) => {
        const spec = CUES[cue];
        const last = lastPlayed.get(cue) ?? 0;
        if (spec.throttleMs && now - last < spec.throttleMs) return;
        lastPlayed.set(cue, now);
        const entry = sfx.get(cue);
        const played = !!entry && settings.sfx && !settings.muted;
        window.__teiAudio?.push({ cue, at: now, played });
        if (!entry || !settings.sfx) return;
        // Several stamps in one update land a beat apart instead of on top of each other.
        setTimeout(() => {
          if (disposed) return;
          const id = start(cue, entry);
          const howl = playing.get(cue)!.at(-1)!.howl;
          if (spec.duck && mood) {
            const track = tracks.get(mood);
            if (track && settings.music) {
              track.howl.fade(track.howl.volume(), track.gain * DUCKED, 200);
              howl.once('end', () => { if (mood) track.howl.fade(track.howl.volume(), trackVolume(mood), 800); }, id);
            }
          }
        }, i * 220);
      });
    },
    music: state => { void ready.then(() => setMusic(state)); wanted = state; },
    apply(next) {
      settings = next;
      applyGlobal();
      if (mood && tracks.has(mood)) tracks.get(mood)!.howl.fade(tracks.get(mood)!.howl.volume(), trackVolume(mood), 300);
    },
    dispose() {
      disposed = true;
      for (const { howls } of sfx.values()) howls.forEach(h => h.unload());
      for (const { howl } of tracks.values()) howl.unload();
    },
  };
}
