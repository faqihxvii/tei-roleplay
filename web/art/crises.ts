import { PINK, circle, ellipse, fill, INK, label, line, merge, PAPER, rect, RED, shape, svg, type Drawing } from './riso';

// One editorial cartoon per crisis card (GDD, "Daftar aset vertical slice": 12 kartu krisis), on a
// 480 × 320 canvas. Each is a single object doing something it should not: a sack walking off, an
// umbrella full of holes. Shared staging: a halftone spotlight behind, a shadow underneath.

const W = 480;
const H = 320;

function stage(spot = 'url(#ht-pink-light)', shadow = true): Drawing {
  return {
    color: [circle(240, 156, 132, { fill: spot })],
    ink: shadow ? [ellipse(240, 292, 168, 13, { fill: 'url(#ht-ink)' })] : [],
  };
}

const coin = (x: number, y: number, r = 13): Drawing => ({
  color: [circle(x, y, r, { fill: RED })],
  ink: [circle(x, y, r, { fill: 'none', stroke: INK, 'stroke-width': 4 }), line(`M${x - r * 0.35} ${y} L${x + r * 0.35} ${y}`, 3)],
});

const up = (x: number, y: number, s = 1, color = RED): Drawing => {
  const d = `M${x} ${y} l${14 * s} ${16 * s} l${-7 * s} 0 l0 ${18 * s} l${-14 * s} 0 l0 ${-18 * s} l${-7 * s} 0 z`;
  return { color: [fill(d, color)], ink: [line(d, 3.5)] };
};

const down = (x: number, y: number, s = 1, color = RED): Drawing => {
  const d = `M${x} ${y} l${14 * s} ${-16 * s} l${-7 * s} 0 l0 ${-18 * s} l${-14 * s} 0 l0 ${18 * s} l${-7 * s} 0 z`;
  return { color: [fill(d, color)], ink: [line(d, 3.5)] };
};

const motion = (d: string): Drawing => ({ color: [], ink: [line(d, 4)] });

function phone(x: number, y: number, w: number, h: number, screen = 'url(#ht-pink-light)'): Drawing {
  return {
    color: [rect(x + 10, y + 22, w - 20, h - 44, { fill: screen })],
    ink: [rect(x, y, w, h, { rx: 18, fill: PAPER, stroke: INK, 'stroke-width': 6 }), rect(x + 10, y + 22, w - 20, h - 44, { fill: 'none', stroke: INK, 'stroke-width': 3 }), line(`M${x + w / 2 - 12} ${y + 11} L${x + w / 2 + 12} ${y + 11}`, 4), circle(x + w / 2, y + h - 11, 5, { fill: 'none', stroke: INK, 'stroke-width': 3 })],
  };
}

// ---------- the cards ----------

function beras(): Drawing {
  const sack = shape('M146 290 L136 176 Q140 150 168 156 L250 156 Q276 150 282 176 L272 290 Z', PAPER);
  const tie = { color: [], ink: [line('M168 156 Q209 140 250 156', 5), line('M196 150 Q190 128 204 122 M222 150 Q230 128 216 120', 4)] };
  const name = { color: [rect(160, 206, 98, 40, { fill: 'url(#ht-red-light)' })], ink: [rect(160, 206, 98, 40, { fill: 'none', stroke: INK, 'stroke-width': 3 }), label(209, 236, 'BERAS', 26)] };
  const grains = { color: [], ink: [ellipse(186, 272, 4, 2.5, { fill: INK }), ellipse(232, 266, 4, 2.5, { fill: INK, transform: 'rotate(30 232 266)' }), ellipse(210, 280, 4, 2.5, { fill: INK })] };
  // The price tag floats away on its string.
  const string = { color: [], ink: [line('M236 154 C270 120 300 120 326 92', 3, { 'stroke-dasharray': '2 7' })] };
  const tag = {
    color: [fill('M326 92 L352 50 L420 74 L404 120 L338 98 Z', RED)],
    ink: [line('M326 92 L352 50 L420 74 L404 120 L338 98 Z', 5), circle(342, 84, 6, { fill: PAPER, stroke: INK, 'stroke-width': 3 }), label(382, 98, 'Rp↑', 26, { transform: 'rotate(18 382 90)' })],
  };
  const plate = { color: [ellipse(374, 270, 44, 10, { fill: 'url(#ht-pink)' })], ink: [ellipse(374, 266, 44, 10, { fill: PAPER, stroke: INK, 'stroke-width': 5 }), ellipse(374, 262, 9, 4, { fill: 'none', stroke: INK, 'stroke-width': 3 })] };
  return merge(stage(), sack, tie, name, grains, string, tag, up(440, 150, 0.9), up(300, 70, 0.6), plate);
}

