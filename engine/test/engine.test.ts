import assert from 'node:assert/strict';
import test from 'node:test';
import { getCrisis } from '../src/content/crises';
import { cloneState, createGame, INITIAL_STATS, resolveYear, RULES } from '../src/game';
import { checkPacts, emptyTally, tallyPacts } from '../src/pacts';
import { isOknumIdentified, SCORE, scoreGame } from '../src/scoring';
import { ROLES, type GameState, type Role, type YearDecisions } from '../src/types';

const neutral = (): YearDecisions => ({
  pemerintah: { role: 'pemerintah', cardId: null, pajak: 0 },
  bankSentral: { role: 'bankSentral', cardId: null, bunga: 0, tolakCetakUang: false },
  pengusaha: { role: 'pengusaha', cardId: null, hargaNaik: false },
  buruh: { role: 'buruh', cardId: null, upah: 1, mogok: false },
  masyarakat: { role: 'masyarakat', cardId: null, konsumsi: 'biasa', viral: null },
});

/** A year-1 state with a crisis whose rule touches none of the cards under test. */
function setup(overrides: { stats?: Partial<GameState['stats']>; hands?: Partial<Record<Role, string[]>> } = {}): GameState {
  const state = createGame({ seed: 42 });
  state.crisisId = 'c_pinjol';
  state.stats = { ...INITIAL_STATS, ...overrides.stats };
  for (const role of ROLES) state.hands[role] = overrides.hands?.[role] ?? [];
  return state;
}

const deltaFor = (after: GameState, cause: string) => after.log.at(-1)!.deltas.filter(d => d.cause === cause);

test('the same seed always produces the same game', () => {
  assert.deepEqual(createGame({ seed: 7 }), createGame({ seed: 7 }));
  assert.notDeepEqual(createGame({ seed: 7 }).crisisDeck, createGame({ seed: 8 }).crisisDeck);
});

test('year 3 always brings a global shock and each team holds three cards', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const state = createGame({ seed });
    assert.equal(getCrisis(state.crisisDeck[1]!).category, 'global');
    for (const role of ROLES) assert.equal(new Set(state.hands[role]).size, 3);
  }
});

test('the opening crisis is applied when the year opens', () => {
  const state = createGame({ seed: 3 });
  const crisis = getCrisis(state.crisisId);
  for (const [stat, amount] of Object.entries(crisis.effects)) {
    assert.equal(state.stats[stat as keyof GameState['stats']], INITIAL_STATS[stat as keyof GameState['stats']] + amount);
  }
});

test('resolving a year never mutates the previous state', () => {
  const state = setup({ hands: { pemerintah: ['gov_bansos'] } });
  const snapshot = structuredClone(state);
  resolveYear(state, { ...neutral(), pemerintah: { role: 'pemerintah', cardId: 'gov_bansos', pajak: 1 } });
  assert.deepEqual(state, snapshot);
});

test('indicators are clamped to 0–10', () => {
  const state = setup({ stats: { kas: 10 }, hands: { pemerintah: ['gov_amnesti'] } });
  const after = resolveYear(state, { ...neutral(), pemerintah: { role: 'pemerintah', cardId: 'gov_amnesti', pajak: 1 } });
  // 10 + 4 is clamped to 10 before the year-end routine cost of 1, not after.
  assert.equal(after.stats.kas, 10 - RULES.bebanRutinKas);
});

test('an unnoticed lobby can still be exposed by a citizen investigation the next year', () => {
  const state = setup({ hands: { pengusaha: ['ent_lobi'] } });
  state.lobiTersembunyi = 0; // pretend a lobby slipped through in year 0
  state.hands.masyarakat = ['cit_investigasi'];
  state.counters.lobiAman = 1;
  const after = resolveYear(state, { ...neutral(), masyarakat: { role: 'masyarakat', cardId: 'cit_investigasi', konsumsi: 'biasa', viral: null } });
  assert.equal(after.counters.lobiDibongkarWarga, 1);
  assert.equal(after.counters.lobiAman, 0);
  assert.equal(after.lobiTersembunyi, null);
});

