import { getAgenda } from '../src/content/agendas';
import { canBelanja, canMogok, checkCollapses, isLeverFrozen, playableCards, resolveYear } from '../src/game';
import { Rng } from '../src/rng';
import {
  ROLES,
  type Decision, type DecisionFor, type GameState, type Konsumsi, type Role, type Stats, type Step,
  type Upah, type YearDecisions,
} from '../src/types';

export type BotKind = 'kooperatif' | 'egois' | 'acak' | 'oknum';

// Bot limitations in v0, worth remembering when reading simulator output:
// - Each bot assumes every other team plays nothing and leaves its levers neutral.
// - Bots do not negotiate, make pacts, or predict each other (Mogok, Tolak Cetak Uang
//   and Suara Publik are picked by simple rules because a "nobody else acts" preview
//   cannot value them).
// - Bots read the full state, including other teams' private resources.

export function neutralDecision<R extends Role>(role: R): DecisionFor<R> {
  const neutral: YearDecisions = {
    pemerintah: { role: 'pemerintah', cardId: null, pajak: 0 },
    bankSentral: { role: 'bankSentral', cardId: null, bunga: 0, tolakCetakUang: false },
    pengusaha: { role: 'pengusaha', cardId: null, hargaNaik: false },
    buruh: { role: 'buruh', cardId: null, upah: 0, mogok: false },
    masyarakat: { role: 'masyarakat', cardId: null, konsumsi: 'biasa', viral: null },
  };
  return neutral[role] as DecisionFor<R>;
}

const STEPS: Step[] = [-1, 0, 1];

/** Every option the preview can tell apart; rule-picked toggles are filled in later. */
export function candidateDecisions(state: GameState, role: Role): Decision[] {
  const cards: (string | null)[] = [null, ...playableCards(state, role)];
  const out: Decision[] = [];
  for (const cardId of cards) {
    switch (role) {
      case 'pemerintah':
        for (const pajak of isLeverFrozen(state, 'pajak') ? [0 as Step] : STEPS) out.push({ role, cardId, pajak });
        break;
      case 'bankSentral':
        for (const bunga of isLeverFrozen(state, 'bunga') ? [0 as Step] : STEPS) out.push({ role, cardId, bunga, tolakCetakUang: false });
        break;
      case 'pengusaha':
        for (const hargaNaik of isLeverFrozen(state, 'harga') ? [false] : [false, true]) out.push({ role, cardId, hargaNaik });
        break;
      case 'buruh':
        for (const upah of [0, 1, 2] as Upah[]) out.push({ role, cardId, upah, mogok: false });
        break;
      case 'masyarakat': {
        const options: Konsumsi[] = canBelanja(state) ? ['hemat', 'biasa', 'belanja'] : ['hemat', 'biasa'];
        for (const konsumsi of options) out.push({ role, cardId, konsumsi, viral: null });
        break;
      }
    }
  }
  return out;
}

/** Stats after every pending delayed effect lands, so bots can see past this year. */
function projectedStats(state: GameState): Stats {
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
  const collapsed = after.collapses.length > 0 || checkCollapses(projectedStats(after)).length > 0;
  const projected = { ...after, stats: projectedStats(after) };
  const h = health(projected.stats);
  const agenda = getAgenda(after.agendas[role]);
  switch (kind) {
    case 'kooperatif': return (collapsed ? -1000 : 0) + h + 0.2 * agenda.progress(projected);
    case 'egois': return (collapsed ? -1000 : 0) + agenda.progress(projected) + 0.3 * h;
    case 'oknum': return (collapsed ? 1000 : 0) - h;
    case 'acak': return 0;
  }
}

export function decide(state: GameState, role: Role, kind: BotKind, rng: Rng): Decision {
  const candidates = candidateDecisions(state, role);
  let best: Decision;
  if (kind === 'acak') {
    best = rng.pick(candidates);
  } else {
    const others = Object.fromEntries(ROLES.map(r => [r, neutralDecision(r)])) as YearDecisions;
    let bestScore = -Infinity;
    best = candidates[0]!;
    for (const candidate of candidates) {
      const decisions = { ...others, [role]: candidate } as YearDecisions;
      const score = evaluate(kind, role, resolveYear(state, decisions, { preview: true })) + rng.next() * 1e-6;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
  }
  return applyRulePickedToggles(state, best, kind, rng);
}

function applyRulePickedToggles(state: GameState, decision: Decision, kind: BotKind, rng: Rng): Decision {
  const agenda = state.agendas[decision.role];
  switch (decision.role) {
    case 'bankSentral': {
      const tolak =
        agenda === 'kredibel' || agenda === 'jangkarHarga' ? true
        : kind === 'kooperatif' ? state.stats.harga >= 5
        : kind === 'egois' ? state.stats.harga >= 6
        : kind === 'acak' ? rng.next() < 0.5
        : false;
      return { ...decision, tolakCetakUang: tolak };
    }
    case 'buruh': {
      if (!canMogok(state)) return decision;
      const mogok =
        kind === 'oknum' ? true
        : kind === 'acak' ? rng.next() < 0.2
        : kind === 'egois' && (agenda === 'kerjaAman' || agenda === 'upahLayak') && state.stats.solidaritas >= 3 ? rng.next() < 0.5
        : false;
      return { ...decision, mogok };
    }
    case 'masyarakat': {
      if (kind === 'kooperatif') return decision;
      const targets = ROLES.filter(r => r !== 'masyarakat');
      return { ...decision, viral: rng.next() < 0.5 ? rng.pick(targets) : null };
    }
    default:
      return decision;
  }
}
