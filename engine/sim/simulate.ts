import { getAgenda } from '../src/content/agendas';
import { createGame, resolveYear } from '../src/game';
import { Rng } from '../src/rng';
import { checkPacts, PACT_TERMS, type Pact } from '../src/pacts';
import { getEnding, isOknumIdentified, type Ending } from '../src/scoring';
import { ROLES, type AgendaId, type Collapse, type Decision, type GameState, type Role, type YearDecisions } from '../src/types';
import { decide, harmOf, initialTrust, negotiate, predictAll, respondAll, voteOknum, type BotKind } from './bots';

export interface SimOptions {
  /** Run the Lobi phase. Off = teams decide alone, for comparison. */
  pacts: boolean;
}

export type Mix = 'kooperatif' | 'egois' | 'campuran' | 'acak' | 'oknum';
export const MIXES: Mix[] = ['kooperatif', 'egois', 'campuran', 'acak', 'oknum'];

export interface MixReport {
  mix: Mix;
  games: number;
  collapseRate: number;
  collapses: Record<Collapse, number>;
  endings: Record<Ending, number>;
  meanCollapseYear: number | null;
  finalMeans: Record<'harga' | 'kerja' | 'kas' | 'kepercayaan' | 'keresahan', number>;
  /** Games where the agenda holder was an Egois bot: how often it was achieved. */
  agendas: Partial<Record<AgendaId, { held: number; achieved: number }>>;
  /** For each card: times it was in a playable hand, and times a bot picked it. */
  cards: Record<string, { available: number; picked: number }>;
  pacts: { made: number; kept: number; broken: number; byKind: Record<BotKind, { kept: number; broken: number }> };
  /** Mode Oknum only. */
  oknum: { games: number; collapsed: number; identified: number; wins: number };
}

function botsFor(mix: Mix, state: GameState, rng: Rng): Record<Role, BotKind> {
  const kinds = {} as Record<Role, BotKind>;
  for (const role of ROLES) {
    if (state.agendas[role] === 'oknum') kinds[role] = 'oknum';
    else if (mix === 'campuran' || mix === 'oknum') kinds[role] = rng.next() < 0.5 ? 'kooperatif' : 'egois';
    else kinds[role] = mix === 'acak' ? 'acak' : mix;
  }
  return kinds;
}

export function simulateMix(mix: Mix, games: number, baseSeed: number, options: SimOptions = { pacts: true }): MixReport {
  const report: MixReport = {
    mix, games, collapseRate: 0,
    collapses: { bangkrut: 0, lengser: 0, anarki: 0, hiperinflasi: 0 },
    endings: { kolaps: 0, sejahtera: 0, bertahan: 0, tertatih: 0 },
    meanCollapseYear: null,
    finalMeans: { harga: 0, kerja: 0, kas: 0, kepercayaan: 0, keresahan: 0 },
    agendas: {},
    cards: {},
    pacts: {
      made: 0, kept: 0, broken: 0,
      byKind: { kooperatif: { kept: 0, broken: 0 }, egois: { kept: 0, broken: 0 }, acak: { kept: 0, broken: 0 }, oknum: { kept: 0, broken: 0 } },
    },
    oknum: { games: 0, collapsed: 0, identified: 0, wins: 0 },
  };
  let collapseYears = 0;

  for (let i = 0; i < games; i++) {
    const seed = (baseSeed + i * 7919 + MIXES.indexOf(mix) * 1_000_003) >>> 0;
    let state = createGame({ seed, oknum: mix === 'oknum' });
    const rng = new Rng(seed ^ 0x9e3779b9);
    const kinds = botsFor(mix, state, rng);
    const trust = initialTrust();
    const harm = Object.fromEntries(ROLES.map(r => [r, 0])) as Record<Role, number>;

    while (!state.ended) {
      const predictions = respondAll(state, kinds, rng, predictAll(state, kinds, rng));
      const pacts: Pact[] = options.pacts ? negotiate(state, kinds, rng, predictions, trust) : [];
      const decisions = {} as YearDecisions;
      for (const role of ROLES) {
        const decision = decide(state, role, kinds, rng, predictions, pacts, trust);
        (decisions as Record<Role, Decision>)[role] = decision;
        if (kinds[role] !== 'acak') {
          for (const id of state.hands[role]) {
            const entry = (report.cards[id] ??= { available: 0, picked: 0 });
            entry.available++;
            if (decision.cardId === id) entry.picked++;
          }
        }
      }
      if (mix === 'oknum') for (const role of ROLES) harm[role] += harmOf(state, role, decisions[role]);

      const outcomes = checkPacts(pacts, decisions);
      for (const { pact, keptA, keptB } of outcomes) {
        const roleA = PACT_TERMS[pact.a].role;
        const roleB = PACT_TERMS[pact.b].role;
        report.pacts.made++;
        for (const [role, kept, other] of [[roleA, keptA, roleB], [roleB, keptB, roleA]] as const) {
          report.pacts[kept ? 'kept' : 'broken']++;
          report.pacts.byKind[kinds[role]][kept ? 'kept' : 'broken']++;
          trust[other][role] = kept ? Math.min(1, trust[other][role] + 0.1) : trust[other][role] - 0.4;
        }
      }
      state = resolveYear(state, decisions);
    }

    if (mix === 'oknum') {
      const identified = isOknumIdentified(state, voteOknum(harm, rng));
      report.oknum.games++;
      if (state.collapses.length) report.oknum.collapsed++;
      if (identified) report.oknum.identified++;
      if (state.collapses.length && !identified) report.oknum.wins++;
    }

    const ending = getEnding(state);
    report.endings[ending]++;
    for (const collapse of state.collapses) report.collapses[collapse]++;
    if (ending === 'kolaps') collapseYears += state.year;
    for (const key of Object.keys(report.finalMeans) as (keyof MixReport['finalMeans'])[]) {
      report.finalMeans[key] += state.stats[key] / games;
    }
    for (const role of ROLES) {
      const agenda = state.agendas[role];
      if (kinds[role] !== 'egois') continue;
      const entry = (report.agendas[agenda] ??= { held: 0, achieved: 0 });
      entry.held++;
      if (getAgenda(agenda).achieved(state)) entry.achieved++;
    }
  }

  report.collapseRate = report.endings.kolaps / games;
  report.meanCollapseYear = report.endings.kolaps ? collapseYears / report.endings.kolaps : null;
  return report;
}

