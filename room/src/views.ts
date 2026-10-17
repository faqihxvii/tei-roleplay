import { agendasForRole, getAgenda } from '../../engine/src/content/agendas';
import { getCrisis } from '../../engine/src/content/crises';
import { getCard } from '../../engine/src/content/policies';
import { ROLE_LABEL } from '../../engine/src/content/roles';
import { canBelanja, canMogok, canPlay, INITIAL_STATS, isLeverFrozen } from '../../engine/src/game';
import { PACT_TERMS, termsForRole } from '../../engine/src/pacts';
import { getEnding, indexNegara, type Ending } from '../../engine/src/scoring';
import { INDICATORS, ROLES, type Collapse, type Decision, type Effects, type GameState, type Indicator, type Lever, type Role, type Stat, type Stats } from '../../engine/src/types';
import { debriefView, history, type DebriefView, type YearHistory } from './debrief';
import type { FrontPage } from './koran';
import { causeRole, describeDecision, groupDeltas, isIndicator, OWN_RESOURCE, STAT_NAME, type CauseGroup } from './labels';
import { QUIZ, quizScore } from './content/quiz';
import { REAL_WORLD } from './content/realWorld';
import { DECIDING_STEPS, MAX_PACTS_PER_TEAM, type QuizStage, type FinalVote, type LockSource, type PactRecord, type Room, type RoomOptions, type RoomPhase, type Tempo, type YearStep } from './room';

// What each screen may see. The projected host screen never receives agendas, hands or private
// resources; a phone receives only its own team's (GDD, "UX/UI": secrets never reach the main screen).
// The facilitator console rides on the host connection and gets team hands only for its decision form.

export type PublicStats = Record<Indicator, number> & { bunga: number };

export interface PlayerSummary {
  id: string;
  nickname: string;
  role: Role | null;
  connected: boolean;
}

export interface Clock {
  phaseEndsAt: number | null;
  pausedMs: number | null;
}

export interface PactView {
  id: string;
  from: Role;
  to: Role;
  fromText: string;
  toText: string;
  status: PactRecord['status'];
  result: { keptFrom: boolean; keptTo: boolean } | null;
}

export interface RevealTeam {
  role: Role;
  lines: string[];
  cancelled: boolean;
  source: LockSource;
}

export interface RevealView {
  year: number;
  /** Least impactful first, so the biggest card is revealed last (GDD, "Momen kunci"). */
  teams: RevealTeam[];
  groups: CauseGroup[];
  events: string[];
  collapses: Collapse[];
  statsBefore: PublicStats;
  statsAfter: PublicStats;
  pacts: PactView[];
}

export interface EffectView {
  stat: Stat;
  label: string;
  arrows: string;
  up: boolean;
  /** Whether the change is good news: falling Harga or Keresahan is. */
  good: boolean;
}

export interface CardView {
  id: string;
  name: string;
  description: string;
  effects: EffectView[];
  delayed: EffectView[];
  playable: boolean;
  requires: string | null;
  note: string | null;
}

export interface DecisionContext {
  role: Role;
  hand: CardView[];
  bunga: number;
  frozen: Lever[];
  canMogok: boolean;
  canBelanja: boolean;
  viralTargets: Role[];
  locked: { decision: Decision; source: LockSource } | null;
  tally: Record<string, { value: unknown; count: number }[]>;
  proposers: number;
  members: number;
  /** What the team plays if nobody locks in time. */
  majority: Decision;
}

export interface ResultsView {
  ending: Ending;
  index: number;
  collapses: Collapse[];
  teams: {
    role: Role;
    agendaName: string;
    agendaDescription: string;
    achieved: boolean;
    score: number;
    correctGuesses: number;
    pactsKept: number;
    pactsBroken: number;
  }[];
  oknum: { role: Role; identified: boolean; votes: number } | null;
  timeline: { year: number; stats: PublicStats }[];
  headlines: { year: number; headline: string }[];
}

