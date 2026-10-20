import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_CRISIS_CARDS, CLASSIC_PACK, CRISIS_CARDS, CRISIS_PACKS, LATEST_PACK, TUTORIAL_CRISIS } from '../src/content/crises';
import { PACK_CHOICES } from '../src/content/packList';
import { getCard, POLICY_CARDS, responseCardsFor } from '../src/content/policies';
import { createGame, GLOBAL_SHOCK_YEAR, MAX_YEARS } from '../src/game';
import { ROLES } from '../src/types';

// Every crisis pack must be playable on its own: docs/paket-krisis.md points here as the checklist a
// new month's pack has to pass. Text limits, sources and photos are checked for all packs in the
// engine, room and web tests that walk ALL_CRISIS_CARDS.

test('the pack list and the registry agree, newest first, Klasik kept', () => {
  assert.deepEqual(CRISIS_PACKS.map(p => p.id), PACK_CHOICES.map(p => p.id));
  assert.equal(LATEST_PACK, CRISIS_PACKS[0]!.id);
  assert.equal(CRISIS_PACKS.find(p => p.id === CLASSIC_PACK)?.cards, CRISIS_CARDS);
  for (const pack of CRISIS_PACKS) assert.ok(pack.cards?.length, `${pack.id} has no cards`);
});

test('crisis ids are unique across every pack and the practice', () => {
  const ids = [...ALL_CRISIS_CARDS, TUTORIAL_CRISIS].map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^c_[a-z]{2,16}$/, `${id}: response card ids are built from it`);
});

test('every pack fills a five-year deck with a global shock for year 3', () => {
  for (const pack of CRISIS_PACKS) {
    assert.ok(pack.cards.some(c => c.category === 'global'), `${pack.id}: needs a global card`);
    assert.ok(pack.cards.filter(c => c.category !== 'global').length >= MAX_YEARS - 1, `${pack.id}: needs ${MAX_YEARS - 1} other cards`);
  }
});

test('a crisis that rewards a tag has an answer in both modes', () => {
  for (const card of ALL_CRISIS_CARDS) {
    if (card.modifier.kind !== 'scaleTag') continue;
    const tag = card.modifier.tag;
    assert.ok(POLICY_CARDS.some(p => p.tags.includes(tag)), `${card.id}: no Lanjutan card carries ${tag}`);
    const responses = ROLES.flatMap(role => responseCardsFor(card.id, role)).map(getCard);
    assert.ok(responses.some(r => r.tags.includes(tag)), `${card.id}: no Pemula response carries ${tag}`);
  }
});

test('a game draws only from its pack, Klasik when none or an unknown one is named', () => {
  for (const pack of CRISIS_PACKS) {
    const ids = new Set(pack.cards.map(c => c.id));
    for (let seed = 1; seed <= 20; seed++) {
      const state = createGame({ seed, crisisPack: pack.id, mode: 'pemula' });
      const deck = [state.crisisId, ...state.crisisDeck];
      assert.equal(deck.length, MAX_YEARS);
      assert.ok(deck.every(id => ids.has(id)), `${pack.id} seed ${seed}: ${deck.join(',')}`);
      assert.equal(pack.cards.find(c => c.id === deck[GLOBAL_SHOCK_YEAR - 1])?.category, 'global');
    }
  }
  const classic = new Set(CRISIS_CARDS.map(c => c.id));
  for (const crisisPack of [undefined, 'tidak-ada']) {
    const state = createGame({ seed: 3, crisisPack });
    assert.ok([state.crisisId, ...state.crisisDeck].every(id => classic.has(id)));
  }
});
