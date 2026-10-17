import type { ReactNode } from 'react';
import { indexNegara } from '../../engine/src/scoring';
import type { PublicStats } from '../../room/src/views';
import { zoneOf } from './text';

// The city diorama on the main screen (GDD, "Diorama kota"): six districts, each showing one number
// as a scene. A queue at the market when prices climb, a cold chimney when jobs go, a crowd in the
// street when unrest rises. The board beside it carries the exact numbers; this carries the feeling.

type Zone = 'aman' | 'bahaya' | 'kolaps';

const INK = '#1a1a1a';
const RED = '#c91212';
const BLUE = '#0067a5';
const PAPER = '#fffdf8';

export function districtZones(stats: PublicStats): Record<'pasar' | 'pabrik' | 'bank' | 'kantor' | 'permukiman' | 'jalan', Zone> {
  const index = indexNegara({ ...stats, tabungan: 0 } as never);
  return {
    pasar: zoneOf('harga', stats.harga),
    // Jobs have no collapse line; very few jobs reads as a closed factory.
    pabrik: stats.kerja <= 2 ? 'kolaps' : zoneOf('kerja', stats.kerja),
    bank: zoneOf('kas', stats.kas),
    kantor: zoneOf('kepercayaan', stats.kepercayaan),
    permukiman: index <= 3 ? 'kolaps' : index <= 5 ? 'bahaya' : 'aman',
    jalan: zoneOf('keresahan', stats.keresahan),
  };
}

const ZONE_TEXT: Record<Zone, string> = { aman: 'aman', bahaya: 'bahaya', kolaps: 'kolaps' };

/** A shape printed riso-style: colour plate shifted, ink outline on top. */
function Riso({ d, color, w = 4 }: { d: string; color?: string; w?: number }) {
  return (
    <>
      {color && <path d={d} fill={color} transform="translate(3 2)" />}
      <path d={d} fill="none" stroke={INK} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" />
    </>
  );
}

function Person({ x, y, sign, raised = false }: { x: number; y: number; sign?: boolean; raised?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={0} cy={-34} r={7} fill={PAPER} stroke={INK} strokeWidth={3} />
      <path d="M0 -27 L0 -8 M0 -8 L-6 4 M0 -8 L6 4" stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <path d={raised ? 'M0 -22 L-8 -38 M0 -22 L9 -16' : 'M0 -22 L-8 -12 M0 -22 L8 -12'} stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      {sign && (
        <g className="dio-wave">
          <path d="M9 -16 L9 -52" stroke={INK} strokeWidth={3} />
          <rect x={-6} y={-70} width={30} height={20} fill={RED} transform="translate(2 1)" />
          <rect x={-6} y={-70} width={30} height={20} fill="none" stroke={INK} strokeWidth={3} />
        </g>
      )}
    </g>
  );
}

function District({ x, name, zone, children }: { x: number; name: string; zone: Zone; children: ReactNode }) {
  return (
    <g transform={`translate(${x} 0)`} className={`dio-district ${zone}`}>
      {zone !== 'aman' && <rect x={6} y={18} width={148} height={192} fill={zone === 'kolaps' ? 'url(#dio-ht-red)' : 'url(#dio-ht-red-light)'} rx={6} />}
      {children}
      <text x={80} y={240} textAnchor="middle" className="dio-name">{name}</text>
      <text x={80} y={258} textAnchor="middle" className={`dio-zone ${zone}`}>{zone === 'aman' ? '' : ZONE_TEXT[zone].toUpperCase()}</text>
    </g>
  );
}

