import { useEffect, useRef } from 'react';
import type { PlayerView } from '../../room/src/views';

// Phones stay silent and only vibrate (GDD, "Audio"). A short buzz on every phase change so phones on
// the desk call attention (GDD, "UX/UI"), and a distinct pattern when this player has to act.
// Every buzz has an on-screen counterpart: the phase title, the Jubir card, the pact list.

export const BUZZ = {
  fase: [60],
  giliran: [80],
  jubir: [60, 40, 60],
  tawaran: [100, 50, 100],
  sah: [120],
  selesai: [40, 30, 40],
} as const;

export function buzzFor(prev: PlayerView | null, next: PlayerView): readonly number[] | null {
  if (!prev || !next.team) return null;
  const spokesperson = next.me.isSpokesperson;
  const newStep = next.phase === 'tahun' && next.step !== prev.step;
  if (newStep && (next.step === 'lobi' || next.step === 'pengesahan') && spokesperson) return BUZZ.jubir;
  if (newStep && next.step === 'rapat') return BUZZ.giliran;
  if (next.phase === 'tebak' && prev.phase !== 'tebak' && spokesperson) return BUZZ.jubir;
  // A new offer buzzes the whole team, not only the Jubir: everyone should know an offer is waiting.
  if (next.phase === 'tahun' && next.step === 'lobi') {
    const seen = new Set(prev.pacts.map(p => p.id));
    if (next.pacts.some(p => !seen.has(p.id) && p.status === 'diajukan' && p.to === next.team!.role)) return BUZZ.tawaran;
  }
  // The Jubir already felt their own hold confirm; the rest of the team feels it land.
  const lockedNow = next.teams.find(t => t.role === next.team!.role)?.locked;
  const lockedBefore = prev.teams.find(t => t.role === next.team!.role)?.locked;
  if (!newStep && lockedNow && !lockedBefore && !spokesperson) return BUZZ.sah;
  // The same for "Tim kami selesai" in Rapat and Lobi.
  const readyNow = next.teams.find(t => t.role === next.team!.role)?.ready;
  const readyBefore = prev.teams.find(t => t.role === next.team!.role)?.ready;
  if (!newStep && readyNow && !readyBefore && !lockedNow && !spokesperson) return BUZZ.selesai;
  if (next.phase !== prev.phase || next.step !== prev.step) return BUZZ.fase;
  return null;
}

export function useHaptics(view: PlayerView | null) {
  const prev = useRef<PlayerView | null>(null);
  useEffect(() => {
    if (!view) return;
    const pattern = buzzFor(prev.current, view);
    prev.current = view;
    if (pattern) navigator.vibrate?.([...pattern]);
  }, [view]);
}
