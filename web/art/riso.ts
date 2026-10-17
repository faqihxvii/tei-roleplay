// A tiny risograph toolkit for TEI's illustrations (docs/art-audio.md, "Arah"). Three inks on paper:
// black linework on top, red and pink plates printed a hair off register underneath, halftone dots
// for shading. Everything is plain SVG so it stays sharp on a projector and weighs a few kilobytes.

export const INK = '#1a1a1a';
export const RED = '#c30700';
export const PINK = '#e9806e';
export const PAPER = '#fffdf8';

/** How far the colour plates sit off the black plate, in drawing units. */
const MISREG = { x: 4, y: 3 };

export type Plate = string[];

export interface Drawing {
  /** Red and pink fills, printed first and shifted off register. */
  color: Plate;
  /** Black linework and solid black areas, printed on top. */
  ink: Plate;
}

export const drawing = (): Drawing => ({ color: [], ink: [] });

export function merge(...parts: Drawing[]): Drawing {
  return { color: parts.flatMap(p => p.color), ink: parts.flatMap(p => p.ink) };
}

/** Halftone and hatch fills, referenced as url(#ht-red) and so on. */
const DEFS = `<defs>
  <pattern id="ht-red" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(15)"><circle cx="3.5" cy="3.5" r="2.1" fill="${RED}"/></pattern>
  <pattern id="ht-red-light" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(15)"><circle cx="3.5" cy="3.5" r="1.2" fill="${RED}"/></pattern>
  <pattern id="ht-pink" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="2.1" fill="${PINK}"/></pattern>
  <pattern id="ht-pink-light" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.2" fill="${PINK}"/></pattern>
  <pattern id="ht-ink" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(75)"><circle cx="3" cy="3" r="1.1" fill="${INK}"/></pattern>
  <pattern id="hatch-ink" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.2" height="8" fill="${INK}"/></pattern>
  <pattern id="hatch-red" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="2.6" height="8" fill="${RED}"/></pattern>
</defs>`;

/** Wraps the plates in an SVG document; `title` becomes the accessible name. */
export function svg(width: number, height: number, d: Drawing, title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="t">
<title id="t">${escape(title)}</title>
${DEFS}
<g transform="translate(${MISREG.x} ${MISREG.y})" style="mix-blend-mode:multiply">${d.color.join('')}</g>
<g style="mix-blend-mode:multiply" stroke-linecap="round" stroke-linejoin="round">${d.ink.join('')}</g>
</svg>
`;
}

export function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Small builders, so drawings read as shapes rather than markup.

const attrs = (a: Record<string, string | number | undefined>) =>
  Object.entries(a).filter(([, v]) => v !== undefined).map(([k, v]) => ` ${k}="${v}"`).join('');

/** An ink outline (no fill unless given). */
export const line = (d: string, w = 6, extra: Record<string, string | number> = {}) => `<path d="${d}"${attrs({ fill: 'none', stroke: INK, 'stroke-width': w, ...extra })}/>`;
/** A solid fill on any plate: pass INK for black areas, a colour or a pattern for the colour plates. */
export const fill = (d: string, color: string, extra: Record<string, string | number> = {}) => `<path d="${d}"${attrs({ fill: color, ...extra })}/>`;
export const circle = (cx: number, cy: number, r: number, a: Record<string, string | number>) => `<circle${attrs({ cx, cy, r, ...a })}/>`;
export const ellipse = (cx: number, cy: number, rx: number, ry: number, a: Record<string, string | number>) => `<ellipse${attrs({ cx, cy, rx, ry, ...a })}/>`;
export const rect = (x: number, y: number, w: number, h: number, a: Record<string, string | number>) => `<rect${attrs({ x, y, width: w, height: h, ...a })}/>`;
/** Hand-lettered signage: bold condensed sans, ink. Images cannot load web fonts, so it stays generic. */
export const label = (x: number, y: number, text: string, size: number, a: Record<string, string | number> = {}) =>
  `<text${attrs({ x, y, 'font-family': "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif", 'font-weight': 800, 'font-size': size, 'text-anchor': 'middle', fill: INK, 'letter-spacing': 1, ...a })}>${escape(text)}</text>`;

/** Ink outline plus a matching colour fill on the shifted plate: the basic riso shape. */
export function shape(d: string, color: string | null, w = 6): Drawing {
  return { color: color ? [fill(d, color)] : [], ink: [line(d, w)] };
}
