import { getAgenda } from '../src/content/agendas';
import { canBelanja, canMogok, checkCollapses, isLeverFrozen, playableCards, resolveYear } from '../src/game';
import { PACT_TEMPLATES, PACT_TERMS, type Pact, type PactTermId } from '../src/pacts';
import { Rng } from '../src/rng';
import {
  ROLES,
  type Decision, type DecisionFor, type GameState, type Konsumsi, type Role, type Stats, type Step,
  type Upah, type YearDecisions,
} from '../src/types';

export type BotKind = 'kooperatif' | 'egois' | 'acak' | 'oknum';

// How the bots think (v0.3):
// 1. Prediction: each bot guesses what every team would do if nobody else acted ("level 0"),
//    then how each team would respond to that guess ("level 1", threats included).
// 2. Lobi: bots offer the pact templates; a bot accepts when the deal, assuming its partner
//    keeps it, is no worse for it than playing alone. Trust drops after a broken promise.
// 3. Decision: each bot best-responds to those predictions, honouring or breaking its pacts
//    according to its kind. Mogok, Tolak Cetak Uang and Suara Publik are valued here too.
// Remaining limits: bots read the full state (including private resources), predict only one
// level deep, and negotiate only the fixed templates in src/pacts.ts.

export type Trust = Record<Role, Record<Role, number>>;
export const INITIAL_TRUST = 0.8;
const MIN_TRUST = 0.5;
/** An Egois bot considers breaking a promise once breaking it is worth this much more. */
const EGOIS_BREAK_GAIN = 0.3;

export function initialTrust(): Trust {
  return Object.fromEntries(ROLES.map(a => [a, Object.fromEntries(ROLES.map(b => [b, INITIAL_TRUST]))])) as Trust;
}

export function neutralDecision<R extends Role>(role: R): DecisionFor<R> {
  return neutralDecisions()[role] as DecisionFor<R>;
}

export function neutralDecisions(): YearDecisions {
  return {
    pemerintah: { role: 'pemerintah', cardId: null, pajak: 0 },
    bankSentral: { role: 'bankSentral', cardId: null, bunga: 0, tolakCetakUang: false },
    pengusaha: { role: 'pengusaha', cardId: null, hargaNaik: false },
    buruh: { role: 'buruh', cardId: null, upah: 0, mogok: false },
    masyarakat: { role: 'masyarakat', cardId: null, konsumsi: 'biasa', viral: null },
  };
}

const STEPS: Step[] = [-1, 0, 1];

/**
 * Every legal option. Without `toggles`, Mogok, Tolak Cetak Uang and Suara Publik stay off:
 * against "nobody else acts" they can only cost, so the level-0 guess leaves them out.
 */
export function candidateDecisions(state: GameState, role: Role, toggles = false): Decision[] {
  const cards: (string | null)[] = [null, ...playableCards(state, role)];
  const out: Decision[] = [];
  for (const cardId of cards) {
    switch (role) {
      case 'pemerintah':
        for (const pajak of isLeverFrozen(state, 'pajak') ? [0 as Step] : STEPS) out.push({ role, cardId, pajak });
        break;
      case 'bankSentral':
        for (const bunga of isLeverFrozen(state, 'bunga') ? [0 as Step] : STEPS) {
          for (const tolakCetakUang of toggles ? [false, true] : [false]) out.push({ role, cardId, bunga, tolakCetakUang });
        }
        break;
      case 'pengusaha':
        for (const hargaNaik of isLeverFrozen(state, 'harga') ? [false] : [false, true]) out.push({ role, cardId, hargaNaik });
        break;
      case 'buruh':
        for (const upah of [0, 1, 2] as Upah[]) {
          for (const mogok of toggles && canMogok(state) ? [false, true] : [false]) out.push({ role, cardId, upah, mogok });
        }
        break;
      case 'masyarakat': {
        const options: Konsumsi[] = canBelanja(state) ? ['hemat', 'biasa', 'belanja'] : ['hemat', 'biasa'];
        const targets: (Role | null)[] = toggles ? [null, ...ROLES.filter(r => r !== 'masyarakat')] : [null];
        for (const konsumsi of options) for (const viral of targets) out.push({ role, cardId, konsumsi, viral });
        break;
      }
    }
  }
  return out;
}