test('infrastructure pays out a year later through the policy pipeline', () => {
  const state = setup({ hands: { pemerintah: ['gov_tol'] } });
  const year1 = resolveYear(state, { ...neutral(), pemerintah: { role: 'pemerintah', cardId: 'gov_tol', pajak: 0 } });
  assert.deepEqual(year1.pipeline, [{ dueYear: 2, effects: { kerja: 2 }, cause: 'kartu:gov_tol' }]);
  year1.hands = { pemerintah: [], bankSentral: [], pengusaha: [], buruh: [], masyarakat: [] };
  year1.crisisId = 'c_pinjol';
  const year2 = resolveYear(year1, neutral());
  assert.deepEqual(deltaFor(year2, 'jalur:kartu:gov_tol'), [{ stat: 'kerja', amount: 2, cause: 'jalur:kartu:gov_tol' }]);
  assert.equal(year2.pipeline.length, 0);
});

test('raising rates helps credibility now and cools prices and jobs next year', () => {
  const after = resolveYear(setup(), { ...neutral(), bankSentral: { role: 'bankSentral', cardId: null, bunga: 1, tolakCetakUang: false } });
  assert.equal(after.bunga, 4);
  assert.equal(after.stats.kredibilitas, INITIAL_STATS.kredibilitas + 1);
  assert.deepEqual(after.pipeline, [{ dueYear: 2, effects: { harga: -1, kerja: -1 }, cause: 'tuas:bungaNaik' }]);
});

test('a strike cancels the Pengusaha card and costs both sides', () => {
  const state = setup({ stats: { solidaritas: 3 }, hands: { pengusaha: ['ent_phk'] } });
  const after = resolveYear(state, {
    ...neutral(),
    pengusaha: { role: 'pengusaha', cardId: 'ent_phk', hargaNaik: false },
    buruh: { role: 'buruh', cardId: null, upah: 0, mogok: true },
  });
  assert.deepEqual(after.log[0]!.cancelled, ['ent_phk']);
  assert.equal(after.counters.phk, 0);
  assert.equal(after.stats.solidaritas, 0); // 3 - 2 (mogok) - 1 (no raise)
});

test('Bank Sentral can refuse to print money', () => {
  const state = setup({ hands: { pemerintah: ['gov_cetak'] } });
  const after = resolveYear(state, {
    ...neutral(),
    pemerintah: { role: 'pemerintah', cardId: 'gov_cetak', pajak: 0 },
    bankSentral: { role: 'bankSentral', cardId: null, bunga: 0, tolakCetakUang: true },
  });
  assert.equal(after.counters.cetakUangLolos, 0);
  assert.equal(after.pipeline.length, 0);
});

test('a citizen investigation exposes a lobby in the same year', () => {
  const state = setup({ hands: { pengusaha: ['ent_lobi'], masyarakat: ['cit_investigasi'] } });
  const after = resolveYear(state, {
    ...neutral(),
    pengusaha: { role: 'pengusaha', cardId: 'ent_lobi', hargaNaik: false },
    masyarakat: { role: 'masyarakat', cardId: 'cit_investigasi', konsumsi: 'biasa', viral: null },
  });
  assert.equal(after.counters.lobiDibongkarWarga, 1);
  assert.equal(after.counters.lobiAman, 0);
});

test('a wage rise is passed on to prices when Pengusaha raises them', () => {
  const after = resolveYear(setup(), { ...neutral(), pengusaha: { role: 'pengusaha', cardId: null, hargaNaik: true } });
  assert.deepEqual(deltaFor(after, 'tuas:upahNaik'), [
    { stat: 'kepercayaan', amount: 1, cause: 'tuas:upahNaik' },
    { stat: 'harga', amount: 1, cause: 'tuas:upahNaik' },
  ]);
});

test('austerity halves spending cards, rounding toward zero', () => {
  const state = setup({ hands: { pemerintah: ['gov_subsidi'] } });
  state.austerity = true;
  const after = resolveYear(state, { ...neutral(), pemerintah: { role: 'pemerintah', cardId: 'gov_subsidi', pajak: 0 } });
  assert.deepEqual(deltaFor(after, 'kartu:gov_subsidi'), [{ stat: 'kas', amount: -1, cause: 'kartu:gov_subsidi' }]);
});

test('every simultaneous collapse is reported and ends the game', () => {
  const state = setup({ stats: { kas: 1, kepercayaan: 1 }, hands: { pemerintah: ['gov_subsidi'], pengusaha: ['ent_shrink'] } });
  const after = resolveYear(state, {
    ...neutral(),
    pemerintah: { role: 'pemerintah', cardId: 'gov_subsidi', pajak: 0 },
    pengusaha: { role: 'pengusaha', cardId: 'ent_shrink', hargaNaik: false },
    buruh: { role: 'buruh', cardId: null, upah: 0, mogok: false },
  });
  assert.deepEqual(after.collapses, ['bangkrut', 'lengser']);
  assert.equal(after.ended, true);
});