interface Common extends Clock {
  code: string;
  phase: RoomPhase;
  step: YearStep | null;
  year: number;
  maxYears: number;
  options: RoomOptions;
  tempo: Tempo;
  stats: PublicStats | null;
  crisis: {
    /** Card id, for the illustration slot (public/art/manifest.json). */
    id: string;
    title: string;
    ruleText: string;
    category: string;
    narrative: string;
    question: string;
    concepts: string[];
    /** "Tahukah Anda": the real event behind the card, by title and source only; the debrief tells it in full. */
    didYouKnow: { title: string; source: string; url: string } | null;
    opening: { stat: Stat; amount: number }[];
    statsBefore: PublicStats;
  } | null;
  /** Year 0: a guided practice whose results are thrown away. */
  practice: boolean;
  /** Year 5 opens with Kepercayaan read out as an election poll (GDD, "Busur cerita lima tahun"). */
  pemilu: boolean;
  teams: { role: Role; label: string; offline: boolean; locked: boolean; proposers: number; members: number; finalDone: boolean }[];
  pacts: PactView[];
  reveal: RevealView | null;
  frontPage: FrontPage | null;
  results: ResultsView | null;
  debrief: DebriefView | null;
  quiz: QuizSummary | null;
}

export interface QuizQuestionResult {
  id: string;
  concept: string;
  text: string;
  /** Share of takers who answered right, 0–100; null before anyone has. */
  praPct: number | null;
  pascaPct: number | null;
  /** Only once the facilitator reveals the answers. */
  answer: { option: string; explanation: string } | null;
}

/** Class-level numbers only: the main screen never shows who scored what. */
export interface QuizSummary {
  eligible: number;
  praDone: number;
  pascaDone: number;
  /** After the game: per question, and the mean gain for players who took both. */
  results: { questions: QuizQuestionResult[]; praMean: number | null; pascaMean: number | null; paired: number; gain: number | null } | null;
}

export interface HostView extends Common {
  players: PlayerSummary[];
  offlineRoles: Role[];
  spokespeople: Partial<Record<Role, string>>;
  /** After the game: the full record for the export and the Edisi Khusus. */
  history: YearHistory[] | null;
  /** After the game, for the teacher's CSV only (never drawn on the main screen): quiz rows per nickname. */
  quizRows: { nickname: string; role: Role | null; pra: number[] | null; pasca: number[] | null; praScore: number | null; pascaScore: number | null }[] | null;
  /** Console only: every team's decision form during the deciding steps. */
  console: { decisions: Partial<Record<Role, DecisionContext>>; agendaOptions: Record<Role, { id: string; name: string }[]> } | null;
}

export interface PlayerView extends Common {
  me: { id: string; nickname: string; role: Role | null; isSpokesperson: boolean };
  team: {
    role: Role;
    label: string;
    members: string[];
    spokesperson: string | null;
    agenda: { name: string; description: string } | null;
    resource: { stat: Stat; label: string; value: number; change: number | null } | null;
  } | null;
  decision: (DecisionContext & { myProposal: Decision | null }) | null;
  myQuiz: {
    open: QuizStage | null;
    questions: { id: string; text: string; options: string[] }[];
    done: { pra: boolean; pasca: boolean };
    /** Own scores, shown once the post quiz is in so the pre score teaches nothing early. */
    scores: { pra: number | null; pasca: number | null } | null;
    /** Own answers against the key, after the facilitator reveals it. */
    review: { text: string; correct: string; explanation: string; pra: number | null; pasca: number | null; right: number }[] | null;
  } | null;
  lobby: { terms: Record<Role, { id: string; text: string }[]>; maxPacts: number } | null;
  final: { options: Record<Role, { id: string; name: string; description: string }[]>; mine: FinalVote | null } | null;
}

