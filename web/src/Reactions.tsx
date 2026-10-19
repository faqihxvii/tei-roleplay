import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Role } from '../../engine/src/types';
import type { ReactionKind } from '../../room/src/protocol';
import { m, useReducedMotion } from './motion';

// Live reactions: phones send one of four, the main screen floats them up from the bottom edge.
// Emoji are the players' own voices here, not interface icons. Under reduced motion the screen only
// keeps a quiet running count.

export const REACTION_FACE: Record<ReactionKind, { face: string; label: string }> = {
  tawa: { face: '😂', label: 'Ngakak' },
  marah: { face: '😡', label: 'Geram' },
  tepuk: { face: '👏', label: 'Tepuk tangan' },
  uang: { face: '💸', label: 'Boros!' },
};

interface Floating { id: number; kind: ReactionKind; x: number; role: Role | null }

let nextId = 0;

/** The main screen's reaction layer; `push` is called for every reaction message from the server. */
export function useReactionLayer() {
  const [floating, setFloating] = useState<Floating[]>([]);
  const [counts, setCounts] = useState<Record<ReactionKind, number>>({ tawa: 0, marah: 0, tepuk: 0, uang: 0 });
  const push = useCallback((kind: ReactionKind, role: Role | null) => {
    const item = { id: ++nextId, kind, role, x: 6 + Math.random() * 88 };
    setFloating(list => [...list.slice(-24), item]);
    setCounts(c => ({ ...c, [kind]: c[kind] + 1 }));
    setTimeout(() => setFloating(list => list.filter(f => f.id !== item.id)), 2600);
  }, []);
  return { floating, counts, push };
}

export function ReactionLayer({ floating, counts }: { floating: Floating[]; counts: Record<ReactionKind, number> }) {
  const reduced = useReducedMotion();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className="reaction-layer" aria-hidden="true">
      {!reduced && (
        <AnimatePresence>
          {floating.map(f => (
            <m.span
              key={f.id}
              className="reaction-float"
              style={{ left: `${f.x}%` }}
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], y: -260, scale: 1.2, rotate: (f.x % 2 ? 1 : -1) * 12 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.4, ease: 'easeOut' }}
            >
              {REACTION_FACE[f.kind].face}
            </m.span>
          ))}
        </AnimatePresence>
      )}
      {total > 0 && (
        <span className="reaction-count">
          {(Object.keys(counts) as ReactionKind[]).filter(k => counts[k]).map(k => `${REACTION_FACE[k].face} ${counts[k]}`).join('  ')}
        </span>
      )}
    </div>
  );
}

/** The phone's reaction bar: four buttons with a short cool-down, matching the server's limit. */
export function ReactionBar({ onReact }: { onReact: (kind: ReactionKind) => void }) {
  const [cooling, setCooling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const react = (kind: ReactionKind) => {
    if (cooling) return;
    onReact(kind);
    navigator.vibrate?.(15);
    setCooling(true);
    timer.current = setTimeout(() => setCooling(false), 800);
  };
  return (
    <div className="reaction-bar" role="group" aria-label="Kirim reaksi ke layar utama">
      {(Object.keys(REACTION_FACE) as ReactionKind[]).map(kind => (
        <button key={kind} type="button" className="reaction-btn" disabled={cooling} onClick={() => react(kind)} aria-label={REACTION_FACE[kind].label}>
          <span aria-hidden="true">{REACTION_FACE[kind].face}</span>
        </button>
      ))}
    </div>
  );
}
