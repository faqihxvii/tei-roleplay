import { useEffect, useRef, useState } from 'react';
import type { HostView } from '../../../room/src/views';
import { cueBus } from './bus';
import { cuesFor, musicFor } from './derive';
import { createAudio, type AudioEngine } from './player';
import { avSettings, useAvSettings } from './settings';
import { createTick } from './tick';

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

  // The ticking clock under the last ten seconds; a pause, a resume, extra time or the next step
  // changes phaseEndsAt, which cuts it at once (tick.ts).
  const clock = useRef(now);
  clock.current = now;
  const [tick] = useState(() => createTick(() => engine.current, () => clock.current()));
  const endsAt = view?.phaseEndsAt ?? null;
  useEffect(() => { tick.set(endsAt); }, [tick, endsAt]);
  useEffect(() => {
    const id = setInterval(() => tick.poll(), 250);
    return () => { clearInterval(id); tick.dispose(); };
  }, [tick]);
}
