import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { CRISES_BY_ID } from '../../engine/src/content/crises';
import { ROLES } from '../../engine/src/types';
import { ART_DIR, artFiles } from '../art/build';
import { EXPRESSIONS } from '../art/people';

test('committed illustrations match their source (run npm run art:build after editing web/art)', () => {
  for (const [file, content] of artFiles()) {
    assert.equal(readFileSync(path.join(ART_DIR, file), 'utf8'), content, `web/public/art/${file} is stale`);
  }
});

test('every crisis card, the practice included, has an illustration', () => {
  const manifest = JSON.parse(artFiles().get('manifest.json')!) as { crisis: Record<string, string>; peran: Record<string, Record<string, string>> };
  for (const id of Object.keys(CRISES_BY_ID)) assert.ok(manifest.crisis[id], `no art for ${id}`);
  for (const role of ROLES) for (const expr of EXPRESSIONS) assert.ok(manifest.peran[role]?.[expr], `no ${role}-${expr}`);
});

test('illustrations are small, titled, and use only the three riso inks', () => {
  for (const [file, content] of artFiles()) {
    if (!file.endsWith('.svg')) continue;
    assert.ok(content.length < 12_000, `${file} is ${content.length} bytes`);
    assert.match(content, /<title id="t">[^<]{8,}<\/title>/, `${file} has no title`);
    const colours = new Set(content.match(/#[0-9a-f]{6}/gi)!.map(c => c.toLowerCase()));
    for (const c of colours) assert.ok(['#1a1a1a', '#c91212', '#0067a5', '#fffdf8'].includes(c), `${file} uses ${c}`);
  }
});
