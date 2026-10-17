import { useEffect, useRef } from 'react';
import type { HostView } from '../../../room/src/views';
import { cueBus } from './bus';
import { cuesFor, musicFor } from './derive';
import { createAudio, type AudioEngine } from './player';
import { avSettings, useAvSettings } from './settings';

/** Sound for the main screen: state changes, the paced reveal, the last ten seconds, and the loops. */
export function useHostAudio(view: HostView | null, now: () => number, enabled = true) {
  const engine = useRef<AudioEngine | null>(null);
  const prev = useRef<HostView | null>(null);
  const settings = useAvSettings();

  useEffect(() => {
    avSettings.init();
    if (!enabled) return;
    const audio = createAudio(avSettings.get());
    engine.current = audio;
    const off = cueBus.on(cues => audio.play(cues));
    return () => { off(); audio.dispose(); engine.current = null; };
  }, [enabled]);

  useEffect(() => { engine.current?.apply(settings); }, [settings]);

  useEffect(() => {
    if (!view || !engine.current) return;
    engine.current.play(cuesFor(prev.current, view));
    engine.current.music(musicFor(view));
    prev.current = view;
  }, [view]);

  // One ticking clock per phase, from ten seconds left; never while paused.
  const endsAt = view?.phaseEndsAt ?? null;
  const clock = useRef(now);
  clock.current = now;
  const tickedFor = useRef<number | null>(null);
  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => {
      const left = Math.ceil((endsAt - clock.current()) / 1000);
      if (tickedFor.current !== endsAt && left <= 10 && left > 0) {
        tickedFor.current = endsAt;
        engine.current?.play(['waktu.hampir']);
      }
    }, 250);
    return () => clearInterval(id);
  }, [endsAt]);
}