function pupuk(): Drawing {
  const legs = { color: [], ink: [line('M196 262 L184 296 L168 298 M244 262 L258 294 L276 290', 7)] };
  const sack = shape('M150 270 L146 150 Q150 128 176 134 L252 134 Q278 128 282 150 L278 270 Z', PAPER);
  const top = { color: [], ink: [line('M176 134 Q214 116 252 134', 5)] };
  const name = { color: [rect(162, 168, 104, 64, { fill: 'url(#ht-pink-light)' })], ink: [rect(162, 168, 104, 64, { fill: 'none', stroke: INK, 'stroke-width': 3 }), label(214, 196, 'PUPUK', 24), label(214, 222, 'BERSUBSIDI', 15)] };
  const speed = motion('M120 170 L60 170 M126 200 L46 200 M120 230 L72 230');
  const steps = { color: [], ink: [40, 80, 112].map((x, i) => ellipse(x, 292 - (i % 2) * 6, 9, 4, { fill: INK })) };
  const sign = {
    color: [fill('M310 118 L440 118 L462 140 L440 162 L310 162 Z', RED)],
    ink: [line('M380 162 L380 292', 7), line('M310 118 L440 118 L462 140 L440 162 L310 162 Z', 5), label(380, 146, 'PASAR GELAP', 14)],
  };
  return merge(stage('url(#ht-red-light)'), steps, speed, legs, sack, top, name, sign);
}

function minyak(): Drawing {
  const barrel = shape('M130 130 L130 280 Q190 300 250 280 L250 130 Z', 'url(#ht-ink)');
  const lid = { color: [], ink: [ellipse(190, 130, 60, 16, { fill: PAPER, stroke: INK, 'stroke-width': 6 }), line('M130 180 Q190 198 250 180 M130 232 Q190 250 250 232', 5)] };
  const drop = { color: [fill('M190 186 C206 210 210 222 190 230 C170 222 174 210 190 186 Z', RED)], ink: [fill('M190 186 C206 210 210 222 190 230 C170 222 174 210 190 186 Z', PAPER), line('M190 186 C206 210 210 222 190 230 C170 222 174 210 190 186 Z', 4)] };
  // The price line bursts through the ceiling.
  const chart = { color: [], ink: [line('M60 250 L120 220 L170 236 L260 140 L320 160 L410 46', 8), line('M386 44 L414 40 L412 70', 8)] };
  const ceiling = { color: [], ink: [line('M300 80 L460 80', 5, { 'stroke-dasharray': '14 10' }), line('M380 70 L370 54 M410 84 L428 92 M396 66 L404 52', 4)] };
  const crack = { color: [circle(404, 78, 18, { fill: 'url(#ht-red)' })], ink: [] };
  return merge(stage(), crack, barrel, lid, drop, chart, ceiling);
}

function listrik(): Drawing {
  const night: Drawing = { color: [rect(0, 0, W, H, { fill: 'url(#ht-pink)' })], ink: [] };
  const skyline = 'M0 300 L0 230 L40 230 L40 200 L90 200 L90 240 L140 240 L140 180 L200 180 L200 250 L250 250 L250 210 L300 210 L300 240 L360 240 L360 190 L420 190 L420 230 L480 230 L480 300 Z';
  const windowsCut = [[156, 196], [176, 216], [60, 214], [270, 222], [374, 206], [394, 226]].map(([x, y]) => `M${x} ${y} h12 v14 h-12 Z`).join(' ');
  const roofs = { color: [rect(372, 204, 16, 18, { fill: RED })], ink: [fill(`${skyline} ${windowsCut}`, INK, { 'fill-rule': 'evenodd' })] };
  const cord = { color: [], ink: [line('M240 0 L240 66', 5)] };
  const bulb = {
    color: [circle(240, 112, 42, { fill: PAPER })],
    ink: [rect(226, 62, 28, 16, { rx: 3, fill: INK }), circle(240, 112, 42, { fill: PAPER, stroke: INK, 'stroke-width': 6 }), line('M222 110 L234 122 M234 110 L222 122 M246 110 L258 122 M258 110 L246 122', 5), line('M226 140 Q240 132 254 140', 4), line('M262 80 L250 102 L262 108 L248 132', 3)],
  };
  const candle = { color: [fill('M362 150 C372 132 368 120 362 112 C356 120 352 132 362 150 Z', RED)], ink: [rect(352, 150, 20, 40, { fill: PAPER, stroke: INK, 'stroke-width': 4 }), line('M362 150 C372 132 368 120 362 112 C356 120 352 132 362 150 Z', 3)] };
  const pylon = { color: [], ink: [line('M80 196 L100 70 L120 196 M86 160 L114 160 M92 120 L108 120 M70 92 L130 92 M130 92 L180 110', 5)] };
  const spark = { color: [fill('M180 104 l12 -10 l-2 14 l14 0 l-12 10 l2 -14 z', RED)], ink: [line('M180 104 l12 -10 l-2 14 l14 0 l-12 10 l2 -14 z', 3)] };
  return merge(night, roofs, pylon, spark, cord, bulb, candle);
}