test('preview mode neither advances the year nor rolls dice', () => {
  const state = setup({ hands: { pengusaha: ['ent_lobi'] } });
  const decisions = { ...neutral(), pengusaha: { role: 'pengusaha' as const, cardId: 'ent_lobi', hargaNaik: false } };
  const preview = resolveYear(state, decisions, { preview: true });
  assert.equal(preview.year, 1);
  assert.equal(preview.rng, state.rng);
  assert.equal(preview.counters.lobiAman, 1);
  assert.equal(preview.log.length, 0);
});

test('a full game of neutral play runs five logged years', () => {
  let state = createGame({ seed: 11 });
  while (!state.ended) state = resolveYear(state, neutral());
  assert.equal(state.log.length, state.collapses.length ? state.year : 5);
  assert.ok(scoreGame(state).every(result => result.score >= 0));
});

test('a collapse scores zero for everyone except the Oknum', () => {
  const state = cloneState(setup());
  state.agendas = { ...state.agendas, pengusaha: 'oknum' };
  state.ended = true;
  state.collapses = ['anarki'];
  const results = scoreGame(state);
  assert.equal(results.find(r => r.role === 'pengusaha')!.score, 4);
  assert.ok(results.filter(r => r.role !== 'pengusaha').every(r => r.score === 0));
});

test('a pact is checked side by side against the revealed decisions', () => {
  const decisions = { ...neutral(), buruh: { role: 'buruh' as const, cardId: null, upah: 1 as const, mogok: true } };
  const [outcome] = checkPacts([{ a: 'usahaTidakPhk', b: 'buruhTidakMogok' }], decisions);
  assert.deepEqual(outcome, { pact: { a: 'usahaTidakPhk', b: 'buruhTidakMogok' }, keptA: true, keptB: false });
  const tally = tallyPacts([outcome!], emptyTally());
  assert.deepEqual(tally.pengusaha, { kept: 1, broken: 0 });
  assert.deepEqual(tally.buruh, { kept: 0, broken: 1 });
});

test('kept and broken pacts move the final score', () => {
  const state = cloneState(setup());
  state.ended = true; // a surviving country: pacts only score when it survives
  const tally = emptyTally();
  tally.pengusaha = { kept: 2, broken: 1 };
  const base = scoreGame(state).find(r => r.role === 'pengusaha')!.score;
  const withPacts = scoreGame(state, { pacts: tally }).find(r => r.role === 'pengusaha')!.score;
  assert.equal(withPacts - base, 2 * SCORE.pactKept + SCORE.pactBroken);
});

test('a strict majority of votes unmasks the Oknum, who then loses', () => {
  const state = cloneState(setup());
  state.agendas = { ...state.agendas, buruh: 'oknum' };
  state.ended = true;
  state.collapses = ['bangkrut'];
  const threeVotes = { pemerintah: 'buruh', bankSentral: 'buruh', pengusaha: 'buruh', buruh: 'pemerintah', masyarakat: 'pengusaha' } as const;
  const twoVotes = { ...threeVotes, pengusaha: 'pemerintah' } as const;
  assert.equal(isOknumIdentified(state, threeVotes), true);
  assert.equal(isOknumIdentified(state, twoVotes), false);
  assert.equal(scoreGame(state, { oknumIdentified: true }).find(r => r.role === 'buruh')!.score, 0);
  assert.equal(scoreGame(state, { oknumIdentified: false }).find(r => r.role === 'buruh')!.score, SCORE.agenda);
});

test('the practice crisis can open a game but is never dealt into a real deck', () => {
  const practice = createGame({ seed: 5, firstCrisis: 'c_latihan' });
  assert.equal(practice.crisisId, 'c_latihan');
  assert.equal(practice.stats.keresahan, INITIAL_STATS.keresahan + 1);
  for (let seed = 1; seed <= 50; seed++) {
    const state = createGame({ seed });
    assert.ok(![state.crisisId, ...state.crisisDeck].includes('c_latihan'));
  }
});