const publicStats = (stats: Stats, bunga: number): PublicStats => {
  const out = { bunga } as PublicStats;
  for (const stat of INDICATORS) out[stat] = stats[stat];
  return out;
};

function effectViews(effects: Effects): EffectView[] {
  return (Object.entries(effects) as [Stat, number][])
    .filter(([, n]) => n)
    .map(([stat, n]) => ({ stat, label: STAT_NAME[stat], arrows: (n > 0 ? '▲' : '▼').repeat(Math.min(3, Math.abs(n))), up: n > 0, good: (stat === 'harga' || stat === 'keresahan') ? n < 0 : n > 0 }));
}

function cardView(game: GameState, role: Role, id: string): CardView {
  const card = getCard(id);
  const modifier = getCrisis(game.crisisId).modifier;
  const notes: string[] = [];
  if (modifier.kind === 'scaleTag' && card.tags.includes(modifier.tag)) notes.push(`×${modifier.factor} tahun ini karena krisis`);
  if (game.austerity && card.tags.includes('belanja')) notes.push('Setengah efek: Kas sedang dihemat');
  const requires = Object.entries(card.requires ?? {}).map(([stat, min]) => `Butuh ${STAT_NAME[stat as Stat]} ≥ ${min}`).join(', ');
  return {
    id,
    name: card.name,
    description: card.description,
    effects: effectViews(card.effects),
    delayed: (card.delayed ?? []).flatMap(d => effectViews(d.effects)),
    playable: canPlay(game, role, id),
    requires: requires || null,
    note: notes.join('. ') || null,
  };
}

function decisionContext(room: Room, role: Role): DecisionContext {
  const s = room.state;
  const game = s.game!;
  return {
    role,
    hand: game.hands[role].map(id => cardView(game, role, id)),
    bunga: game.bunga,
    frozen: (['pajak', 'bunga', 'harga', 'upah', 'konsumsi'] as Lever[]).filter(lever => isLeverFrozen(game, lever)),
    canMogok: canMogok(game),
    canBelanja: canBelanja(game),
    viralTargets: ROLES.filter(r => r !== 'masyarakat'),
    locked: s.locked[role] ?? null,
    tally: room.tally(role),
    proposers: room.members(role).filter(p => s.proposals[p.id]).length,
    members: room.members(role).length,
    majority: room.majority(role),
  };
}

function pactView(room: Room, pact: PactRecord): PactView {
  const record = room.state.years.find(y => y.year === pact.year);
  const result = record?.pactResults.find(r => r.pactId === pact.id) ?? null;
  return {
    id: pact.id,
    from: pact.from,
    to: pact.to,
    fromText: PACT_TERMS[pact.fromTerm].text,
    toText: PACT_TERMS[pact.toTerm].text,
    status: pact.status,
    result: result && { keptFrom: result.keptFrom, keptTo: result.keptTo },
  };
}

function revealView(room: Room): RevealView | null {
  const s = room.state;
  const game = s.game;
  const record = s.years.at(-1);
  const log = game?.log.at(-1);
  if (!game || !record || !log || log.year !== record.year) return null;
  const previous = game.log.at(-2);
  const impact = (role: Role) => log.deltas.filter(d => isIndicator(d.stat) && causeRole(d.cause) === role).reduce((sum, d) => sum + Math.abs(d.amount), 0);
  const teams = ROLES.map(role => ({
    role,
    lines: describeDecision(log.decisions[role], log.bungaAfter),
    cancelled: !!log.decisions[role].cardId && log.cancelled.includes(log.decisions[role].cardId!),
    source: record.lockSource[role],
    impact: impact(role),
  })).sort((a, b) => a.impact - b.impact).map(({ impact: _impact, ...team }) => team);
  return {
    year: log.year,
    teams,
    groups: groupDeltas(log.deltas, log.decisions, isIndicator),
    events: log.events,
    collapses: game.log.at(-1) === log ? game.collapses : [],
    // The board as teams decided: last year's end plus this year's crisis.
    statsBefore: afterCrisis(previous?.statsAfter ?? INITIAL_STATS, log.openingDeltas, previous?.bungaAfter ?? 3),
    statsAfter: publicStats(log.statsAfter, log.bungaAfter),
    pacts: s.pacts.filter(p => p.year === log.year && p.status === 'disepakati').map(p => pactView(room, p)),
  };
}