function asuransi(): Drawing {
  const rain = motion('M60 30 L50 60 M110 20 L100 50 M380 30 L370 60 M430 50 L420 80 M330 14 L320 44 M150 40 L140 70');
  const canopy = shape('M100 150 Q240 20 380 150 Q345 132 310 150 Q275 132 240 150 Q205 132 170 150 Q135 132 100 150 Z', RED);
  const holes = { color: [], ink: [circle(170, 112, 13, { fill: PAPER, stroke: INK, 'stroke-width': 4 }), circle(248, 84, 11, { fill: PAPER, stroke: INK, 'stroke-width': 4 }), circle(310, 118, 14, { fill: PAPER, stroke: INK, 'stroke-width': 4 })] };
  const shaft = { color: [], ink: [line('M240 44 L240 64', 7), line('M240 150 L240 262 Q240 286 216 286 Q196 286 196 266', 7)] };
  const name = { color: [], ink: [label(240, 136, 'ASURANSI', 18)] };
  const coins = merge(coin(170, 176, 11), coin(160, 222), coin(310, 186, 11), coin(322, 240), coin(250, 132, 9));
  const puddle = { color: [ellipse(300, 286, 70, 9, { fill: 'url(#ht-red-light)' })], ink: [] };
  return merge(stage(), rain, puddle, canopy, holes, name, shaft, coins);
}

function pinjol(): Drawing {
  const hand = phone(170, 36, 140, 252, 'url(#ht-red-light)');
  const offer = { color: [], ink: [label(240, 96, 'CAIR', 30), label(240, 128, '5 MENIT!', 22), line('M196 150 L284 150', 3)] };
  // The fine print is a hook.
  const hook = { color: [], ink: [line('M240 160 L240 214 Q240 244 270 244 Q298 244 298 218', 7), line('M298 218 L310 230 M298 218 L288 232', 6)] };
  const wallet = {
    color: [rect(330, 196, 96, 64, { fill: 'url(#ht-pink)', transform: 'rotate(-14 378 228)' })],
    ink: [rect(330, 196, 96, 64, { rx: 8, fill: 'none', stroke: INK, 'stroke-width': 6, transform: 'rotate(-14 378 228)' }), line('M300 222 L336 216', 4)],
  };
  const bubbles = {
    color: [circle(318, 54, 18, { fill: RED }), circle(144, 92, 15, { fill: RED }), circle(138, 186, 13, { fill: RED })],
    ink: [circle(318, 54, 18, { fill: 'none', stroke: INK, 'stroke-width': 4 }), label(318, 62, '!', 22), circle(144, 92, 15, { fill: 'none', stroke: INK, 'stroke-width': 4 }), label(144, 99, '!', 18), circle(138, 186, 13, { fill: 'none', stroke: INK, 'stroke-width': 4 }), label(138, 192, '!', 16)],
  };
  return merge(stage(), hand, offer, hook, wallet, bubbles);
}

