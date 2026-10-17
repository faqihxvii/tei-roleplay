import { getEnding, indexNegara } from '../../engine/src/scoring';
import { ROLES, type Role } from '../../engine/src/types';
import { SURVEY, type SurveyQuestionId } from './content/survey';
import type { Room, RoomPhase, Tempo } from './room';
import type { StepTiming, Telemetry } from './telemetry';
import { quizSummary, type QuizSummary } from './views';

// The anonymous session report: one JSON per room, for playtest analysis (GDD, "Telemetri anonim"
// and "Ukuran keberhasilan"). It names teams by role only. No nicknames and no player ids; the
// survey comments are left out unless the caller is the facilitator's own export.

export const REPORT_VERSION = 1;

export interface SurveySummary {
  n: number;
  eligible: number;
  /** Mean 1–5 per question, one decimal; null before anyone answered. */
  means: Record<SurveyQuestionId, number | null>;
  /** Answers per score: index 0 counts 1s, index 4 counts 5s. */
  dist: Record<SurveyQuestionId, number[]>;
}

export interface SessionReport {
  version: number;
  id: string;
  createdAt: string;
  updatedAt: string;
  phase: RoomPhase;
  options: { oknum: boolean; latihan: boolean; kuis: boolean };
  tempo: Tempo;
  players: number;
  teamSizes: Record<Role, number>;
  offlineRoles: Role[];
  practicePlayed: boolean;
  timings: StepTiming[];
  controls: Pick<Telemetry, 'pauses' | 'addTimes' | 'skips' | 'tempoChanges' | 'kicks'>;
  connection: { reconnects: number; hostReconnects: number };
  errors: Telemetry['errors'];
  clientErrors: Telemetry['clientErrors'];
  years: {
    year: number;
    crisisId: string;
    decisions: Record<Role, Record<string, unknown>>;
    lockSource: Record<Role, string>;
    statsAfter: Record<string, number>;
    headline: string;
  }[];
  pacts: { year: number; from: Role; to: Role; fromTerm: string; toTerm: string; status: string; keptFrom: boolean | null; keptTo: boolean | null }[];
  outcome: {
    ending: string;
    collapses: string[];
    lastYear: number;
    index: number;
    teams: { role: Role; agenda: string; achieved: boolean; score: number; correctGuesses: number; pactsKept: number; pactsBroken: number }[];
    oknum: { role: Role; identified: boolean; votes: number } | null;
  } | null;
  quiz: QuizSummary['results'] & { eligible: number; praDone: number; pascaDone: number } | null;
  survey: SurveySummary | null;
  /** GDD success measures that one session can show on its own. */
  measures: {
    /** Share of teams that agreed at least one pact (target ≥ 70%). */
    teamsWithPact: number;
    /** Mean "seru" score (target ≥ 4). */
    fun: number | null;
    /** Quiz gain in points for players who took both (target ≥ 20). */
    quizGain: number | null;
  };
  /** Facilitator export only. */
  comments?: string[];
}

const iso = (ms: number) => new Date(ms).toISOString();

export function surveySummary(room: Room): SurveySummary {
  const entries = Object.values(room.state.survey);
  const means = {} as SurveySummary['means'];
  const dist = {} as SurveySummary['dist'];
  for (const q of SURVEY) {
    const scores = entries.map(e => e.answers[q.id]);
    means[q.id] = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
    dist[q.id] = [1, 2, 3, 4, 5].map(score => scores.filter(s => s === score).length);
  }
  return { n: entries.length, eligible: room.state.players.length, means, dist };
}

export function sessionReport(room: Room, opts: { includeComments?: boolean } = {}): SessionReport {
  const s = room.state;
  // During Year 0 the real country waits in the practice stash; the report only ever covers it.
  const real = s.practice ?? { game: s.game, pacts: s.pacts, years: s.years };
  const game = real.game;
  const t = s.telemetry;
  const teamSizes = Object.fromEntries(ROLES.map(r => [r, room.members(r).length])) as Record<Role, number>;

  const years: SessionReport['years'] = (game?.log ?? []).map(log => {
    const record = real.years.find(y => y.year === log.year);
    const decisions = {} as Record<Role, Record<string, unknown>>;
    for (const role of ROLES) {
      const { role: _role, ...fields } = log.decisions[role] as unknown as Record<string, unknown>;
      decisions[role] = fields;
    }
    return {
      year: log.year,
      crisisId: log.crisisId,
      decisions,
      lockSource: (record?.lockSource ?? {}) as Record<Role, string>,
      statsAfter: { ...log.statsAfter, bunga: log.bungaAfter },
      headline: record?.frontPage.headline ?? '',
    };
  });

  // Pacts from the real game only: the practice's are thrown away with its country.
  const pacts = real.pacts.map(p => {
    const result = real.years.find(y => y.year === p.year)?.pactResults.find(r => r.pactId === p.id);
    return { year: p.year, from: p.from, to: p.to, fromTerm: p.fromTerm, toTerm: p.toTerm, status: p.status, keptFrom: result?.keptFrom ?? null, keptTo: result?.keptTo ?? null };
  });
  const agreed = pacts.filter(p => p.status === 'disepakati');
  const pactTeams = new Set(agreed.flatMap(p => [p.from, p.to]));

  const outcome: SessionReport['outcome'] = game && s.results
    ? {
      ending: getEnding(game),
      collapses: [...game.collapses],
      lastYear: game.log.at(-1)?.year ?? 0,
      index: indexNegara(game.stats),
      teams: s.results.teams.map(r => ({ role: r.role, agenda: r.agenda, achieved: r.achieved, score: r.score, correctGuesses: r.correctGuesses, pactsKept: r.pactsKept, pactsBroken: r.pactsBroken })),
      oknum: s.results.oknum,
    }
    : null;

  const quiz = quizSummary(room);
  const survey = s.surveyOpen || Object.keys(s.survey).length ? surveySummary(room) : null;

  const report: SessionReport = {
    version: REPORT_VERSION,
    id: `${iso(s.createdAt).slice(0, 10)}-${s.code}-${s.createdAt.toString(36)}`,
    createdAt: iso(s.createdAt),
    updatedAt: iso(s.updatedAt),
    phase: s.phase,
    options: { oknum: s.options.oknum, latihan: !!s.options.latihan, kuis: !!s.options.kuis },
    tempo: s.tempo,
    players: s.players.length,
    teamSizes,
    offlineRoles: [...s.offlineRoles],
    practicePlayed: t.steps.some(st => st.phase === 'tahun' && st.year === 0),
    timings: t.steps.map(st => ({ ...st })),
    controls: { pauses: t.pauses, addTimes: t.addTimes, skips: t.skips, tempoChanges: t.tempoChanges, kicks: t.kicks },
    connection: { reconnects: t.reconnects, hostReconnects: t.hostReconnects },
    errors: { ...t.errors },
    clientErrors: t.clientErrors.map(e => ({ ...e })),
    years,
    pacts,
    outcome,
    quiz: quiz?.results ? { ...quiz.results, eligible: quiz.eligible, praDone: quiz.praDone, pascaDone: quiz.pascaDone } : null,
    survey,
    measures: {
      teamsWithPact: Math.round((pactTeams.size / ROLES.length) * 100) / 100,
      fun: survey?.means.seru ?? null,
      quizGain: quiz?.results?.gain ?? null,
    },
  };
  if (opts.includeComments) report.comments = Object.values(s.survey).map(e => e.comment).filter((c): c is string => !!c);
  return report;
}
