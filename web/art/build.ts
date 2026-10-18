import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROLES } from '../../engine/src/types';
import { CRISIS_ART, crisisArt } from './crises';
import { EXPRESSIONS, portrait } from './people';
import { PHOTOS, photoFile } from './photos';

// Writes every illustration and the manifest the client reads (web/src/art.tsx).
// Run with `npm run art:build`; a test fails when the committed files drift from this source.

export function artFiles(): Map<string, string> {
  const files = new Map<string, string>();
  const manifest = {
    crisis: {} as Record<string, string>,
    peran: {} as Record<string, Record<string, string>>,
    diorama: null,
    foto: {} as Record<string, { file: string; alt: string; credit: string; source: string }>,
  };
  for (const id of Object.keys(CRISIS_ART)) {
    const file = `crisis/${id}.svg`;
    files.set(file, crisisArt(id));
    manifest.crisis[id] = file;
  }
  for (const role of ROLES) {
    manifest.peran[role] = {};
    for (const expr of EXPRESSIONS) {
      const file = `peran/${role}-${expr}.svg`;
      files.set(file, portrait(role, expr));
      manifest.peran[role]![expr] = file;
    }
  }
  // Photos are binary and made by photos.ts; only their manifest entries are written here.
  for (const [id, p] of Object.entries(PHOTOS)) manifest.foto[id] = { file: photoFile(id), alt: p.alt, credit: `${p.photographer} / Unsplash`, source: p.page };
  files.set('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  return files;
}

export const ART_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'art');

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  for (const [file, content] of artFiles()) {
    mkdirSync(path.dirname(path.join(ART_DIR, file)), { recursive: true });
    writeFileSync(path.join(ART_DIR, file), content);
  }
  console.log(`Ilustrasi ditulis ke ${ART_DIR}`);
}
