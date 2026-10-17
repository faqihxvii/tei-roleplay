import { getAgenda } from './content/agendas';
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
} as const;

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
 * Scores at game end. A collapse scores zero for everyone except the Oknum, who wins.
 * `correctGuesses` counts agendas each team guessed right in the final vote.
 */
export function scoreGame(state: GameState, correctGuesses: Partial<Record<Role, number>> = {}): TeamResult[] {
  if (!state.ended) throw new Error('Game has not ended');
  const ending = getEnding(state);
  return ROLES.map(role => {
    const agenda = state.agendas[role];
    const achieved = getAgenda(agenda).achieved(state);
    let score = 0;
    if (agenda === 'oknum') {
      score = achieved ? SCORE.agenda : 0;
    } else if (ending !== 'kolaps') {
      score = (achieved ? SCORE.agenda : 0) + SCORE.bonus[ending] + (correctGuesses[role] ?? 0) * SCORE.correctGuess;
    }
    return { role, agenda, achieved, score };
  });
}
