import type { Role } from '../../engine/src/types';
import { BLUE, circle, drawing, ellipse, fill, INK, line, merge, PAPER, rect, RED, shape, svg, type Drawing } from './riso';

// The five caricature archetypes (GDD, "Ilustrasi"), each in four moods. Busts on a 320 × 320
// canvas. Gender is balanced across the cast and no figure carries an ethnic or religious marker
// (GDD, "Bahasa dan konten"); the satire is in the job, never in who they are.

export type Expression = 'tenang' | 'senang' | 'panik' | 'marah';
export const EXPRESSIONS: Expression[] = ['tenang', 'senang', 'panik', 'marah'];

export const ARCHETYPE: Record<Role, string> = {
  pemerintah: 'Menteri berdasi',
  bankSentral: 'Gubernur Bank Sentral dengan kalkulator',
  pengusaha: 'Bos Pabrik berhelm proyek',
  buruh: 'Ketua Serikat dengan toa',
  masyarakat: 'Ibu warga dengan tas belanja',
};

const EXPRESSION_LABEL: Record<Expression, string> = { tenang: 'tenang', senang: 'senang', panik: 'panik', marah: 'marah' };

// ---------- shared anatomy ----------

const HEAD = { cx: 160, cy: 146, rx: 72, ry: 82 };
const EYE_Y = 152;
const EYE_L = 131;
const EYE_R = 189;

function bust(suit: string, d = 'M28 320 C38 262 92 236 160 236 C228 236 282 262 292 320 Z'): Drawing {
  return shape(d, suit);
}

function neckAndEars(): Drawing {
  return {
    color: [],
    ink: [
      fill('M138 214 L138 246 L182 246 L182 214 Z', PAPER),
      line('M138 214 L138 246 M182 214 L182 246', 6),
      ellipse(HEAD.cx - HEAD.rx + 2, 156, 11, 17, { fill: PAPER, stroke: INK, 'stroke-width': 6 }),
      ellipse(HEAD.cx + HEAD.rx - 2, 156, 11, 17, { fill: PAPER, stroke: INK, 'stroke-width': 6 }),
    ],
  };
}

function head(rx = HEAD.rx, ry = HEAD.ry): Drawing {
  return {
    color: [ellipse(HEAD.cx, HEAD.cy, rx, ry, { fill: PAPER })],
    ink: [ellipse(HEAD.cx, HEAD.cy, rx, ry, { fill: PAPER, stroke: INK, 'stroke-width': 6 })],
  };
}

function nose(): Drawing {
  return { color: [], ink: [line('M161 160 Q152 180 164 184', 5)] };
}