export interface Check {
  name: string;
  value: string;
  target: string;
  pass: boolean;
}

/** Targets from the GDD, section "Balancing, playtest, telemetri". */
export function checkTargets(reports: MixReport[]): Check[] {
  const byMix = Object.fromEntries(reports.map(r => [r.mix, r])) as Record<Mix, MixReport>;
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const checks: Check[] = [];
  const range = (name: string, x: number, lo: number, hi: number) =>
    checks.push({ name, value: pct(x), target: `${pct(lo)}–${pct(hi)}`, pass: x >= lo && x <= hi });

  if (byMix.egois) range('Kolaps, semua Egois', byMix.egois.collapseRate, 0.4, 0.6);
  if (byMix.kooperatif) range('Kolaps, semua Kooperatif', byMix.kooperatif.collapseRate, 0, 0.1);
  if (byMix.campuran) range('Kolaps, campuran', byMix.campuran.collapseRate, 0.2, 0.35);

  if (byMix.egois) {
    for (const [id, { held, achieved }] of Object.entries(byMix.egois.agendas)) {
      if (held >= 30) range(`Agenda ${id} (Egois)`, achieved / held, 0.35, 0.65);
    }
  }

  const cardTotals: Record<string, { available: number; picked: number }> = {};
  for (const report of reports.filter(r => r.mix !== 'acak')) {
    for (const [id, c] of Object.entries(report.cards)) {
      const t = (cardTotals[id] ??= { available: 0, picked: 0 });
      t.available += c.available;
      t.picked += c.picked;
    }
  }
  for (const [id, { available, picked }] of Object.entries(cardTotals)) {
    const rate = picked / Math.max(1, available);
    if (rate > 0.8) checks.push({ name: `Kartu ${id} terlalu dominan`, value: pct(rate), target: '≤ 80% saat tersedia', pass: false });
    if (rate < 0.05) checks.push({ name: `Kartu ${id} tidak pernah dipilih`, value: pct(rate), target: '≥ 5% saat tersedia', pass: false });
  }

  const collapseTypes: Collapse[] = ['bangkrut', 'lengser', 'anarki', 'hiperinflasi'];
  for (const type of collapseTypes) {
    const seen = reports.some(r => r.collapses[type] > 0);
    checks.push({ name: `Ending ${type} pernah muncul`, value: seen ? 'ya' : 'tidak', target: 'ya', pass: seen });
  }
  return checks;
}