function phk(): Drawing {
  const factory = shape('M80 290 L80 160 L140 120 L140 160 L200 120 L200 160 L260 120 L260 160 L320 120 L320 290 Z', 'url(#ht-ink)');
  const chimney = shape('M340 290 L340 70 L380 70 L380 290 Z', 'url(#ht-red-light)');
  const cold = { color: [], ink: [line('M352 54 Q360 44 368 54', 3, { 'stroke-dasharray': '3 6' })] };
  const gate = { color: [rect(146, 210, 108, 80, { fill: PAPER })], ink: [rect(146, 210, 108, 80, { fill: PAPER, stroke: INK, 'stroke-width': 6 }), line('M164 210 L164 290 M182 210 L182 290 M200 210 L200 290 M218 210 L218 290 M236 210 L236 290', 4)] };
  const chain = { color: [], ink: [line('M146 238 Q200 262 254 238', 5, { 'stroke-dasharray': '8 5' }), rect(188, 248, 24, 22, { rx: 4, fill: INK }), line('M193 248 Q200 236 207 248', 4)] };
  const sign = { color: [rect(150, 168, 100, 32, { fill: RED, transform: 'rotate(-6 200 184)' })], ink: [rect(150, 168, 100, 32, { fill: 'none', stroke: INK, 'stroke-width': 4, transform: 'rotate(-6 200 184)' }), label(200, 193, 'TUTUP', 22, { transform: 'rotate(-6 200 184)' })] };
  const spool = (x: number, y: number): Drawing => ({
    color: [ellipse(x, y, 16, 22, { fill: 'url(#ht-pink)' })],
    ink: [ellipse(x, y, 16, 22, { fill: 'none', stroke: INK, 'stroke-width': 4 }), line(`M${x - 18} ${y - 26} L${x + 18} ${y - 26} M${x - 18} ${y + 26} L${x + 18} ${y + 26}`, 5), line(`M${x + 16} ${y + 10} Q${x + 60} ${y + 30} ${x + 70} ${y + 4}`, 2.5)],
  });
  return merge(stage(), factory, chimney, cold, gate, chain, sign, spool(404, 262), spool(110, 268));
}

function ojol(): Drawing {
  const helmet = {
    color: [fill('M110 270 C100 180 160 140 220 150 C270 158 300 200 296 270 Z', 'url(#ht-pink)')],
    ink: [line('M110 270 C100 180 160 140 220 150 C270 158 300 200 296 270 Z', 6), fill('M190 196 C220 186 270 196 290 230 L290 254 L196 254 Z', INK), line('M104 270 L302 270', 7)],
  };
  const screen = phone(320, 120, 100, 170, 'url(#ht-pink)');
  const off = { color: [], ink: [line('M354 186 A22 22 0 1 0 386 186', 6), line('M370 170 L370 198', 6)] };
  const sign = { color: [rect(70, 70, 120, 50, { fill: RED, transform: 'rotate(-8 130 95)' })], ink: [rect(70, 70, 120, 50, { fill: 'none', stroke: INK, 'stroke-width': 5, transform: 'rotate(-8 130 95)' }), label(130, 106, 'OFF', 34, { transform: 'rotate(-8 130 95)' })] };
  const wheel = { color: [], ink: [circle(70, 262, 30, { fill: 'none', stroke: INK, 'stroke-width': 9 }), circle(70, 262, 6, { fill: INK })] };
  return merge(stage(), wheel, helmet, screen, off, sign);
}

function data(): Drawing {
  const folder = shape('M100 290 L120 160 L190 160 L204 176 L320 176 L340 290 Z', 'url(#ht-red-light)');
  const back = { color: [], ink: [line('M120 176 L330 176', 4)] };
  const card = (x: number, y: number, r: number): Drawing => ({
    color: [rect(x, y, 70, 46, { fill: 'url(#ht-pink-light)', transform: `rotate(${r} ${x + 35} ${y + 23})` })],
    ink: [
      rect(x, y, 70, 46, { rx: 5, fill: 'none', stroke: INK, 'stroke-width': 4, transform: `rotate(${r} ${x + 35} ${y + 23})` }),
      `<g transform="rotate(${r} ${x + 35} ${y + 23})">${circle(x + 18, y + 20, 8, { fill: INK })}${line(`M${x + 34} ${y + 16} L${x + 60} ${y + 16} M${x + 34} ${y + 26} L${x + 56} ${y + 26} M${x + 10} ${y + 37} L${x + 60} ${y + 37}`, 3)}</g>`,
    ],
  });
  const cards = merge(card(150, 100, -12), card(230, 60, 10), card(320, 96, 22), card(370, 30, -8), card(120, 34, -24));
  const lock = {
    color: [rect(360, 200, 70, 60, { fill: RED })],
    ink: [rect(360, 200, 70, 60, { rx: 6, fill: 'none', stroke: INK, 'stroke-width': 6 }), line('M372 200 L372 170 Q372 146 395 146 Q414 146 418 164', 7), line('M395 222 L395 240', 6), line('M420 160 L436 150', 4)],
  };
  return merge(stage(), cards, folder, back, lock);
}

