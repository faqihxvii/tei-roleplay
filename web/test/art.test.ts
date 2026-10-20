import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { CRISES_BY_ID } from '../../engine/src/content/crises';
import { ROLES } from '../../engine/src/types';
import { ART_DIR, artFiles } from '../art/build';
import { EXPRESSIONS } from '../art/people';
import { PHOTOS, photoFile } from '../art/photos';

test('committed illustrations match their source (run npm run art:build after editing web/art)', () => {
  for (const [file, content] of artFiles()) {
    assert.equal(readFileSync(path.join(ART_DIR, file), 'utf8'), content, `web/public/art/${file} is stale`);
  }
});

test('every crisis card, the practice included, has an illustration', () => {
  const manifest = JSON.parse(artFiles().get('manifest.json')!) as { crisis: Record<string, string>; peran: Record<string, Record<string, string>> };
  for (const id of CRISES_BY_ID.keys()) assert.ok(manifest.crisis[id], `no art for ${id}`);
  for (const role of ROLES) for (const expr of EXPRESSIONS) assert.ok(manifest.peran[role]?.[expr], `no ${role}-${expr}`);
});

test('illustrations are small, titled, and use only the three riso inks', () => {
  for (const [file, content] of artFiles()) {
    if (!file.endsWith('.svg')) continue;
    assert.ok(content.length < 12_000, `${file} is ${content.length} bytes`);
    assert.match(content, /<title id="t">[^<]{8,}<\/title>/, `${file} has no title`);
    const colours = new Set(content.match(/#[0-9a-f]{6}/gi)!.map(c => c.toLowerCase()));
    for (const c of colours) assert.ok(['#1a1a1a', '#c30700', '#e9806e', '#fffdf8'].includes(c), `${file} uses ${c}`);
  }
});

test('every crisis card has a credited, self-hosted front-page photo (npm run art:photos)', () => {
  for (const id of CRISES_BY_ID.keys()) {
    const credit = PHOTOS[id];
    assert.ok(credit, `no photo listed for ${id} in web/art/photos.json`);
    assert.match(credit.page, /^https:\/\/unsplash\.com\/photos\//, `${id}: source must be an Unsplash photo page`);
    assert.match(credit.image, /^https:\/\/images\.unsplash\.com\/photo-/, `${id}: not a free Unsplash image (Unsplash+ is not allowed)`);
    assert.ok(credit.photographer.trim() && credit.alt.trim().length >= 8, `${id}: credit or alt text missing`);
    const file = path.join(ART_DIR, photoFile(id));
    assert.ok(existsSync(file), `${file} missing`);
    assert.ok(statSync(file).size <= 80_000, `${id} photo is ${statSync(file).size} bytes`);
  }
});
