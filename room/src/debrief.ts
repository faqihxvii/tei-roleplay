import { getAgenda } from '../../engine/src/content/agendas';
import { getCrisis } from '../../engine/src/content/crises';
import { getCard } from '../../engine/src/content/policies';
import { ROLE_LABEL } from '../../engine/src/content/roles';
import { INITIAL_STATS } from '../../engine/src/game';
import { PACT_TERMS } from '../../engine/src/pacts';
import { INDICATORS, ROLES, type Delta, type GameState, type Indicator, type Role, type Stats, type YearLog } from '../../engine/src/types';
import { REAL_WORLD, type RealWorldNote } from './content/realWorld';
import { causeLabel, causeRole, describeDecision, groupDeltas, isIndicator, STAT_NAME, type CauseGroup } from './labels';
import type { RoomSnapshot } from './room';

// Guided debrief (GDD, "Mode debrief di layar utama"): timeline, cause-and-effect chains,
// agenda reveal against the guesses, three rounds of questions, and a real-world link.
// Everything here is public: by the end of the game every decision has been revealed.

export type DebriefSection = 'hasil' | 'garisWaktu' | 'sebab' | 'agenda' | 'diskusi' | 'duniaNyata' | 'kuis' | 'penutup';
/** 'kuis' only appears when the room plays with the pre/post quiz; 'penutup' (closing survey) always ends the debrief. */
export const DEBRIEF_SECTIONS: DebriefSection[] = ['hasil', 'garisWaktu', 'sebab', 'agenda', 'diskusi', 'duniaNyata', 'kuis', 'penutup'];

export interface DebriefState {
  section: DebriefSection;
  focus: { stat: Indicator; year: number } | null;
  /** Agenda reveal: how many teams are uncovered so far. */
  agendaShown: number;
  /** Discussion: 0 what happened, 1 why, 2 where in the real world. */
  round: number;
  /** Quiz: whether the correct answers are on screen yet. */
  quizReveal: boolean;
}

export const initialDebrief = (): DebriefState => ({ section: 'hasil', focus: null, agendaShown: 0, round: 0, quizReveal: false });

export interface TurningPoint {
  stat: Indicator;
  year: number;
  from: number;
  to: number;
  label: string;
}

export interface ChainLink {
  label: string;
  role: Role | null;
  amount: number;
  /** Where a delayed effect or a standing condition came from. */
  origin: { year: number; label: string; role: Role | null } | null;
  note: string | null;
}

export interface ChainView {
  stat: Indicator;
  year: number;
  from: number;
  to: number;
  links: ChainLink[];
  /** True when the 0–10 limits swallowed part of the change. */
  clamped: boolean;
}

export interface TitleView {
  title: string;
  role: Role;
  reason: string;
}

export interface AgendaRevealView {
  role: Role;
  agendaName: string;
  agendaDescription: string;
  achieved: boolean;
  guesses: { by: Role; guess: string | null; correct: boolean }[];
}

export interface YearHistory {
  year: number;
  crisis: string;
  stats: Record<Indicator, number> & { bunga: number };
  decisions: { role: Role; lines: string[]; cancelled: boolean }[];
  events: string[];
  pacts: { from: Role; to: Role; fromText: string; toText: string; keptFrom: boolean; keptTo: boolean }[];
  headline: string;
  subheadline: string;
  voices: { who: string; text: string }[];
  ad: string;
  groups: CauseGroup[];
}

export interface DebriefView extends DebriefState {
  turningPoints: TurningPoint[];
  chain: ChainView | null;
  titles: TitleView[];
  agendas: AgendaRevealView[];
  rounds: { title: string; prompts: string[] }[];
  teamPrompts: Record<Role, string>;
  realWorld: (RealWorldNote & { crisisTitle: string; year: number }) | null;
  /** Short markers under the timeline, per year. */
  markers: { year: number; text: string }[];
}

const publicOf = (stats: Stats) => {
  const out = {} as Record<Indicator, number>;
  for (const stat of INDICATORS) out[stat] = stats[stat];
  return out;
};

const statsBefore = (game: GameState, year: number): Stats => (year > 1 ? game.log[year - 2]!.statsAfter : INITIAL_STATS);

const worse = (stat: Indicator, delta: number) => (stat === 'harga' || stat === 'keresahan' ? delta > 0 : delta < 0);