test('every crisis card follows the GDD card anatomy', async () => {
  const { ALL_CRISIS_CARDS: CRISIS_CARDS, TUTORIAL_CRISIS } = await import('../src/content/crises');
  const words = (s: string) => s.trim().split(/\s+/).length;
  for (const card of [...CRISIS_CARDS, TUTORIAL_CRISIS]) {
    assert.ok(words(card.title) <= 8, `${card.id}: title ≤ 8 words`);
    assert.ok(words(card.narrative) <= 60, `${card.id}: narrative is ${words(card.narrative)} words, the limit is 60`);
    assert.ok(card.question.endsWith('?'), `${card.id}: one question`);
    assert.ok(card.concepts.length >= 1 && card.concepts.length <= 3, `${card.id}: 1–3 concept tags`);
  }
});

// ---------- Mode Pemula ----------

test('Pemula: every crisis, the practice included, offers each team three responses with a trade-off', async () => {
  const { CRISES_BY_ID } = await import('../src/content/crises');
  const { getCard, responseCardsFor } = await import('../src/content/policies');
  const good: Record<string, number> = { harga: -1, kerja: 1, kas: 1, kepercayaan: 1, keresahan: -1, modal: 1, solidaritas: 1, kredibilitas: 1, tabungan: 1 };
  for (const crisisId of CRISES_BY_ID.keys()) {
    for (const role of ROLES) {
      const ids = responseCardsFor(crisisId, role);
      assert.equal(ids.length, 3, `${crisisId} ${role}`);
      for (const id of ids) {
        assert.match(id, /^[a-z]{2,4}_[a-zA-Z]{2,24}$/, `${id} must pass the protocol's card id check`);
        const card = getCard(id);
        assert.ok(card.name.length <= 32 && card.description.length <= 90, `${id} text too long`);
        const signs = [card.effects, ...(card.delayed ?? []).map(d => d.effects)].flatMap(fx => Object.entries(fx).map(([stat, n]) => Math.sign(good[stat]! * n!)));
        assert.ok(signs.includes(1) && signs.includes(-1), `${id} needs a benefit and a cost`);
      }
    }
  }
});

test('Pemula: hands are the crisis responses, levers and powers are off, and five years resolve', async () => {
  const { isLeverFrozen, canMogok } = await import('../src/game');
  const { responseCardsFor } = await import('../src/content/policies');
  let state = createGame({ seed: 7, mode: 'pemula' });
  assert.equal(state.mode, 'pemula');
  for (const lever of ['pajak', 'bunga', 'harga', 'upah', 'konsumsi'] as const) assert.ok(isLeverFrozen(state, lever));
  assert.equal(canMogok({ ...state, stats: { ...state.stats, solidaritas: 5 } }), false);
  while (!state.ended) {
    for (const role of ROLES) assert.deepEqual(state.hands[role], responseCardsFor(state.crisisId, role));
    const d = neutral();
    for (const role of ROLES) (d[role] as { cardId: string | null }).cardId = state.hands[role][1]!;
    state = resolveYear(state, d);
  }
  assert.ok(state.log.length >= 1);
  assert.throws(() => resolveYear(createGame({ seed: 7, mode: 'pemula' }), { ...neutral(), bankSentral: { role: 'bankSentral', cardId: null, bunga: 0, tolakCetakUang: true } }), /no powers/);
});

test('Pemula draws only agendas it can reach', async () => {
  const { agendasForRole } = await import('../src/content/agendas');
  const ids = ROLES.flatMap(role => agendasForRole(role, 'pemula').map(a => a.id));
  for (const id of ['apbnSehat', 'ekspansi', 'pengawas']) assert.ok(!ids.includes(id as never), id);
  for (const role of ROLES) assert.ok(agendasForRole(role, 'pemula').length >= 1, role);
});

test('Lanjutan: whoever owns the card a crisis rewards is always dealt it', async () => {
  const { cardsForRole, getCard } = await import('../src/content/policies');
  for (let seed = 1; seed <= 40; seed++) {
    let state = createGame({ seed });
    while (!state.ended) {
      const modifier = getCrisis(state.crisisId).modifier;
      if (modifier.kind === 'scaleTag') {
        for (const role of ROLES) {
          if (cardsForRole(role).some(c => c.tags.includes(modifier.tag))) {
            assert.ok(state.hands[role].some(id => getCard(id).tags.includes(modifier.tag)), `seed ${seed} year ${state.year} ${role}`);
          }
        }
      }
      state = resolveYear(state, neutral());
    }
  }
});
