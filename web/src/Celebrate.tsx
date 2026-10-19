import { useEffect, useRef } from 'react';
import { useReducedMotion } from './motion';

// Confetti for a Negara Sejahtera ending, drawn on one canvas for a few seconds and then removed.
// No library: a few hundred rectangles in the TEI inks are all it takes. Off under reduced motion.

const INKS = ['#c30700', '#171717', '#f5a99d', '#e0a100', '#5fb49c', '#1f5fa8'];

export function Confetti({ seconds = 4 }: { seconds?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);
    const bits = Array.from({ length: 220 }, () => ({
      x: Math.random() * w, y: -Math.random() * h * 0.6, vx: (Math.random() - 0.5) * 2.4, vy: 2 + Math.random() * 3.5,
      size: 6 + Math.random() * 8, spin: Math.random() * Math.PI, vs: (Math.random() - 0.5) * 0.3, ink: INKS[Math.floor(Math.random() * INKS.length)]!,
    }));
    const end = performance.now() + seconds * 1000;
    let frame = 0;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const b of bits) {
        b.x += b.vx; b.y += b.vy; b.spin += b.vs;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.spin);
        ctx.fillStyle = b.ink;
        ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2);
        ctx.restore();
      }
      if (t < end) frame = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, w, h);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [reduced, seconds]);
  if (reduced) return null;
  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}