/** Stats after every pending delayed effect lands, so bots can see past this year. */
export function projectedStats(state: GameState): Stats {
  const stats = { ...state.stats };
  for (const entry of state.pipeline) {
    for (const [stat, amount] of Object.entries(entry.effects)) stats[stat as keyof Stats] += amount;
  }
  for (const key of ['harga', 'kerja', 'kas', 'kepercayaan', 'keresahan'] as const) {
    stats[key] = Math.min(10, Math.max(0, stats[key]));
  }
  return stats;
}

/** Distance from collapse, weighted toward the indicator closest to the edge. */
export function health(stats: Stats): number {
  const margins = [10 - stats.harga, stats.kas, stats.kepercayaan, 10 - stats.keresahan];
  const mean = margins.reduce((a, b) => a + b, 0) / margins.length;
  return mean + 1.5 * Math.min(...margins) + 0.3 * stats.kerja;
}

function evaluate(kind: BotKind, role: Role, after: GameState): number {
  const projected = { ...after, stats: projectedStats(after) };
  const collapsed = after.collapses.length > 0 || checkCollapses(projected.stats).length > 0;
  const h = health(projected.stats);
  const agenda = getAgenda(after.agendas[role]);
  switch (kind) {
    case 'kooperatif': return (collapsed ? -1000 : 0) + h + 0.2 * agenda.progress(projected);
    case 'egois': return (collapsed ? -1000 : 0) + agenda.progress(projected) + 0.3 * h;
    case 'oknum': return (collapsed ? 1000 : 0) - h;
    case 'acak': return 0;
  }
}

interface Plan {
  decision: Decision;
  score: number;
}

interface BestOptions {
  toggles: boolean;
  constraint?: (decision: Decision) => boolean;
}

function best(state: GameState, role: Role, kind: BotKind, rng: Rng, others: YearDecisions, options: BestOptions): Plan {
  const all = candidateDecisions(state, role, options.toggles);
  const allowed = options.constraint ? all.filter(options.constraint) : all;
  const pool = allowed.length ? allowed : all;
  if (kind === 'acak') return { decision: rng.pick(pool), score: 0 };

  let bestPlan: Plan = { decision: pool[0]!, score: -Infinity };
  for (const candidate of pool) {
    const decisions = { ...others, [role]: candidate } as YearDecisions;
    const score = evaluate(kind, role, resolveYear(state, decisions, { preview: true })) + rng.next() * 1e-6;
    if (score > bestPlan.score) bestPlan = { decision: candidate, score };
  }
  return bestPlan;
}

/** Level 0: what each team would do if nobody else acted. */
export function predictAll(state: GameState, kinds: Record<Role, BotKind>, rng: Rng): YearDecisions {
  const neutral = neutralDecisions();
  const out = {} as YearDecisions;
  for (const role of ROLES) {
    (out as Record<Role, Decision>)[role] = best(state, role, kinds[role], rng, neutral, { toggles: false }).decision;
  }
  return out;
}

/**
 * Level 1: each team's best response to the level-0 guesses, threats included (a strike, a
 * refusal to print money, a viral post). Pacts are valued against this, so a promise not to
 * strike is worth something only when a strike was actually likely.
 */
export function respondAll(state: GameState, kinds: Record<Role, BotKind>, rng: Rng, level0: YearDecisions): YearDecisions {
  const out = {} as YearDecisions;
  for (const role of ROLES) {
    (out as Record<Role, Decision>)[role] = best(state, role, kinds[role], rng, level0, { toggles: true }).decision;
  }
  return out;
}

const holds = (term: PactTermId) => (decision: Decision) => PACT_TERMS[term].holds(decision);

/** The partner's predicted move if it keeps its side of the deal. */
function keptPrediction(state: GameState, partner: Role, term: PactTermId, kinds: Record<Role, BotKind>, rng: Rng, predictions: YearDecisions): Decision {
  const predicted = predictions[partner];
  if (PACT_TERMS[term].holds(predicted)) return predicted;
  const kind = kinds[partner] === 'acak' ? 'egois' : kinds[partner];
  return best(state, partner, kind, rng, neutralDecisions(), { toggles: false, constraint: holds(term) }).decision;
}

