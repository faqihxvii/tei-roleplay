import { tickOffset } from './derive';
import type { AudioEngine } from './player';

/**
 * The ticking clock under the last ten seconds of a running clock. `set` takes the clock's end
 * time (null while paused or untimed); any change cuts the tick at once, and `poll` starts it again
 * part-way through when the new clock is inside its last ten seconds.
 */
export function createTick(engine: () => Pick<AudioEngine, 'playFrom' | 'stop'> | null, now: () => number) {
  let endsAt: number | null = null;
  let ticking = false;
  const set = (next: number | null) => {
    if (next === endsAt) return;
    if (ticking) engine()?.stop('waktu.hampir');
    ticking = false;
    endsAt = next;
  };
  return {
    set,
    poll() {
      if (endsAt === null || ticking) return;
      const offset = tickOffset(endsAt - now());
      if (offset === null) return;
      ticking = true;
      engine()?.playFrom('waktu.hampir', offset);
    },
    dispose: () => set(null),
  };
}