function face(expr: Expression, opts: { browY?: number; heavyBrows?: boolean; glasses?: boolean } = {}): Drawing {
  const by = opts.browY ?? 124;
  const bw = opts.heavyBrows ? 9 : 6;
  const d = drawing();

  // Brows: calm arcs, raised for joy, inner ends up for panic, inner ends down for anger.
  const brows: Record<Expression, string> = {
    tenang: `M114 ${by + 2} Q131 ${by - 6} 146 ${by + 1} M174 ${by + 1} Q189 ${by - 6} 206 ${by + 2}`,
    senang: `M114 ${by - 6} Q131 ${by - 16} 146 ${by - 7} M174 ${by - 7} Q189 ${by - 16} 206 ${by - 6}`,
    panik: `M114 ${by + 6} L146 ${by - 8} M174 ${by - 8} L206 ${by + 6}`,
    marah: `M114 ${by - 6} L148 ${by + 8} M172 ${by + 8} L206 ${by - 6}`,
  };
  d.ink.push(line(brows[expr], bw));

  // Eyes.
  if (expr === 'tenang') {
    d.ink.push(ellipse(EYE_L, EYE_Y, 5.5, 7.5, { fill: INK }), ellipse(EYE_R, EYE_Y, 5.5, 7.5, { fill: INK }));
  } else if (expr === 'senang') {
    d.ink.push(line(`M119 ${EYE_Y + 4} Q131 ${EYE_Y - 10} 143 ${EYE_Y + 4} M177 ${EYE_Y + 4} Q189 ${EYE_Y - 10} 201 ${EYE_Y + 4}`, 6));
  } else if (expr === 'panik') {
    for (const x of [EYE_L, EYE_R]) {
      d.ink.push(circle(x, EYE_Y, 12, { fill: PAPER, stroke: INK, 'stroke-width': 5 }), circle(x, EYE_Y + 1, 4, { fill: INK }));
    }
  } else {
    d.ink.push(ellipse(EYE_L, EYE_Y + 2, 7, 5, { fill: INK }), ellipse(EYE_R, EYE_Y + 2, 7, 5, { fill: INK }));
  }

  if (opts.glasses) {
    d.ink.push(circle(EYE_L, EYE_Y, 21, { fill: 'none', stroke: INK, 'stroke-width': 5 }), circle(EYE_R, EYE_Y, 21, { fill: 'none', stroke: INK, 'stroke-width': 5 }));
    d.ink.push(line(`M152 ${EYE_Y - 2} Q160 ${EYE_Y - 8} 168 ${EYE_Y - 2} M110 ${EYE_Y - 4} L92 ${EYE_Y - 8} M210 ${EYE_Y - 4} L228 ${EYE_Y - 8}`, 4));
  }

  // Mouth.
  if (expr === 'tenang') {
    d.ink.push(line('M140 202 Q160 214 180 202', 6));
  } else if (expr === 'senang') {
    const m = 'M132 196 Q160 196 188 196 Q184 232 160 232 Q136 232 132 196 Z';
    d.color.push(fill('M140 212 Q160 206 180 212 Q174 230 160 230 Q146 230 140 212 Z', RED));
    d.ink.push(line(m, 6), line('M136 204 L184 204', 3));
  } else if (expr === 'panik') {
    d.ink.push(ellipse(160, 210, 11, 14, { fill: INK }));
    const drops = ['M246 178 Q258 196 252 206 Q240 210 240 196 Z', 'M72 184 Q80 200 74 210 Q62 210 64 198 Z'];
    for (const drop of drops) {
      d.color.push(fill(drop, BLUE));
      d.ink.push(line(drop, 4));
    }
  } else {
    d.ink.push(rect(138, 198, 44, 18, { rx: 4, fill: PAPER, stroke: INK, 'stroke-width': 6 }), line('M149 198 L149 216 M160 198 L160 216 M171 198 L171 216 M138 207 L182 207', 3));
    // The cartoon anger vein.
    const vein = 'M246 112 l9 -6 l2 9 l9 2 l-5 9 l-9 -2 l-5 7 l-2 -9 l-9 -3 z';
    d.color.push(fill(vein, RED));
    d.ink.push(line(vein, 3));
  }

  // Cheeks: a blush for calm and joy, a flush for anger.
  if (expr !== 'panik') {
    const tone = expr === 'marah' ? 'url(#ht-red)' : 'url(#ht-red-light)';
    d.color.push(ellipse(116, 184, 15, 10, { fill: tone }), ellipse(204, 184, 15, 10, { fill: tone }));
  }
  if (expr === 'senang') {
    d.ink.push(line('M60 70 l8 8 M52 98 l12 0 M66 46 l2 12 M260 70 l-8 8 M268 98 l-12 0 M254 46 l-2 12', 5));
  }
  return d;
}

// ---------- the cast ----------

function menteri(expr: Expression): Drawing {
  const suit = bust('url(#ht-blue)');
  const shirt: Drawing = { color: [fill('M126 238 L160 300 L194 238 Z', PAPER)], ink: [fill('M126 238 L160 300 L194 238 Z', PAPER), line('M126 238 L160 300 L194 238', 5)] };
  const tie = shape('M152 248 L168 248 L174 296 L160 314 L146 296 Z', RED, 5);
  const lapels: Drawing = { color: [], ink: [line('M126 238 L138 290 L118 270 M194 238 L182 290 L202 270', 5)] };
  const pin: Drawing = { color: [rect(214, 266, 14, 9, { fill: RED })], ink: [rect(214, 266, 14, 9, { fill: 'none', stroke: INK, 'stroke-width': 3 })] };
  const hair: Drawing = {
    color: [],
    ink: [fill('M88 136 C82 74 132 52 176 56 C224 60 242 98 232 140 C224 112 204 94 170 92 C150 120 112 112 88 136 Z', INK), line('M170 92 C176 80 186 70 200 66', 3, { stroke: PAPER })],
  };
  const mustache: Drawing = { color: [], ink: [fill('M138 190 Q160 178 182 190 Q172 197 160 193 Q148 197 138 190 Z', INK)] };
  return merge(suit, shirt, lapels, tie, pin, neckAndEars(), head(), hair, face(expr), nose(), mustache);
}