function afterCrisis(stats: Stats, opening: { stat: Stat; amount: number }[], bunga: number): PublicStats {
  const out = publicStats(stats, bunga);
  for (const d of opening) if (isIndicator(d.stat)) out[d.stat] = Math.max(0, Math.min(10, out[d.stat] + d.amount));
  return out;
}

function resultsView(room: Room): ResultsView | null {
  const s = room.state;
  if (!s.results || !s.game) return null;
  const game = s.game;
  return {
    ending: getEnding(game),
    index: indexNegara(game.log.at(-1)!.statsAfter),
    collapses: game.collapses,
    teams: s.results.teams.map(t => ({
      role: t.role,
      agendaName: getAgenda(t.agenda).name,
      agendaDescription: getAgenda(t.agenda).description,
      achieved: t.achieved,
      score: t.score,
      correctGuesses: t.correctGuesses,
      pactsKept: t.pactsKept,
      pactsBroken: t.pactsBroken,
    })),
    oknum: s.results.oknum,
    timeline: [{ year: 0, stats: publicStats(INITIAL_STATS, 3) }, ...game.log.map(l => ({ year: l.year, stats: publicStats(l.statsAfter, l.bungaAfter) }))],
    headlines: s.years.map(y => ({ year: y.year, headline: y.frontPage.headline })),
  };
}

function common(room: Room): Common {
  const s = room.state;
  const game = s.game;
  const resolvedView = s.step === 'pengungkapan' || s.step === 'koran' || s.phase === 'tebak' || s.phase === 'selesai';
  const last = game?.log.at(-1);
  let stats: PublicStats | null = null;
  if (game) stats = resolvedView && last ? publicStats(last.statsAfter, last.bungaAfter) : publicStats(game.stats, game.bunga);

  let crisis: Common['crisis'] = null;
  if (game && s.phase === 'tahun' && !resolvedView) {
    const card = getCrisis(game.crisisId);
    crisis = {
      id: card.id,
      title: card.title,
      ruleText: card.ruleText,
      category: card.category,
      narrative: card.narrative,
      question: card.question,
      concepts: card.concepts,
      didYouKnow: REAL_WORLD[card.id] ? { title: REAL_WORLD[card.id]!.title, source: REAL_WORLD[card.id]!.source, url: REAL_WORLD[card.id]!.url } : null,
      opening: game.openingDeltas.filter(d => isIndicator(d.stat)).map(d => ({ stat: d.stat, amount: d.amount })),
      statsBefore: publicStats(last?.statsAfter ?? INITIAL_STATS, last?.bungaAfter ?? 3),
    };
  }

  // The practice country is shown as year 0; internally it is its own year 1.
  const year = room.inPractice ? 0 : room.year;
  return {
    code: s.code,
    phase: s.phase,
    step: s.step,
    year,
    maxYears: game?.maxYears ?? 5,
    practice: room.inPractice,
    options: { ...s.options },
    tempo: s.tempo,
    phaseEndsAt: s.phaseEndsAt,
    pausedMs: s.pausedMs,
    stats,
    crisis,
    pemilu: !!game && s.phase === 'tahun' && !room.inPractice && year === game.maxYears && !resolvedView,
    teams: ROLES.map(role => ({
      role,
      label: ROLE_LABEL[role],
      offline: s.offlineRoles.includes(role),
      locked: !!s.locked[role],
      proposers: room.members(role).filter(p => s.proposals[p.id]).length,
      members: room.members(role).length,
      finalDone: !!s.finals[role],
    })),
    // The Meja Lobi is public: everyone sees agreed pacts, and broken ones are torn up at the reveal.
    pacts: s.phase === 'tahun' ? room.pactsThisYear().filter(p => p.status === 'disepakati').map(p => pactView(room, p)) : [],
    reveal: resolvedView && s.phase === 'tahun' ? asYear(revealView(room), year) : null,
    frontPage: s.step === 'koran' ? asYear(s.years.at(-1)?.frontPage ?? null, year) : null,
    results: resultsView(room),
    debrief: s.phase === 'selesai' ? debriefView(s, room.pactTally()) : null,
    quiz: quizSummary(room),
  };
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);