function inDanger(stat: Indicator, value: number): boolean {
  switch (stat) {
    case 'harga': return value >= 6;
    case 'kerja': return value <= 4;
    case 'kas': return value <= 2;
    case 'kepercayaan': return value <= 4;
    case 'keresahan': return value >= 7;
  }
}

/** Big swings, entries into a danger zone, and collapses, biggest first. */
export function turningPoints(game: GameState): TurningPoint[] {
  const points: (TurningPoint & { score: number })[] = [];
  for (const log of game.log) {
    const before = statsBefore(game, log.year);
    for (const stat of INDICATORS) {
      const from = before[stat];
      const to = log.statsAfter[stat];
      const diff = to - from;
      const enteredDanger = !inDanger(stat, from) && inDanger(stat, to);
      const collapsed = game.log.at(-1) === log && game.collapses.length > 0 && (to <= 0 || to >= 10);
      if (Math.abs(diff) < 2 && !enteredDanger && !collapsed) continue;
      const verb = diff === 0 ? 'bertahan di' : worse(stat, diff)
        ? (stat === 'harga' || stat === 'keresahan' ? 'melonjak' : 'anjlok')
        : (stat === 'harga' || stat === 'keresahan' ? 'turun' : 'naik');
      points.push({
        stat,
        year: log.year,
        from,
        to,
        label: `${STAT_NAME[stat]} ${verb} ${from} → ${to} di tahun ${log.year}`,
        score: Math.abs(diff) + (enteredDanger ? 1.5 : 0) + (collapsed ? 5 : 0) + (worse(stat, diff) ? 0.5 : 0),
      });
    }
  }
  return points.sort((a, b) => b.score - a.score).slice(0, 5).map(({ score: _score, ...p }) => p);
}

/** Traces where a delayed effect due in `year` was set in motion. */
function originOf(game: GameState, cause: string, year: number): ChainLink['origin'] {
  const [kind, id = ''] = cause.split(':');
  if (kind === 'tuas' && id.startsWith('bunga')) {
    return { year: year - 1, label: causeLabel(cause), role: 'bankSentral' };
  }
  if (kind === 'kartu') {
    const card = getCard(id);
    for (const delayed of card.delayed ?? []) {
      const log = game.log[year - delayed.inYears - 1];
      if (log && log.decisions[card.role].cardId === id && !log.cancelled.includes(id)) {
        return { year: log.year, label: `${ROLE_LABEL[card.role]} memainkan ${card.name}`, role: card.role };
      }
    }
  }
  return null;
}

function systemNote(cause: string, log: YearLog): string | null {
  const id = cause.split(':')[1];
  switch (id) {
    case 'inflasiBawaan': return `Suku bunga berakhir di level ${log.bungaAfter}, di bawah 3.`;
    case 'hargaTinggi': return 'Harga 6 atau lebih di akhir tahun.';
    case 'pengangguran': return 'Lapangan Kerja 4 atau kurang di akhir tahun.';
    case 'tidakPercaya': return 'Kepercayaan 4 atau kurang di akhir tahun.';
    case 'bebanRutin': return 'Terjadi setiap tahun.';
    default: return null;
  }
}

/** Every cause behind one indicator's change in one year, with delayed effects traced to their source. */
export function chain(game: GameState, stat: Indicator, year: number): ChainView | null {
  const log = game.log[year - 1];
  if (!log) return null;
  const deltas: Delta[] = [...log.openingDeltas, ...log.deltas].filter(d => d.stat === stat);
  const groups = groupDeltas(deltas, log.decisions, s => s === stat);
  const from = statsBefore(game, year)[stat];
  const to = log.statsAfter[stat];
  const links = groups.map(group => {
    const delayed = group.cause.startsWith('jalur:');
    const base = delayed ? group.cause.slice(6) : group.cause;
    const origin = delayed ? originOf(game, base, year) : null;
    return {
      label: group.label,
      role: delayed ? origin?.role ?? causeRole(base) : group.role,
      amount: group.changes[0]!.amount,
      origin,
      note: group.cause.startsWith('sistem:') ? systemNote(group.cause, log) : group.cause.startsWith('krisis:') ? 'Saat krisis dibuka, sebelum tim memutuskan.' : null,
    };
  });
  const sum = links.reduce((a, l) => a + l.amount, 0);
  return { stat, year, from, to, links, clamped: sum !== to - from };
}

