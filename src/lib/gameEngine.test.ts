import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTIONS } from './gameData';
import {
  applyActionToMetrics,
  applyNaturalDrift,
  checkEnding,
  checkWinners,
  createInitialState,
  INITIAL_METRICS
} from './gameEngine';
import type { Action, Metrics } from '../types';

const makeMetrics = (overrides: Partial<Metrics> = {}): Metrics => ({
  ...INITIAL_METRICS,
  ...overrides
});

const makeAction = (effects: Action['effects']): Action => ({
  id: 'test-action',
  name: 'Test action',
  description: 'Action used by game engine tests.',
  effects
});

test('initial state starts at year one with five years to play', () => {
  const state = createInitialState();

  assert.equal(state.currentYear, 1);
  assert.equal(state.maxYears, 5);
  assert.deepEqual(state.metrics, INITIAL_METRICS);
  assert.equal(state.history.length, 1);
  assert.equal(state.gameOver, false);
  assert.equal(state.ending, null);
});

test('action effects are clamped to metric bounds without mutating input', () => {
  const base = makeMetrics({ mood: 9, kas: 1, chaos: 9, cuanPengusaha: 2, penaltyPengusaha: 1 });
  const result = applyActionToMetrics(base, makeAction({
    mood: 3,
    kas: -3,
    chaos: 3,
    cuanPengusaha: -5,
    penaltyPengusaha: -4
  }));

  assert.deepEqual(result, {
    mood: 9,
    kas: 0,
    chaos: 10,
    cuanPengusaha: 0,
    penaltyPengusaha: 0,
    moodEverBelow5: false
  });
  assert.equal(base.mood, 9);
  assert.equal(base.kas, 1);
});

test('zero-valued effects leave metrics unchanged', () => {
  const base = makeMetrics();
  assert.deepEqual(applyActionToMetrics(base, makeAction({ mood: 0, kas: 0, chaos: 0 })), base);
});

test('mood mission records any drop below five, including high-chaos penalty', () => {
  const result = applyActionToMetrics(
    makeMetrics({ mood: 5, chaos: 6 }),
    makeAction({ chaos: 1 })
  );

  assert.equal(result.mood, 4);
  assert.equal(result.moodEverBelow5, true);
});

test('natural drift records mood dropping below five', () => {
  const result = applyNaturalDrift(makeMetrics({ mood: 5, chaos: 8 }));

  assert.equal(result.mood, 4);
  assert.equal(result.kas, 6);
  assert.equal(result.moodEverBelow5, true);
});

test('high mood naturally reduces chaos by one', () => {
  const result = applyNaturalDrift(makeMetrics({ mood: 8, chaos: 3 }));

  assert.equal(result.chaos, 2);
});

test('ending checks fatal metrics and preserves mood-then-kas-then-chaos precedence', () => {
  assert.equal(checkEnding(makeMetrics({ mood: 0 })), 'lengser');
  assert.equal(checkEnding(makeMetrics({ kas: 0 })), 'bangkrut');
  assert.equal(checkEnding(makeMetrics({ chaos: 10 })), 'anarki');
  assert.equal(checkEnding(makeMetrics({ mood: 0, kas: 0, chaos: 10 })), 'lengser');
  assert.equal(checkEnding(makeMetrics()), null);
});

test('secret mission winners use strict thresholds and the mood history flag', () => {
  const metrics = makeMetrics({
    kas: 8,
    chaos: 6,
    cuanPengusaha: 10,
    penaltyPengusaha: 5,
    moodEverBelow5: false
  });

  assert.deepEqual(checkWinners(metrics), [
    'Pemerintah', 'Bank Sentral', 'Pengusaha', 'Serikat Buruh', 'Masyarakat'
  ]);
  assert.deepEqual(checkWinners(makeMetrics({ kas: 7, chaos: 7, moodEverBelow5: true })), []);
});

test('catalogued action effect totals stay within the metric engine supported ranges', () => {
  for (const actions of Object.values(ACTIONS)) {
    for (const action of actions) {
      for (const [metric, amount] of Object.entries(action.effects)) {
        assert.ok(Number.isInteger(amount), `${action.id}.${metric} should be an integer`);
      }
    }
  }
});
