import { animate, domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { avSettings, prefersReducedMotion } from './audio/settings';

// Motion (motion.dev) for the moments CSS keyframes cannot tell well: a chapter arriving, a number
// counting to its new value, a front page landing on the table. Stamps, the hold fill and the city
// loops stay in CSS. Durations and curves mirror the --duration-* and --ease-* tokens.

export { m } from 'motion/react';

function subscribeMotion(listener: () => void) {
  const query = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  query?.addEventListener('change', listener);
  const off = avSettings.subscribe(listener);
  return () => { query?.removeEventListener('change', listener); off(); };
}

/** Reduced motion from the OS setting or the console's "Kurangi gerak", updating when either changes. */
export const useReducedMotion = () => useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);

export const DUR = { fast: 0.18, base: 0.52, slow: 0.7 } as const;
export const EASE = {
  standard: [0.2, 0.65, 0.3, 1],
  paper: [0.2, 0.8, 0.2, 1],
  slam: [0.2, 0.9, 0.3, 1.2],
} as const satisfies Record<string, [number, number, number, number]>;

/** Loads the small animation feature set once and turns movement off under reduced motion (OS or console). */
export function MotionRoot({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={reduced ? 'always' : 'never'} transition={{ duration: DUR.base, ease: EASE.paper }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

/** A whole number that counts to its new value instead of jumping; instant under reduced motion. */
export function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const reduced = useReducedMotion();
  useEffect(() => {
    const from = shown.current;
    if (from === value || reduced) {
      shown.current = value;
      if (ref.current) ref.current.textContent = String(value);
      return;
    }
    const controls = animate(from, value, {
      duration: DUR.slow,
      ease: EASE.standard,
      onUpdate: v => {
        shown.current = Math.round(v);
        if (ref.current) ref.current.textContent = String(shown.current);
      },
    });
    return () => controls.stop();
  }, [value, reduced]);
  return <span ref={ref}>{value}</span>;
}
