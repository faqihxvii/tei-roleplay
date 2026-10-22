import assert from 'node:assert/strict';
import test from 'node:test';
import { ROLE_BRIEF } from '../../engine/src/content/briefs';
import { CRISES_BY_ID } from '../../engine/src/content/crises';
import { ROLES } from '../../engine/src/types';
import { GLOSSARY, gloss, lookup } from '../src/content/glossary';

const terms = (text: string) => gloss(text).filter(p => typeof p !== 'string').map(p => (p as { term: { term: string } }).term.term);

test('every crisis concept can be tapped for an explanation', () => {
  for (const crisis of CRISES_BY_ID.values()) for (const c of crisis.concepts) assert.ok(lookup(c), `no glossary entry for "${c}" (${crisis.id})`);
});

test('entries are short, unique, and end in a full stop', () => {
  const seen = new Set<string>();
  for (const e of GLOSSARY) {
    assert.ok(!seen.has(e.term.toLowerCase()), `duplicate ${e.term}`);
    seen.add(e.term.toLowerCase());
    assert.ok(e.text.length <= 200, `${e.term} is ${e.text.length} chars`);
    assert.match(e.text, /\.$/, e.term);
  }
});

test('terms match whole words, longest first, once per block, any case', () => {
  assert.deepEqual(terms('Inflasi pangan naik, inflasi pangan lagi.'), ['inflasi pangan']);
  assert.deepEqual(terms('Bunga ditahan (level 3).'), ['suku bunga']);
  assert.deepEqual(terms('Kepercayaan Publik turun dan kepercayaan warga hilang.'), ['kepercayaan publik']);
  assert.deepEqual(terms('Subsidinya habis.'), [], 'no match inside a longer word');
  assert.equal(gloss('Tanpa istilah apa pun.').join(''), 'Tanpa istilah apa pun.');
  const text = 'Gelombang PHK membuat permintaan agregat turun.';
  assert.equal(gloss(text).map(p => (typeof p === 'string' ? p : p.text)).join(''), text, 'text survives intact');
});

test('every role card has its lever, power and allies written for the phone', () => {
  for (const role of ROLES) {
    const brief = ROLE_BRIEF[role];
    assert.ok(brief.focus && brief.allies && brief.power.text);
    assert.ok(brief.lever.options.length >= 2);
    assert.ok(!/dadu|geser token|geser di papan/i.test(`${brief.power.text} ${brief.lever.name}`), `${role}: paper wording on the phone`);
  }
});
