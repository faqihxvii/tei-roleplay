import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import { db, momentaryMax, peak, sine } from '../audio/dsp';
import { renderCue, VARIANTS } from '../audio/sfx';
import { CUE_IDS, MOODS } from '../src/audio/cues';

const AUDIO = new URL('../public/audio/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', AUDIO), 'utf8')) as {
  temporary?: boolean; format: string[]; sfx: Record<string, string[]>; music: Record<string, string>;
};

test('every cue and every mood has a file, in every listed format', () => {
  assert.deepEqual(manifest.format, ['webm', 'mp3']);
  for (const cue of CUE_IDS) {
    const files = manifest.sfx[cue];
    assert.ok(files?.length, `no sound for ${cue}`);
    assert.equal(files!.length, VARIANTS[cue] ?? 1, `${cue} variants`);
    for (const file of files!) for (const ext of manifest.format) {
      const url = new URL(`${file}.${ext}`, AUDIO);
      assert.ok(existsSync(url), `missing ${file}.${ext}`);
      assert.ok(statSync(url).size < 120_000, `${file}.${ext} is too big`);
    }
  }
  for (const mood of Object.keys(MOODS)) {
    for (const ext of manifest.format) {
      const url = new URL(`${manifest.music[mood]}.${ext}`, AUDIO);
      assert.ok(existsSync(url), `missing loop ${mood}.${ext}`);
      assert.ok(statSync(url).size < 900_000, `loop ${mood}.${ext} is too big`);
    }
  }
});

test('the synthesized set is marked temporary until the sound designer delivers', () => {
  assert.equal(manifest.temporary, true);
});

test('cue rendering is deterministic and never empty or clipped', () => {
  const a = renderCue('sah', 1);
  const b = renderCue('sah', 1);
  assert.deepEqual(a, b);
  assert.notDeepEqual(renderCue('sah', 0), a, 'variants differ');
  for (const cue of ['fase.krisis', 'pakta.robek', 'akhir.baik'] as const) {
    const s = renderCue(cue);
    assert.ok(s.every(Number.isFinite), `${cue} has NaN`);
    assert.ok(peak(s) > 0.1 && peak(s) <= 1, `${cue} peak ${peak(s)}`);
  }
});

test('the loudness meter reads a full-scale 1 kHz sine near -3 LUFS', () => {
  const tone = sine(1, 1000);
  assert.ok(Math.abs(momentaryMax(tone) - -3) < 1, `${momentaryMax(tone)}`);
  assert.ok(Math.abs(momentaryMax(tone.map(x => x * db(-20))) - -23) < 1);
});