function gubernur(expr: Expression): Drawing {
  const blazer = bust('url(#ht-blue)');
  const blouse: Drawing = { color: [fill('M132 238 Q160 262 188 238 L184 320 L136 320 Z', PAPER)], ink: [fill('M132 238 Q160 262 188 238 L184 320 L136 320 Z', PAPER), line('M132 238 Q160 262 188 238', 5), line('M132 238 L120 300 M188 238 L200 300', 5)] };
  const pearls: Drawing = { color: [], ink: [0, 1, 2, 3, 4, 5, 6].map(i => circle(138 + i * 7.3, 252 + Math.sin((i / 6) * Math.PI) * 9, 3.6, { fill: PAPER, stroke: INK, 'stroke-width': 2 })) };
  const bun: Drawing = { color: [], ink: [circle(160, 56, 24, { fill: INK })] };
  const hair: Drawing = { color: [], ink: [fill('M84 172 C70 94 108 62 160 62 C212 62 250 94 236 172 C230 138 218 112 200 102 C176 114 140 114 118 104 C100 116 90 138 84 172 Z', INK)] };
  const calc: Drawing = {
    color: [rect(214, 252, 66, 70, { fill: PAPER, transform: 'rotate(-10 247 287)' }), rect(222, 258, 50, 16, { fill: 'url(#ht-blue-light)', transform: 'rotate(-10 247 287)' })],
    ink: [
      rect(214, 252, 66, 70, { rx: 6, fill: PAPER, stroke: INK, 'stroke-width': 5, transform: 'rotate(-10 247 287)' }),
      rect(222, 258, 50, 16, { fill: 'none', stroke: INK, 'stroke-width': 3, transform: 'rotate(-10 247 287)' }),
      `<g transform="rotate(-10 247 287)">${[0, 1, 2].flatMap(r => [0, 1, 2].map(c => circle(230 + c * 17, 286 + r * 13, 4, { fill: INK }))).join('')}</g>`,
    ],
  };
  return merge(blazer, blouse, pearls, neckAndEars(), bun, head(), hair, face(expr, { glasses: true, browY: 120 }), nose(), calc);
}

function bos(expr: Expression): Drawing {
  const shirt = bust('url(#ht-blue-light)', 'M22 320 C30 258 90 232 160 232 C230 232 290 258 298 320 Z');
  const vest: Drawing = {
    color: [fill('M40 320 C46 280 80 252 124 242 L144 320 Z', RED), fill('M280 320 C274 280 240 252 196 242 L176 320 Z', RED)],
    ink: [line('M40 320 C46 280 80 252 124 242 L144 320', 5), line('M280 320 C274 280 240 252 196 242 L176 320', 5), fill('M58 290 L136 282 L138 296 L54 304 Z', PAPER), fill('M262 290 L184 282 L182 296 L266 304 Z', PAPER)],
  };
  const chin: Drawing = { color: [], ink: [line('M128 232 Q160 246 192 232', 5)] };
  const helmet: Drawing = {
    color: [fill('M86 108 C84 40 236 40 234 108 Z', RED), fill('M70 102 L250 102 L250 116 L70 116 Z', RED)],
    ink: [line('M86 108 C84 40 236 40 234 108', 6), rect(70, 102, 180, 14, { rx: 5, fill: 'none', stroke: INK, 'stroke-width': 6 }), line('M160 46 L160 102 M126 56 Q120 78 122 102 M194 56 Q200 78 198 102', 4)],
  };
  return merge(shirt, vest, neckAndEars(), head(78, 82), chin, helmet, face(expr, { heavyBrows: true, browY: 128 }), nose());
}

