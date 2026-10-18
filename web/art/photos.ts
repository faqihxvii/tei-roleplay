import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Harian TEI front-page photos: one Unsplash photo per crisis card, listed with its credit in
// web/art/photos.json. `npm run art:photos` downloads each source once (cached under
// node_modules/.cache) and prints it as newsprint: a 3:2 crop in two inks, the riso black on the
// paper white, so photos sit on the page like the illustrations do. The manifest entries come from
// build.ts, so tests never need the network.

export interface PhotoCredit {
  id: string;
  page: string;
  image: string;
  photographer: string;
  username: string;
  alt: string;
  focus: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PHOTOS: Record<string, PhotoCredit> = JSON.parse(readFileSync(path.join(HERE, 'photos.json'), 'utf8'));
export const photoFile = (crisisId: string) => `foto/${crisisId}.webp`;

const W = 960;
const H = 640;
const INK = [0x1a, 0x1a, 0x1a];
const PAPER = [0xff, 0xfd, 0xf8];
const MAX_BYTES = 60_000;

async function source(credit: PhotoCredit): Promise<Buffer> {
  const cache = path.join(HERE, '..', '..', 'node_modules', '.cache', 'tei-photos');
  const file = path.join(cache, `${credit.id}.jpg`);
  if (existsSync(file)) return readFileSync(file);
  const url = `${credit.image.split('?')[0]}?fm=jpg&q=85&w=1920`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${credit.id}: ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(cache, { recursive: true });
  writeFileSync(file, buf);
  return buf;
}

/** Grey, levelled, then mapped onto ink → paper with a gentle S-curve so midtones keep their detail. */
async function newsprint(input: Buffer, focus: PhotoCredit['focus']): Promise<Buffer> {
  const { data } = await sharp(input).rotate().resize(W, H, { fit: 'cover', position: focus }).grayscale().normalise().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const g = data[i]! / 255;
    const t = g < 0.5 ? 2 * g * g : 1 - 2 * (1 - g) * (1 - g);
    const v = 0.15 * g + 0.85 * t;
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(INK[c]! + (PAPER[c]! - INK[c]!) * v);
  }
  // Busy textures (a whole rice field) compress badly: step the quality down until the file fits.
  // If even that is not enough, soften the grain a little: newsprint never held that detail anyway.
  let webp = Buffer.alloc(0);
  for (const blur of [0, 0.8, 1.2]) {
    for (const quality of [62, 54, 46, 38]) {
      const img = sharp(out, { raw: { width: W, height: H, channels: 3 } });
      webp = await (blur ? img.blur(blur) : img).webp({ quality, effort: 6 }).toBuffer();
      if (webp.length <= MAX_BYTES) return webp;
    }
  }
  return webp;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const dir = path.join(HERE, '..', 'public', 'art');
  for (const [crisisId, credit] of Object.entries(PHOTOS)) {
    const webp = await newsprint(await source(credit), credit.focus);
    mkdirSync(path.join(dir, 'foto'), { recursive: true });
    writeFileSync(path.join(dir, photoFile(crisisId)), webp);
    console.log(`${crisisId}: ${(webp.length / 1024).toFixed(0)} KB · ${credit.photographer}`);
  }
}