function judol(): Drawing {
  const machine = phone(190, 30, 150, 260, 'url(#ht-red-light)');
  const reels = { color: [], ink: [0, 1, 2].map(i => rect(208 + i * 40, 104, 34, 54, { rx: 4, fill: PAPER, stroke: INK, 'stroke-width': 4 })).concat([label(225, 142, '7', 32), label(265, 142, '7', 32), label(305, 142, '?', 32)]) };
  const lever = { color: [circle(374, 74, 13, { fill: RED })], ink: [line('M340 160 L362 160 L374 86', 6), circle(374, 74, 13, { fill: 'none', stroke: INK, 'stroke-width': 4 })] };
  const slot = { color: [], ink: [rect(232, 198, 66, 10, { rx: 5, fill: INK })] };
  const envelope = {
    color: [rect(54, 190, 108, 70, { fill: PAPER, transform: 'rotate(-10 108 225)' })],
    ink: [rect(54, 190, 108, 70, { fill: PAPER, stroke: INK, 'stroke-width': 5, transform: 'rotate(-10 108 225)' }), line('M54 190 L108 228 L162 190', 4, { transform: 'rotate(-10 108 225)' }), label(108, 250, 'GAJI', 20, { transform: 'rotate(-10 108 225)' })],
  };
  const sucked = merge(coin(176, 196, 9), coin(204, 206, 8), coin(150, 176, 7));
  const pull = motion('M160 168 Q200 160 232 196 M150 214 Q200 220 232 206');
  return merge(stage(), envelope, pull, sucked, machine, reels, slot, lever);
}

function rupiah(): Drawing {
  const ladder = { color: [], ink: [line('M380 290 L380 70 M410 290 L410 70 M380 110 L410 110 M380 150 L410 150 M380 190 L410 190 M380 230 L410 230', 5)] };
  const slide = shape('M110 290 Q150 290 200 230 L360 80 L380 80 L380 104 L216 254 Q170 300 110 304 Z', 'url(#ht-pink-light)');
  const note = {
    color: [rect(250, 120, 86, 44, { fill: RED, transform: 'rotate(42 293 142)' })],
    ink: [rect(250, 120, 86, 44, { rx: 3, fill: 'none', stroke: INK, 'stroke-width': 4, transform: 'rotate(42 293 142)' }), label(293, 152, 'Rp', 26, { transform: 'rotate(42 293 142)' })],
  };
  const whoosh = motion('M246 96 L216 120 M262 84 L238 104 M232 116 L206 140');
  const balloon = {
    color: [circle(180, 74, 34, { fill: 'url(#ht-pink)' })],
    ink: [circle(180, 74, 34, { fill: 'none', stroke: INK, 'stroke-width': 5 }), label(180, 86, '$', 34), line('M180 108 Q170 140 186 170', 3)],
  };
  return merge(stage(), ladder, slide, whoosh, note, balloon, up(130, 40, 0.8, PINK));
}

function resesi(): Drawing {
  const sea: Drawing = { color: [rect(0, 250, W, 70, { fill: 'url(#ht-pink)' })], ink: [line('M0 252 Q40 240 80 252 T160 252 T240 252 T320 252 T400 252 T480 252', 5)] };
  const hull = shape('M80 210 L400 210 L370 262 L110 262 Z', RED);
  const deck = { color: [], ink: [line('M80 210 L400 210', 6)] };
  const container = (x: number, y: number, c: string | null): Drawing => ({
    color: c ? [rect(x, y, 60, 34, { fill: c })] : [],
    ink: [rect(x, y, 60, 34, { fill: c ? 'none' : PAPER, stroke: INK, 'stroke-width': 4, 'stroke-dasharray': c ? undefined : '8 6' } as Record<string, string | number>), line(`M${x + 15} ${y + 4} L${x + 15} ${y + 30} M${x + 30} ${y + 4} L${x + 30} ${y + 30} M${x + 45} ${y + 4} L${x + 45} ${y + 30}`, 2.5)],
  });
  const cargo = merge(container(110, 176, 'url(#ht-pink-light)'), container(176, 176, null), container(242, 176, null), container(308, 176, null), container(176, 142, null));
  const cabin = shape('M330 140 L380 140 L380 210 L330 210 Z', PAPER);
  const glass = { color: [], ink: [rect(340, 150, 30, 16, { fill: INK })] };
  const globe = {
    color: [circle(100, 80, 44, { fill: 'url(#ht-pink-light)' })],
    ink: [circle(100, 80, 44, { fill: 'none', stroke: INK, 'stroke-width': 5 }), line('M56 80 L144 80 M100 36 Q70 80 100 124 Q130 80 100 36', 3)],
  };
  return merge(stage('url(#ht-red-light)', false), sea, globe, down(176, 116, 1.2), hull, deck, cargo, cabin, glass);
}