function quizSummary(room: Room): QuizSummary | null {
  const s = room.state;
  if (!s.options.kuis) return null;
  const entries = Object.values(s.quiz);
  const pra = entries.filter(e => e.pra).map(e => e.pra!);
  const pasca = entries.filter(e => e.pasca).map(e => e.pasca!);
  let results: QuizSummary['results'] = null;
  if (s.phase === 'selesai') {
    const reveal = !!s.debrief?.quizReveal;
    const paired = entries.filter(e => e.pra && e.pasca);
    const mean = (list: number[][]) => (list.length ? Math.round((list.reduce((a, l) => a + quizScore(l), 0) / list.length / QUIZ.length) * 100) : null);
    results = {
      questions: QUIZ.map((q, i) => ({
        id: q.id,
        concept: q.concept,
        text: q.text,
        praPct: pct(pra.filter(a => a[i] === q.correct).length, pra.length),
        pascaPct: pct(pasca.filter(a => a[i] === q.correct).length, pasca.length),
        answer: reveal ? { option: q.options[q.correct]!, explanation: q.explanation } : null,
      })),
      praMean: mean(pra),
      pascaMean: mean(pasca),
      paired: paired.length,
      gain: paired.length ? mean(paired.map(e => e.pasca!))! - mean(paired.map(e => e.pra!))! : null,
    };
  }
  return { eligible: s.players.length, praDone: pra.length, pascaDone: pasca.length, results };
}

/** Stamps the displayed year on a record, so the practice reads as year 0. */
const asYear = <T extends { year: number }>(record: T | null, year: number): T | null => (record ? { ...record, year } : null);

const deciding = (room: Room) => room.phase === 'tahun' && !!room.step && DECIDING_STEPS.includes(room.step);

export function hostView(room: Room): HostView {
  const s = room.state;
  const spokespeople: Partial<Record<Role, string>> = {};
  for (const role of ROLES) {
    const spokesperson = room.spokesperson(role);
    if (spokesperson) spokespeople[role] = spokesperson.id;
  }
  let console: HostView['console'] = null;
  if (deciding(room) || s.phase === 'tebak') {
    const decisions: Partial<Record<Role, DecisionContext>> = {};
    if (deciding(room)) for (const role of ROLES) decisions[role] = decisionContext(room, role);
    const agendaOptions = {} as Record<Role, { id: string; name: string }[]>;
    for (const role of ROLES) agendaOptions[role] = agendasForRole(role).map(a => ({ id: a.id, name: a.name }));
    console = { decisions, agendaOptions };
  }
  return {
    ...common(room),
    players: s.players.map(p => ({ id: p.id, nickname: p.nickname, role: p.role, connected: p.connections > 0 })),
    offlineRoles: [...s.offlineRoles],
    spokespeople,
    history: s.phase === 'selesai' ? history(s) : null,
    quizRows: s.phase === 'selesai' && s.options.kuis
      ? s.players.map(p => {
          const q = s.quiz[p.id] ?? {};
          return { nickname: p.nickname, role: p.role, pra: q.pra ?? null, pasca: q.pasca ?? null, praScore: q.pra ? quizScore(q.pra) : null, pascaScore: q.pasca ? quizScore(q.pasca) : null };
        })
      : null,
    console,
  };
}