function accepts(
  state: GameState, self: Role, ownTerm: PactTermId, partner: Role, partnerTerm: PactTermId,
  kinds: Record<Role, BotKind>, rng: Rng, predictions: YearDecisions, trust: Trust,
): boolean {
  const kind = kinds[self];
  if (kind === 'acak') return rng.next() < 0.5;
  if (kind === 'oknum') return true; // looks cooperative, decides later
  if (trust[self][partner] < MIN_TRUST) return false;

  const withPartnerKeeping = { ...predictions, [partner]: keptPrediction(state, partner, partnerTerm, kinds, rng, predictions) } as YearDecisions;
  const alone = best(state, self, kind, rng, predictions, { toggles: true }).score;
  const dealt = best(state, self, kind, rng, withPartnerKeeping, { toggles: true, constraint: holds(ownTerm) }).score;
  const tolerance = kind === 'kooperatif' ? 0.5 : 0;
  return dealt >= alone - tolerance;
}

/** The Lobi phase: each template is offered once, a team joins at most two pacts a year. */
export function negotiate(state: GameState, kinds: Record<Role, BotKind>, rng: Rng, predictions: YearDecisions, trust: Trust): Pact[] {
  const pacts: Pact[] = [];
  const joined = Object.fromEntries(ROLES.map(r => [r, 0])) as Record<Role, number>;
  for (const template of rng.shuffle(PACT_TEMPLATES)) {
    const roleA = PACT_TERMS[template.a].role;
    const roleB = PACT_TERMS[template.b].role;
    if (joined[roleA] >= 2 || joined[roleB] >= 2) continue;
    if (!accepts(state, roleA, template.a, roleB, template.b, kinds, rng, predictions, trust)) continue;
    if (!accepts(state, roleB, template.b, roleA, template.a, kinds, rng, predictions, trust)) continue;
    pacts.push(template);
    joined[roleA]++;
    joined[roleB]++;
  }
  return pacts;
}

/** Level 1: best response to the predictions, then keep or break each promise by temperament. */
export function decide(
  state: GameState, role: Role, kinds: Record<Role, BotKind>, rng: Rng,
  predictions: YearDecisions, pacts: Pact[] = [], trust: Trust = initialTrust(),
): Decision {
  const kind = kinds[role];
  const others = { ...predictions } as YearDecisions;
  const myTerms: PactTermId[] = [];
  for (const pact of pacts) {
    for (const [own, theirs] of [[pact.a, pact.b], [pact.b, pact.a]] as const) {
      if (PACT_TERMS[own].role !== role) continue;
      myTerms.push(own);
      const partner = PACT_TERMS[theirs].role;
      if (trust[role][partner] >= MIN_TRUST) {
        (others as Record<Role, Decision>)[partner] = keptPrediction(state, partner, theirs, kinds, rng, predictions);
      }
    }
  }

  const free = best(state, role, kind, rng, others, { toggles: true });
  if (myTerms.length === 0 || kind === 'acak') return free.decision;
  const kept = best(state, role, kind, rng, others, { toggles: true, constraint: d => myTerms.every(t => PACT_TERMS[t].holds(d)) });
  switch (kind) {
    case 'kooperatif': return rng.next() < 0.95 ? kept.decision : free.decision;
    case 'egois': return free.score - kept.score > EGOIS_BREAK_GAIN && rng.next() < 0.5 ? free.decision : kept.decision;
    case 'oknum': return free.score > kept.score ? free.decision : kept.decision;
  }
}

/**
 * How much one team's revealed decision hurt the country this year, judged the way players
 * would at the reveal: the same year with only that team acting, against nobody acting.
 */
export function harmOf(state: GameState, role: Role, decision: Decision): number {
  const neutral = neutralDecisions();
  const baseline = health(projectedStats(resolveYear(state, neutral, { preview: true })));
  const acting = health(projectedStats(resolveYear(state, { ...neutral, [role]: decision } as YearDecisions, { preview: true })));
  return baseline - acting;
}

/** Each team names the other team whose decisions did the most harm over the game. */
export function voteOknum(harm: Record<Role, number>, rng: Rng): Record<Role, Role> {
  const votes = {} as Record<Role, Role>;
  for (const voter of ROLES) {
    const suspects = ROLES.filter(r => r !== voter);
    votes[voter] = suspects.reduce((a, b) => (harm[b] + rng.next() * 0.5 > harm[a] + rng.next() * 0.5 ? b : a));
  }
  return votes;
}