function latihan(): Drawing {
  const hand = phone(160, 30, 160, 262);
  const bubble = (x: number, y: number, w: number, text: string, color: string, size = 16): Drawing => ({
    color: [rect(x, y, w, 34, { fill: color })],
    ink: [rect(x, y, w, 34, { rx: 12, fill: 'none', stroke: INK, 'stroke-width': 3.5 }), label(x + w / 2, y + 23, text, size)],
  });
  const chat = merge(bubble(172, 66, 124, 'HARGA NAIK!!', 'url(#ht-red-light)', 13), bubble(196, 110, 104, 'katanya…', PAPER, 14), bubble(172, 154, 124, 'TERUSKAN!!!', 'url(#ht-red-light)', 13), bubble(200, 198, 100, 'sumber?', PAPER, 14));
  const forwards = { color: [], ink: [line('M120 90 Q90 110 120 130 M118 138 L128 132 L120 124', 4), line('M360 140 Q392 160 360 180 M362 188 L352 182 L360 174', 4)] };
  return merge(stage(), hand, chat, forwards);
}

export const CRISIS_ART: Record<string, { title: string; draw: () => Drawing }> = {
  c_beras: { title: 'Karung beras dengan label harga yang terbang', draw: beras },
  c_pupuk: { title: 'Karung pupuk bersubsidi berkaki berjalan ke pasar gelap', draw: pupuk },
  c_minyak: { title: 'Grafik harga minyak menjebol langit-langit', draw: minyak },
  c_listrik: { title: 'Bohlam padam di atas kota gelap', draw: listrik },
  c_asuransi: { title: 'Payung asuransi berlubang, koin berjatuhan', draw: asuransi },
  c_pinjol: { title: 'Ponsel menawarkan pinjaman cair dengan kail', draw: pinjol },
  c_phk: { title: 'Pabrik tutup dengan gerbang dirantai', draw: phk },
  c_ojol: { title: 'Helm pengemudi dan ponsel yang dimatikan', draw: ojol },
  c_data: { title: 'Kartu identitas beterbangan dari map, gembok rusak', draw: data },
  c_judol: { title: 'Ponsel mesin slot menyedot amplop gaji', draw: judol },
  c_rupiah: { title: 'Uang rupiah meluncur turun, dolar terbang naik', draw: rupiah },
  c_resesi: { title: 'Kapal kargo dengan peti kemas kosong', draw: resesi },
  c_latihan: { title: 'Grup keluarga penuh pesan harga naik', draw: latihan },
  // Paket Okt 2026: monthly packs reuse the cartoon of the nearest classic crisis with their own title,
  // so a new pack needs no new drawing (docs/paket-krisis.md).
  c_cabai: { title: 'Karung bahan pangan dengan label harga yang terbang', draw: beras },
  c_makansiang: { title: 'Jatah makan siang sekolah dengan label harga yang terbang', draw: beras },
  c_antrebbm: { title: 'Grafik harga bahan bakar menjebol langit-langit', draw: minyak },
  c_pinjolguru: { title: 'Ponsel menawarkan pinjaman cair dengan kail', draw: pinjol },
  c_phkmassal: { title: 'Pabrik tutup dengan gerbang dirantai', draw: phk },
  c_potongan: { title: 'Helm pengemudi dan ponsel aplikasi', draw: ojol },
  c_bursa: { title: 'Uang rupiah meluncur turun, dolar terbang naik', draw: rupiah },
};

export function crisisArt(id: string): string {
  const art = CRISIS_ART[id]!;
  return svg(W, H, art.draw(), art.title);
}