export function playerView(room: Room, playerId: string): PlayerView {
  const s = room.state;
  const player = room.player(playerId);
  const role = player.role;
  const game = s.game;
  const base = common(room);
  const spokesperson = role ? room.spokesperson(role) : undefined;

  let team: PlayerView['team'] = null;
  if (role) {
    const agendaId = game && s.phase !== 'gabung' ? game.agendas[role] : null;
    const agenda = agendaId ? getAgenda(agendaId) : null;
    const resourceStat = OWN_RESOURCE[role];
    let resource: NonNullable<PlayerView['team']>['resource'] = null;
    if (resourceStat && game) {
      const last = game.log.at(-1);
      const resolvedView = s.step === 'pengungkapan' || s.step === 'koran' || s.phase === 'tebak' || s.phase === 'selesai';
      const value = resolvedView && last ? last.statsAfter[resourceStat] : game.stats[resourceStat];
      const before = game.log.at(-2)?.statsAfter[resourceStat] ?? INITIAL_STATS[resourceStat];
      resource = { stat: resourceStat, label: STAT_NAME[resourceStat], value, change: resolvedView && s.phase === 'tahun' && last ? last.statsAfter[resourceStat] - before : null };
    }
    team = {
      role,
      label: ROLE_LABEL[role],
      members: room.members(role).map(p => p.nickname),
      spokesperson: spokesperson?.nickname ?? null,
      agenda: agenda ? { name: agenda.name, description: agenda.description } : null,
      resource,
    };
  }

  const decision = role && deciding(room) ? { ...decisionContext(room, role), myProposal: s.proposals[playerId]?.decision ?? null } : null;

  let lobby: PlayerView['lobby'] = null;
  if (role && s.phase === 'tahun' && s.step === 'lobi') {
    const terms = {} as Record<Role, { id: string; text: string }[]>;
    for (const r of ROLES) terms[r] = termsForRole(r).map(t => ({ id: t.id, text: t.text }));
    lobby = { terms, maxPacts: MAX_PACTS_PER_TEAM };
  }

  let final: PlayerView['final'] = null;
  if (role && s.phase === 'tebak') {
    const options = {} as Record<Role, { id: string; name: string; description: string }[]>;
    for (const r of ROLES) if (r !== role) options[r] = agendasForRole(r).map(a => ({ id: a.id, name: a.name, description: a.description }));
    final = { options, mine: s.finals[role] ?? null };
  }

  // A team sees its own pending offers as well as the public table.
  const ownPacts = role && s.phase === 'tahun'
    ? room.pactsThisYear().filter(p => (p.from === role || p.to === role) && p.status !== 'disepakati').map(p => pactView(room, p))
    : [];

  let myQuiz: PlayerView['myQuiz'] = null;
  if (s.options.kuis) {
    const mine = s.quiz[playerId] ?? {};
    const open = room.openQuiz(playerId);
    const scores = mine.pasca ? { pra: mine.pra ? quizScore(mine.pra) : null, pasca: quizScore(mine.pasca) } : null;
    myQuiz = {
      open,
      questions: open ? QUIZ.map(q => ({ id: q.id, text: q.text, options: q.options })) : [],
      done: { pra: !!mine.pra, pasca: !!mine.pasca },
      scores,
      review: mine.pasca && s.debrief?.quizReveal
        ? QUIZ.map((q, i) => ({ text: q.text, correct: q.options[q.correct]!, explanation: q.explanation, pra: mine.pra?.[i] ?? null, pasca: mine.pasca![i]!, right: q.correct }))
        : null,
    };
  }

  return {
    ...base,
    myQuiz,
    pacts: [...base.pacts, ...ownPacts],
    me: { id: player.id, nickname: player.nickname, role, isSpokesperson: !!role && spokesperson?.id === player.id },
    team,
    decision,
    lobby,
    final,
  };
}
