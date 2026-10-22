import assert from 'node:assert/strict';
import test from 'node:test';
import { goodWhen, INDICATOR_MEANING, INDICATOR_ORDER, statusOf, ZONES } from '../src/text';

// The indicator bars must read without colour: each status is a word, and the word follows the zones.

test('every indicator says what it measures and which end is good', () => {
  for (const stat of INDICATOR_ORDER) {
    assert.ok(INDICATOR_MEANING[stat].length >= 8, stat);
    assert.equal(goodWhen(stat), ZONES[stat].worseWhen === 'tinggi' ? 'rendah' : 'tinggi');
  }
  assert.equal(goodWhen('harga'), 'rendah');
  assert.equal(goodWhen('kas'), 'tinggi');
});

test('status words: aman, waspada one step before danger, bahaya with steps to collapse, kolaps', () => {
  assert.deepEqual(statusOf('harga', 4), { level: 'aman', label: 'Aman', stepsToDanger: 2 });
  assert.equal(statusOf('harga', 5).label, 'Waspada · 1 lagi bahaya');
  assert.equal(statusOf('harga', 6).label, 'Bahaya · 4 lagi kolaps');
  assert.equal(statusOf('harga', 10).label, 'KOLAPS');
  assert.equal(statusOf('kas', 3).level, 'waspada');
  assert.equal(statusOf('kas', 2).label, 'Bahaya · 2 lagi kolaps');
  assert.equal(statusOf('kas', 0).level, 'kolaps');
  assert.equal(statusOf('keresahan', 6).level, 'waspada');
});

test('Lapangan Kerja has no collapse point, so it never says kolaps', () => {
  for (let v = 0; v <= 10; v++) assert.doesNotMatch(statusOf('kerja', v).label, /kolaps/i, String(v));
  assert.equal(statusOf('kerja', 0).label, 'Bahaya');
});

test('the status agrees with the danger zone at every value', () => {
  for (const stat of INDICATOR_ORDER) {
    const z = ZONES[stat];
    for (let v = 0; v <= 10; v++) {
      const inDanger = z.worseWhen === 'tinggi' ? v >= z.danger : v <= z.danger;
      const { level } = statusOf(stat, v);
      assert.equal(inDanger, level === 'bahaya' || level === 'kolaps', `${stat} ${v}`);
    }
  }
});
