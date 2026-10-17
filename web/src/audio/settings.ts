import { useSyncExternalStore } from 'react';
import { storage } from '../socket';

// Sound and motion settings for the main screen, set from the facilitator console (GDD: master volume
// and mute live in the console; the main screen has its own reduced-motion switch). Per laptop.

export interface AvSettings {
  volume: number;
  muted: boolean;
  music: boolean;
  sfx: boolean;
  reducedMotion: boolean;
}

const KEY = 'tei:av';
const DEFAULTS: AvSettings = { volume: 0.8, muted: false, music: true, sfx: true, reducedMotion: false };

function load(): AvSettings {
  try {
    const raw = storage.get(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AvSettings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let current = load();
const listeners = new Set<() => void>();

function applyMotion(reduced: boolean) {
  if (typeof document === 'undefined') return;
  if (reduced) document.documentElement.dataset.motion = 'reduced';
  else delete document.documentElement.dataset.motion;
}

export const avSettings = {
  get: () => current,
  set(patch: Partial<AvSettings>) {
    current = { ...current, ...patch, volume: Math.max(0, Math.min(1, patch.volume ?? current.volume)) };
    storage.set(KEY, JSON.stringify(current));
    applyMotion(current.reducedMotion);
    listeners.forEach(l => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  /** Call once on the host screen so a saved reduced-motion choice holds from the first frame. */
  init() { applyMotion(current.reducedMotion); },
};

export function useAvSettings(): AvSettings {
  return useSyncExternalStore(avSettings.subscribe, avSettings.get, avSettings.get);
}

/** Reduced motion from either the OS setting or the console switch. */
export function prefersReducedMotion(): boolean {
  const os = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return os || current.reducedMotion;
}

/** What the audio engine found in public/audio/manifest.json, for the console. */
export type AudioStatus = { state: 'memuat' } | { state: 'kosong' } | { state: 'siap'; sfx: number; music: number };
let status: AudioStatus = { state: 'memuat' };
const statusListeners = new Set<() => void>();
export const audioStatus = {
  get: () => status,
  set(next: AudioStatus) { status = next; statusListeners.forEach(l => l()); },
  subscribe(listener: () => void) {
    statusListeners.add(listener);
    return () => { statusListeners.delete(listener); };
  },
};
export const useAudioStatus = () => useSyncExternalStore(audioStatus.subscribe, audioStatus.get, audioStatus.get);
