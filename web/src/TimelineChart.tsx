import { useState } from 'react';
import type { Indicator } from '../../engine/src/types';
import type { PublicStats } from '../../room/src/views';
import { INDICATOR_LABEL, INDICATOR_ORDER, signed, ZONES } from './text';

// Five small multiples, one per indicator, on the same 0–10 scale. One ink colour: the panel
// title carries identity, so nothing depends on telling colours apart. Points are buttons:
// tapping one picks that year as the turning point to trace.

const W = 280;
const H = 160;
const PAD = { left: 26, right: 30, top: 12, bottom: 24 };

interface Props {
  timeline: { year: number; stats: PublicStats }[];
  focus: { stat: Indicator; year: number } | null;
  onPick?: (stat: Indicator, year: number) => void;
}

export function TimelineChart({ timeline, focus, onPick }: Props) {
  return (
    <div className="multiples">
      {INDICATOR_ORDER.map(stat => (
        <Panel key={stat} stat={stat} timeline={timeline} focus={focus} onPick={onPick} />
      ))}
    </div>
  );
}

function Panel({ stat, timeline, focus, onPick }: Props & { stat: Indicator }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = Math.max(1, timeline.length - 1);
  const x = (i: number) => PAD.left + (i / n) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / 10) * (H - PAD.top - PAD.bottom);
  const zone = ZONES[stat];
  const dangerTop = zone.worseWhen === 'tinggi' ? y(10) : y(zone.danger);
  const dangerBottom = zone.worseWhen === 'tinggi' ? y(zone.danger) : y(0);
  const points = timeline.map((t, i) => ({ i, year: t.year, value: t.stats[stat] }));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.i)},${y(p.value)}`).join(' ');
  const last = points.at(-1)!;
  const hovered = hover !== null ? points[hover] : null;

  return (
    <figure className="panel">
      <figcaption>{INDICATOR_LABEL[stat]}</figcaption>
      <div className="panel-plot">
        {/* With tappable years the chart is a group of buttons; without, one image. */}
        <svg viewBox={`0 0 ${W} ${H}`} role={onPick ? 'group' : 'img'} aria-label={`${INDICATOR_LABEL[stat]}: ${points.map(p => `${p.year === 0 ? 'awal' : `tahun ${p.year}`} ${p.value}`).join(', ')}`}>
          <defs>
            <pattern id={`hatch-${stat}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" className="hatch-line" />
            </pattern>
          </defs>
          <rect x={PAD.left} y={dangerTop} width={W - PAD.left - PAD.right} height={dangerBottom - dangerTop} fill={`url(#hatch-${stat})`} />
          {[0, 5, 10].map(v => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="grid" />
              <text x={PAD.left - 6} y={y(v) + 4} className="tick" textAnchor="end">{v}</text>
            </g>
          ))}
          {points.map(p => (
            <text key={p.i} x={x(p.i)} y={H - 6} className="tick" textAnchor="middle">{p.year === 0 ? 'Awal' : p.year}</text>
          ))}
          {hovered && <line x1={x(hovered.i)} x2={x(hovered.i)} y1={PAD.top} y2={H - PAD.bottom} className="crosshair" />}
          <path d={path} className="series" />
          {points.map(p => {
            const focused = focus?.stat === stat && focus.year === p.year;
            return <circle key={p.i} cx={x(p.i)} cy={y(p.value)} r={focused ? 6 : 4} className={`dot${focused ? ' focused' : ''}`} />;
          })}
          <text x={x(last.i) + 8} y={y(last.value) + 4} className="end-label">{last.value}</text>
          {points.map(p => p.year > 0 && (
            <circle
              key={`hit-${p.i}`}
              cx={x(p.i)}
              cy={y(p.value)}
              r={14}
              className="hit"
              tabIndex={onPick ? 0 : undefined}
              role={onPick ? 'button' : undefined}
              aria-label={onPick ? `${INDICATOR_LABEL[stat]} tahun ${p.year}: ${p.value}. Telusuri penyebabnya.` : undefined}
              onMouseEnter={() => setHover(p.i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(p.i)}
              onBlur={() => setHover(null)}
              onClick={() => onPick?.(stat, p.year)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick?.(stat, p.year); } }}
            />
          ))}
        </svg>
        {hovered && (
          <div className="tip" style={{ left: `${(x(hovered.i) / W) * 100}%`, top: `${(y(hovered.value) / H) * 100}%` }} role="tooltip">
            <strong>Tahun {hovered.year}: {hovered.value}</strong>
            {hovered.i > 0 && <span> ({hovered.value === points[hovered.i - 1]!.value ? 'tetap' : signed(hovered.value - points[hovered.i - 1]!.value)})</span>}
            {onPick && <span className="tip-hint">Ketuk untuk telusuri</span>}
          </div>
        )}
      </div>
    </figure>
  );
}
