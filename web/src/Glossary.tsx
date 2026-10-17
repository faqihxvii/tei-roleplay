import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { gloss, lookup, type GlossaryEntry } from './content/glossary';

// Tap-to-explain for economic terms (GDD, "Bahasa dan konten"). A term is a button; its
// explanation opens beneath it and closes on a second tap, a tap elsewhere, or Escape.

export function Term({ entry, children }: { entry: GlossaryEntry; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key); };
  }, [open]);

  return (
    <span className="term-wrap" ref={wrap}>
      <button type="button" className="term" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
        {children}
      </button>
      {open && (
        <span id={id} role="note" className="term-pop">
          <strong>{entry.term}</strong> {entry.text}
        </span>
      )}
    </span>
  );
}

/** Running text with each glossary term made tappable, once per block. */
export function Glossed({ text }: { text: string }) {
  return <>{gloss(text).map((piece, i) => (typeof piece === 'string' ? piece : <Term key={i} entry={piece.term}>{piece.text}</Term>))}</>;
}

/** A row of concept tags; those in the glossary can be tapped. */
export function Concepts({ list, label = 'Konsep' }: { list: string[]; label?: string }) {
  return (
    <p className="concepts">
      <span className="kicker">{label}</span>{' '}
      {list.map(c => {
        const entry = lookup(c);
        return <span key={c} className="concept">{entry ? <Term entry={entry}>{c}</Term> : c}</span>;
      })}
    </p>
  );
}