function ketua(expr: Expression): Drawing {
  const shirt = bust('url(#ht-blue-light)');
  const collar: Drawing = { color: [], ink: [line('M134 238 L150 262 L160 244 L170 262 L186 238', 5), circle(160, 280, 3.5, { fill: INK }), circle(160, 304, 3.5, { fill: INK })] };
  const pony: Drawing = { color: [], ink: [fill('M218 96 C262 104 276 156 258 200 C250 176 240 150 220 130 Z', INK)] };
  const hair: Drawing = { color: [], ink: [fill('M86 152 C78 86 120 62 162 62 C206 62 242 90 234 152 C224 120 200 102 160 102 C124 102 98 120 86 152 Z', INK)] };
  const band: Drawing = {
    color: [fill('M86 120 C120 98 200 98 234 120 L232 136 C200 116 120 116 88 136 Z', RED), fill('M232 124 L262 112 L258 132 Z M232 130 L256 146 L240 150 Z', RED)],
    ink: [line('M86 120 C120 98 200 98 234 120 L232 136 C200 116 120 116 88 136 Z', 5), line('M232 124 L262 112 L258 132 Z M232 130 L256 146 L240 150 Z', 4)],
  };
  const toa: Drawing = shift(14, 0, {
    color: [fill('M26 214 L92 246 L84 296 L18 272 Z', PAPER), fill('M40 222 L50 227 L42 278 L32 275 Z M64 233 L74 238 L66 288 L56 285 Z', RED)],
    ink: [
      fill('M26 214 L92 246 L84 296 L18 272 Z', PAPER),
      line('M26 214 L92 246 L84 296 L18 272 Z', 6),
      ellipse(22, 243, 9, 30, { fill: PAPER, stroke: INK, 'stroke-width': 6, transform: 'rotate(18 22 243)' }),
      rect(88, 258, 26, 16, { rx: 3, fill: INK, transform: 'rotate(18 101 266)' }),
      line('M96 284 L104 312', 8),
      line('M8 222 L-4 212 M6 246 L-8 246 M10 268 L-2 280', 4),
    ],
  });
  return merge(shirt, collar, neckAndEars(), pony, head(), hair, band, face(expr, { browY: 136 - 10 }), nose(), toa);
}

function ibu(expr: Expression): Drawing {
  const daster = bust('url(#ht-red)');
  const neckline: Drawing = { color: [fill('M130 238 Q160 270 190 238 Z', PAPER)], ink: [fill('M130 238 Q160 270 190 238 Z', PAPER), line('M130 238 Q160 270 190 238', 5)] };
  const curls: Drawing = { color: [], ink: [] };
  // A permed crown of curls along the top of the head.
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (1.05 + (i / 10) * 0.9);
    curls.ink.push(circle(160 + Math.cos(a) * 74, 140 + Math.sin(a) * 82, 18, { fill: INK }));
  }
  curls.ink.push(fill('M100 112 C120 84 200 84 220 112 C200 100 120 100 100 112 Z', INK));
  const earrings: Drawing = { color: [circle(88, 182, 6, { fill: RED }), circle(232, 182, 6, { fill: RED })], ink: [circle(88, 182, 6, { fill: 'none', stroke: INK, 'stroke-width': 3 }), circle(232, 182, 6, { fill: 'none', stroke: INK, 'stroke-width': 3 })] };
  const leek: Drawing = {
    color: [fill('M246 230 C250 190 262 168 276 150 L284 158 C272 178 262 200 258 232 Z', BLUE), fill('M262 232 C270 204 286 186 302 176 L306 186 C292 198 280 214 274 234 Z', BLUE)],
    ink: [line('M246 230 C250 190 262 168 276 150 L284 158 C272 178 262 200 258 232', 4), line('M262 232 C270 204 286 186 302 176 L306 186 C292 198 280 214 274 234', 4)],
  };
  const bag: Drawing = {
    color: [fill('M214 238 L304 238 L296 320 L222 320 Z', 'url(#ht-blue-light)')],
    ink: [fill('M214 238 L304 238 L296 320 L222 320 Z', PAPER), line('M214 238 L304 238 L296 320 L222 320 Z', 6), line('M234 238 C234 210 284 210 284 238', 5), line('M222 262 L298 262', 3)],
  };
  return merge(daster, neckline, neckAndEars(), head(), curls, face(expr, { browY: 126 }), nose(), earrings, leek, bag);
}

/** Moves a whole part, on both plates. */
function shift(dx: number, dy: number, d: Drawing): Drawing {
  const wrap = (plate: string[]) => (plate.length ? [`<g transform="translate(${dx} ${dy})">${plate.join('')}</g>`] : []);
  return { color: wrap(d.color), ink: wrap(d.ink) };
}

const DRAW: Record<Role, (expr: Expression) => Drawing> = {
  pemerintah: menteri,
  bankSentral: gubernur,
  pengusaha: bos,
  buruh: ketua,
  masyarakat: ibu,
};

export function portrait(role: Role, expr: Expression): string {
  return svg(320, 320, DRAW[role](expr), `${ARCHETYPE[role]}, ${EXPRESSION_LABEL[expr]}`);
}
