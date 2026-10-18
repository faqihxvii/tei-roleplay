import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ROLE_CODE, ROLE_COLOR, ROLE_INK, ROLE_LABEL } from '../../engine/src/content/roles';
import type { Role } from '../../engine/src/types';
import type { PublicStats } from '../../room/src/views';
import { avSettings, prefersReducedMotion } from './audio/settings';
import { formatSeconds, useSecondsLeft } from './socket';
import { INDICATOR_LABEL, INDICATOR_ORDER, signed, ZONES, zoneOf } from './text';

function subscribeMotion(listener: () => void) {
  const query = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  query?.addEventListener('change', listener);
  const off = avSettings.subscribe(listener);
  return () => { query?.removeEventListener('change', listener); off(); };
}

/** Reduced motion from the OS setting or the console's "Kurangi gerak", updating when either changes. */
export const useReducedMotion = () => useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);

/**
 * Keeps the page title on where the class is and says each change once through a polite live region,
 * so a screen reader hears "Tahun 2 · Rapat Tim" when the step moves on.
 */
export function StepAnnouncer({ label }: { label: string }) {
  useEffect(() => { document.title = `${label} · TEI`; }, [label]);
  return <p className="sr-only" aria-live="polite" aria-atomic="true">{label}</p>;
}

/** Spread on any element that draws a role: fill, text colour on the fill, and the role's pattern. */
export const roleProps = (role: Role) => ({
  'data-role': role,
  style: { ['--role' as string]: ROLE_COLOR[role], ['--role-ink' as string]: ROLE_INK[role] },
});

/** The TEI lockup from economic.co.id: the red TEI square and the name in three lines. */
export function TeiLogo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`tei-logo${inverse ? ' inverse' : ''}`} role="img" aria-label="The Economic Influence">
      <span className="tei-mark" aria-hidden="true">TEI</span>
      <span className="tei-word" aria-hidden="true"><span>The</span><span>Economic</span><span>Influence</span></span>
    </span>
  );
}

export function RoleMark({ role, small = false }: { role: Role; small?: boolean }) {
  return (
    <span className={`role-mark${small ? ' small' : ''}`} {...roleProps(role)} aria-hidden="true">
      {ROLE_CODE[role]}
    </span>
  );
}

export function RoleName({ role }: { role: Role }) {
  return <span className="role-name"><RoleMark role={role} small />{ROLE_LABEL[role]}</span>;
}

/** The public board: five indicators on 0–10 with their danger zones, plus the policy rate. */
export function Board({ stats, compact = false, strip = false, changes }: { stats: PublicStats; compact?: boolean; strip?: boolean; changes?: Partial<Record<keyof PublicStats, number>> }) {
  return (
    <section className={`board${compact || strip ? ' compact' : ''}${strip ? ' strip' : ''}`} aria-label="Papan Negara">
      {INDICATOR_ORDER.map(stat => {
        const value = stats[stat];
        const zone = zoneOf(stat, value);
        const z = ZONES[stat];
        const change = changes?.[stat];
        return (
          <div key={stat} className={`gauge ${zone}`}>
            <div className="gauge-head">
              <span className="gauge-label">{INDICATOR_LABEL[stat]}</span>
              <span className="gauge-value">
                {value}
                {change ? <span className={`delta ${(z.worseWhen === 'tinggi') === change < 0 ? 'up' : 'down'}`}>{signed(change)}</span> : null}
              </span>
            </div>
            <div className="gauge-track" role="meter" aria-valuemin={0} aria-valuemax={10} aria-valuenow={value} aria-label={`${INDICATOR_LABEL[stat]} ${value} dari 10${zone !== 'aman' ? `, ${zone}` : ''}`}>
              <div className="gauge-fill" style={{ width: `${value * 10}%` }} />
              <div className={`gauge-danger ${z.worseWhen}`} style={z.worseWhen === 'tinggi' ? { left: `${(z.danger - 1) * 10}%` } : { width: `${z.danger * 10}%` }} />
            </div>
            {!compact && zone !== 'aman' && <span className="gauge-zone">{zone === 'kolaps' ? 'KOLAPS' : 'Bahaya'}</span>}
          </div>
        );
      })}
      <div className="gauge bunga">
        <div className="gauge-head">
          <span className="gauge-label">Suku bunga</span>
          <span className="gauge-value">{stats.bunga}<small>/5</small></span>
        </div>
      </div>
    </section>
  );
}

export function Timer({ endsAt, pausedMs, now, big = false }: { endsAt: number | null; pausedMs: number | null; now: () => number; big?: boolean }) {
  const seconds = useSecondsLeft(endsAt, now);
  if (pausedMs !== null) return <span className={`timer${big ? ' big' : ''} paused`}>Jeda · {formatSeconds(Math.ceil(pausedMs / 1000))}</span>;
  if (seconds === null) return null;
  // Screen readers hear only the last 30 and 10 seconds (GDD, "Waktu dan gerak").
  const announce = seconds === 30 || seconds === 10;
  return (
    <span className={`timer${big ? ' big' : ''}${seconds <= 10 ? ' urgent' : ''}`}>
      <span aria-hidden="true">{formatSeconds(seconds)}</span>
      <span className="sr-only" aria-live="polite">{announce ? `${seconds} detik lagi` : ''}</span>
    </span>
  );
}

/** Press and hold for a second to confirm; a tap does nothing (GDD, "Momen kunci": tombol SAH). */
export function HoldButton({ label, onConfirm, disabled = false, ms = 1000 }: { label: ReactNode; onConfirm: () => void; disabled?: boolean; ms?: number }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = () => {
    if (disabled || timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      navigator.vibrate?.(120);
      onConfirm();
    }, ms);
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  useEffect(() => cancel, []);
  return (
    <button
      type="button"
      className={`btn hold${holding ? ' holding' : ''}`}
      style={{ ['--hold-ms' as string]: `${ms}ms` }}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } }}
      onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') cancel(); }}
      onContextMenu={e => e.preventDefault()}
      aria-describedby="hold-hint"
    >
      <span className="hold-fill" aria-hidden="true" />
      <span className="hold-label">{label}</span>
      <span id="hold-hint" className="sr-only">Tahan tombol selama satu detik untuk mengesahkan.</span>
    </button>
  );
}

/** Steps a list forward on a timer, for the dramatic reveal; reduced motion shows everything at once. */
export function useSequence(length: number, intervalMs: number, key: unknown): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? length : 0);
  useEffect(() => {
    if (reduced) { setShown(length); return; }
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(i);
      if (i >= length) clearInterval(id);
    }, intervalMs);
    return () => clearInterval(id);
  }, [key, length, intervalMs, reduced]);
  return shown;
}