/** How much a team's own choices helped (+) or hurt (−) the public indicators in one year. */
function teamHelp(log: YearLog, role: Role): number {
  return log.deltas
    .filter(d => isIndicator(d.stat) && causeRole(d.cause) === role)
    .reduce((sum, d) => sum + (worse(d.stat as Indicator, d.amount) ? -Math.abs(d.amount) : Math.abs(d.amount)), 0);
}

/** The year whose crisis hit hardest when it opened. */
function crisisYear(game: GameState): YearLog | null {
  let best: YearLog | null = null;
  let bestHit = -1;
  for (const log of game.log) {
    const hit = log.openingDeltas.filter(d => isIndicator(d.stat)).reduce((a, d) => a + Math.abs(d.amount), 0);
    if (hit >= bestHit) { best = log; bestHit = hit; }
  }
  return best;
}

export function titles(s: RoomSnapshot, tally: Record<Role, { kept: number; broken: number }>): TitleView[] {
  const game = s.game!;
  const out: TitleView[] = [];
  const byKept = [...ROLES].sort((a, b) => tally[b].kept - tally[a].kept || tally[a].broken - tally[b].broken);
  if (tally[byKept[0]!].kept > 0) out.push({ title: 'Paling Menepati Janji', role: byKept[0]!, reason: `Menepati ${tally[byKept[0]!].kept} janji, melanggar ${tally[byKept[0]!].broken}.` });
  const byBroken = [...ROLES].sort((a, b) => tally[b].broken - tally[a].broken);
  if (tally[byBroken[0]!].broken > 0) {
    out.push({ title: 'Paling Licin', role: byBroken[0]!, reason: `Melanggar ${tally[byBroken[0]!].broken} janji di Meja Lobi.` });
  } else if (game.counters.lobiAman > 0) {
    out.push({ title: 'Paling Licin', role: 'pengusaha', reason: 'Lobinya lolos tanpa pernah terbongkar.' });
  }
  const worst = crisisYear(game);
  if (worst) {
    const best = [...ROLES].sort((a, b) => teamHelp(worst, b) - teamHelp(worst, a))[0]!;
    if (teamHelp(worst, best) > 0) out.push({ title: 'Penyelamat Tahun Krisis', role: best, reason: `Keputusannya paling menolong indikator negara di tahun ${worst.year} (${getCrisis(worst.crisisId).title}).` });
  }
  const impact = (role: Role) => game.log.reduce((sum, log) => sum + log.deltas.filter(d => isIndicator(d.stat) && causeRole(d.cause) === role).reduce((a, d) => a + Math.abs(d.amount), 0), 0);
  const loudest = [...ROLES].sort((a, b) => impact(b) - impact(a))[0]!;
  out.push({ title: 'Paling Berpengaruh', role: loudest, reason: 'Keputusannya paling banyak menggerakkan indikator negara selama permainan.' });
  return out;
}

const TEAM_PROMPTS: Record<Role, string> = {
  pemerintah: 'Kapan timmu memilih yang populer daripada yang sehat untuk Kas Negara? Apa akibatnya setahun kemudian?',
  bankSentral: 'Kapan timmu mengorbankan lapangan kerja demi harga, atau sebaliknya? Apakah itu sepadan?',
  pengusaha: 'Keputusan mana yang menguntungkan Modal timmu tetapi merugikan negara? Siapa yang menanggungnya?',
  buruh: 'Kapan menekan lebih keras justru merugikan anggota timmu sendiri?',
  masyarakat: 'Kapan pilihan yang baik untuk dapur sendiri buruk untuk ekonomi bersama?',
};