export function Diorama({ stats }: { stats: PublicStats }) {
  const z = districtZones(stats);
  const label = `Kota: pasar ${z.pasar}, pabrik ${z.pabrik}, kas negara ${z.bank}, kantor pemerintah ${z.kantor}, permukiman ${z.permukiman}, jalan raya ${z.jalan}.`;
  const queue = z.pasar === 'aman' ? 0 : z.pasar === 'bahaya' ? 3 : 6;
  const crowd = z.jalan === 'aman' ? 0 : z.jalan === 'bahaya' ? 3 : 6;
  return (
    <figure className="diorama">
      <svg viewBox="0 0 960 266" role="img" aria-label={label}>
        <defs>
          <pattern id="dio-ht-red" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(15)"><circle cx="3.5" cy="3.5" r="1.9" fill={RED} opacity="0.55" /></pattern>
          <pattern id="dio-ht-red-light" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(15)"><circle cx="3.5" cy="3.5" r="1.1" fill={RED} opacity="0.5" /></pattern>
          <pattern id="dio-ht-blue" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.6" fill={BLUE} /></pattern>
          <pattern id="dio-ht-ink" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(75)"><circle cx="3" cy="3" r="1.1" fill={INK} /></pattern>
        </defs>
        <path d="M0 210 L960 210" stroke={INK} strokeWidth={5} />

        {/* Pasar: price tags rise and a queue forms. */}
        <District x={0} name="Pasar" zone={z.pasar}>
          <Riso d="M20 210 L20 130 L140 130 L140 210" color="url(#dio-ht-blue)" />
          <Riso d="M12 132 L30 100 L130 100 L148 132 Z" color={RED} />
          <path d="M40 100 L34 132 M70 100 L66 132 M100 100 L100 132" stroke={INK} strokeWidth={3} />
          {z.pasar === 'kolaps' && <text x={80} y={176} textAnchor="middle" className="dio-sign">HABIS</text>}
          {z.pasar !== 'kolaps' && <g><circle cx={56} cy={170} r={9} fill={RED} /><circle cx={80} cy={174} r={9} fill={BLUE} /><circle cx={104} cy={170} r={9} fill={RED} /><path d="M40 182 L120 182" stroke={INK} strokeWidth={4} /></g>}
          {Array.from({ length: queue }, (_, i) => <Person key={i} x={150 - i * 13} y={210} />)}
        </District>

        {/* Pabrik: smoke when people work; a chained gate when they do not. */}
        <District x={160} name="Pabrik" zone={z.pabrik}>
          <Riso d="M14 210 L14 120 L50 96 L50 120 L86 96 L86 120 L122 96 L122 210 Z" color="url(#dio-ht-ink)" />
          <Riso d="M128 210 L128 64 L146 64 L146 210" color={RED} />
          {z.pabrik === 'aman' && <g className="dio-smoke"><circle cx={137} cy={48} r={10} fill="url(#dio-ht-ink)" /><circle cx={150} cy={30} r={13} fill="url(#dio-ht-ink)" /><circle cx={140} cy={10} r={9} fill="url(#dio-ht-ink)" /></g>}
          {z.pabrik === 'aman' && <g fill={PAPER} stroke={INK} strokeWidth={3}><rect x={28} y={140} width={18} height={18} /><rect x={62} y={140} width={18} height={18} /><rect x={96} y={140} width={18} height={18} /></g>}
          {z.pabrik === 'bahaya' && <text x={68} y={160} textAnchor="middle" className="dio-sign">PHK</text>}
          {z.pabrik === 'kolaps' && <g><path d="M40 170 Q68 190 96 170" stroke={INK} strokeWidth={4} strokeDasharray="6 4" fill="none" /><rect x={60} y={176} width={16} height={14} fill={INK} /><text x={68} y={150} textAnchor="middle" className="dio-sign">TUTUP</text></g>}
        </District>

        {/* Bank: the vault fills or empties with the treasury. */}
        <District x={320} name="Kas Negara" zone={z.bank}>
          <Riso d="M18 210 L18 110 L142 110 L142 210" color="url(#dio-ht-blue)" />
          <Riso d="M10 112 L80 70 L150 112 Z" color={PAPER} />
          <path d="M36 120 L36 200 M62 120 L62 200 M98 120 L98 200 M124 120 L124 200" stroke={INK} strokeWidth={5} />
          {Array.from({ length: z.bank === 'aman' ? 5 : z.bank === 'bahaya' ? 2 : 0 }, (_, i) => (
            <g key={i}><circle cx={52 + (i % 3) * 28} cy={194 - Math.floor(i / 3) * 16} r={9} fill={RED} transform="translate(2 1)" /><circle cx={52 + (i % 3) * 28} cy={194 - Math.floor(i / 3) * 16} r={9} fill="none" stroke={INK} strokeWidth={3} /></g>
          ))}
          {z.bank === 'kolaps' && <text x={80} y={176} textAnchor="middle" className="dio-sign">KOSONG</text>}
        </District>

        {/* Kantor pemerintah: the flag drops to half-mast with trust. */}
        <District x={480} name="Kantor Pemerintah" zone={z.kantor}>
          <Riso d="M20 210 L20 120 L140 120 L140 210" color={PAPER} />
          <Riso d="M50 120 L50 96 L110 96 L110 120" color="url(#dio-ht-ink)" />
          <path d="M80 96 L80 22" stroke={INK} strokeWidth={4} />
          {z.kantor === 'kolaps'
            ? <text x={80} y={176} textAnchor="middle" className="dio-sign">LENGSER?</text>
            : <Riso d={z.kantor === 'aman' ? 'M80 24 L116 32 L80 42 Z' : 'M80 58 L112 66 L80 76 Z'} color={RED} w={3} />}
          {z.kantor !== 'kolaps' && <g fill={PAPER} stroke={INK} strokeWidth={3}><rect x={34} y={140} width={16} height={22} /><rect x={72} y={140} width={16} height={22} /><rect x={110} y={140} width={16} height={22} /></g>}
          {z.kantor !== 'aman' && <path d="M30 128 L44 150 L36 168 M124 130 L114 152" stroke={INK} strokeWidth={3} fill="none" />}
        </District>

        {/* Permukiman: lit windows when life is good, dark ones when it is not. */}
        <District x={640} name="Permukiman" zone={z.permukiman}>
          {[0, 1, 2].map(i => (
            <g key={i} transform={`translate(${12 + i * 46} ${i === 1 ? -16 : 0})`}>
              <Riso d="M0 210 L0 150 L42 150 L42 210" color={i === 1 ? 'url(#dio-ht-blue)' : PAPER} />
              <Riso d="M-4 152 L21 124 L46 152 Z" color={RED} w={3.5} />
              <rect x={13} y={164} width={16} height={16} fill={z.permukiman === 'aman' || (z.permukiman === 'bahaya' && i !== 1) ? PAPER : INK} stroke={INK} strokeWidth={3} />
            </g>
          ))}
        </District>

        {/* Jalan raya: traffic, then protesters, then a burning tyre. */}
        <District x={800} name="Jalan Raya" zone={z.jalan}>
          <path d="M8 196 L152 196" stroke={INK} strokeWidth={3} strokeDasharray="14 10" />
          {z.jalan === 'aman' && <g><Riso d="M30 196 L34 176 L60 172 L72 182 L96 184 L96 196 Z" color={BLUE} w={3.5} /><circle cx={44} cy={200} r={7} fill={INK} /><circle cx={84} cy={200} r={7} fill={INK} /></g>}
          {Array.from({ length: crowd }, (_, i) => <Person key={i} x={26 + i * 22} y={206} sign={i % 2 === 0} raised={i % 2 === 1} />)}
          {z.jalan === 'kolaps' && <g className="dio-smoke"><circle cx={120} cy={120} r={14} fill="url(#dio-ht-ink)" /><circle cx={132} cy={96} r={18} fill="url(#dio-ht-ink)" /><path d="M110 196 C104 170 122 168 118 150 C134 166 138 180 130 196 Z" fill={RED} /></g>}
        </District>
      </svg>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
