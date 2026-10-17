import { getAgenda } from './content/agendas';
import type { PactTally } from './pacts';
import { ROLES, type AgendaId, type GameState, type Role, type Stats } from './types';

export type Ending = 'kolaps' | 'sejahtera' | 'bertahan' | 'tertatih';

export interface TeamResult {
  role: Role;
  agenda: AgendaId;
  achieved: boolean;
  score: number;
}

export const SCORE = {
  agenda: 4,
  bonus: { sejahtera: 3, bertahan: 1, tertatih: 0, kolaps: 0 },
  correctGuess: 1,
  pactKept: 1,
  pactBroken: -1,
} as const;

export interface ScoreOptions {
  /** Agendas each team guessed right in the final vote. */
  correctGuesses?: Partial<Record<Role, number>>;
  pacts?: PactTally;
  /** Mode Oknum: whether a majority of teams named the Oknum in the final vote. */
  oknumIdentified?: boolean;
}

/** Each team names one other team as the Oknum; a strict majority of all teams unmasks it. */
export function isOknumIdentified(state: GameState, votes: Partial<Record<Role, Role>>): boolean {
  const oknum = ROLES.find(role => state.agendas[role] === 'oknum');
  if (!oknum) return false;
  const against = Object.values(votes).filter(target => target === oknum).length;
  return against > ROLES.length / 2;
}

/** Mean of the four "how good is life" indicators, rounded (GDD, "Ending"). */
export function indexNegara(stats: Stats): number {
  return Math.round((stats.kerja + stats.kepercayaan + (10 - stats.harga) + (10 - stats.keresahan)) / 4);
}

export function getEnding(state: GameState): Ending {
  if (state.collapses.length > 0) return 'kolaps';
  const index = indexNegara(state.stats);
  if (index >= 7) return 'sejahtera';
  if (index >= 4) return 'bertahan';
  return 'tertatih';
}

/**
 * Scores at game end. A collapse scores zero for everyone except an Oknum who stayed hidden.
 */
export function scoreGame(state: GameState, options: ScoreOptions = {}): TeamResult[] {
  if (!state.ended) throw new Error('Game has not ended');
  const ending = getEnding(state);
  return ROLES.map(role => {
    const agenda = state.agendas[role];
    const achieved = agenda === 'oknum'
      ? getAgenda(agenda).achieved(state) && !options.oknumIdentified
      : getAgenda(agenda).achieved(state);
    let score = 0;
    if (agenda === 'oknum') {
      score = achieved ? SCORE.agenda : 0;
    } else if (ending !== 'kolaps') {
      const pacts = options.pacts?.[role] ?? { kept: 0, broken: 0 };
      score = (achieved ? SCORE.agenda : 0) + SCORE.bonus[ending]
        + (options.correctGuesses?.[role] ?? 0) * SCORE.correctGuess
        + pacts.kept * SCORE.pactKept + pacts.broken * SCORE.pactBroken;
    }
    return { role, agenda, achieved, score };
  });
}