export function debriefView(s: RoomSnapshot, tally: Record<Role, { kept: number; broken: number }>): DebriefView | null {
  const game = s.game;
  if (!game || !s.results || !s.debrief) return null;
  const points = turningPoints(game);
  const focus = s.debrief.focus ?? (points[0] ? { stat: points[0].stat, year: points[0].year } : null);
  const worst = crisisYear(game);
  const note = worst ? REAL_WORLD[worst.crisisId] : undefined;
  const top = points[0];
  const hasDelayed = game.log.some(l => l.deltas.some(d => d.cause.startsWith('jalur:')));
  const brokenPacts = s.years.flatMap(y => y.pactResults).filter(r => !r.keptFrom || !r.keptTo).length;

  const agendas: AgendaRevealView[] = ROLES.map(role => {
    const result = s.results!.teams.find(t => t.role === role)!;
    return {
      role,
      agendaName: getAgenda(result.agenda).name,
      agendaDescription: getAgenda(result.agenda).description,
      achieved: result.achieved,
      guesses: ROLES.filter(by => by !== role).map(by => {
        const guess = s.finals[by]?.agendas[role] ?? null;
        return { by, guess: guess ? getAgenda(guess).name : null, correct: guess === result.agenda };
      }),
    };
  });

  const markers: DebriefView['markers'] = [];
  for (const log of game.log) {
    for (const event of log.events) markers.push({ year: log.year, text: event });
    const record = s.years.find(y => y.year === log.year);
    for (const result of record?.pactResults ?? []) {
      const pact = s.pacts.find(p => p.id === result.pactId)!;
      if (!result.keptFrom) markers.push({ year: log.year, text: `${ROLE_LABEL[pact.from]} melanggar pakta` });
      if (!result.keptTo) markers.push({ year: log.year, text: `${ROLE_LABEL[pact.to]} melanggar pakta` });
    }
  }

  return {
    ...s.debrief,
    focus,
    turningPoints: points,
    chain: focus ? chain(game, focus.stat, focus.year) : null,
    titles: titles(s, tally),
    agendas,
    rounds: [
      {
        title: 'Apa yang terjadi?',
        prompts: [
          'Ceritakan lima tahun ini dalam satu kalimat, seperti headline koran.',
          top ? `Titik balik terbesar: ${top.label}. Apa yang kalian rasakan saat itu?` : 'Indikator mana yang paling banyak berubah?',
          brokenPacts ? `Ada ${brokenPacts} janji yang dilanggar. Bagaimana rasanya dikhianati, atau mengkhianati?` : 'Pakta mana yang paling penting, dan mengapa ditepati?',
        ],
      },
      {
        title: 'Mengapa terjadi?',
        prompts: [
          focus ? `Telusuri ${STAT_NAME[focus.stat]} di tahun ${focus.year}: keputusan tim mana yang paling berpengaruh?` : 'Keputusan tim mana yang paling berpengaruh?',
          hasDelayed ? 'Efek tertunda mana yang paling mengejutkan? Mengapa mudah dilupakan saat memutuskan?' : 'Mengapa tidak ada tim yang memakai kebijakan berefek jangka panjang?',
          'Apakah agenda rahasia mendorong timmu melawan kepentingan negara? Kapan?',
        ],
      },
      {
        title: 'Di mana ini terjadi di dunia nyata?',
        prompts: [
          note && worst ? `${getCrisis(worst.crisisId).title} mirip dengan peristiwa nyata: ${note.title}. Siapa yang menanggung biayanya?` : 'Peristiwa ekonomi nyata apa yang mirip dengan krisis di permainan ini?',
          'Peran mana di dunia nyata yang paling sulit dimainkan dengan jujur? Mengapa?',
          'Jika kalian bisa mengubah satu aturan di negara ini, aturan apa?',
        ],
      },
    ],
    teamPrompts: TEAM_PROMPTS,
    realWorld: note && worst ? { ...note, crisisTitle: getCrisis(worst.crisisId).title, year: worst.year } : null,
    markers,
  };
}

/** The full record for the export and the Edisi Khusus; host only, since it is long. */
export function history(s: RoomSnapshot): YearHistory[] {
  const game = s.game;
  if (!game) return [];
  return game.log.map(log => {
    const record = s.years.find(y => y.year === log.year);
    return {
      year: log.year,
      crisis: getCrisis(log.crisisId).title,
      stats: { ...publicOf(log.statsAfter), bunga: log.bungaAfter },
      decisions: ROLES.map(role => ({
        role,
        lines: describeDecision(log.decisions[role], log.bungaAfter),
        cancelled: !!log.decisions[role].cardId && log.cancelled.includes(log.decisions[role].cardId!),
      })),
      events: log.events,
      pacts: (record?.pactResults ?? []).map(r => {
        const p = s.pacts.find(x => x.id === r.pactId)!;
        return { from: p.from, to: p.to, fromText: PACT_TERMS[p.fromTerm].text, toText: PACT_TERMS[p.toTerm].text, keptFrom: r.keptFrom, keptTo: r.keptTo };
      }),
      headline: record?.frontPage.headline ?? '',
      subheadline: record?.frontPage.subheadline ?? '',
      voices: record?.frontPage.voices ?? [],
      ad: record?.frontPage.ad ?? '',
      groups: groupDeltas([...log.openingDeltas, ...log.deltas], log.decisions, isIndicator),
    };
  });
}
