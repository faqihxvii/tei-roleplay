import type { CueId } from './cues';

// For sounds whose timing lives on the main screen itself (the paced reveal), not in the room state.
// Tiny on purpose: components import this, never the audio engine.

type Listener = (cues: CueId[]) => void;
const listeners = new Set<Listener>();

export const cueBus = {
  emit(cues: CueId[]) { if (cues.length) listeners.forEach(l => l(cues)); },
  on(listener: Listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
