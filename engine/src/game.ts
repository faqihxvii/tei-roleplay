import { agendasForRole } from './content/agendas';
import { CRISIS_CARDS, getCrisis } from './content/crises';
import { cardsForRole, getCard, responseCardsFor } from './content/policies';
import { Rng } from './rng';
import { RULES } from './rules';
import {
  ROLES,
  type AgendaId, type Collapse, type Delta, type Effects, type GameMode, type GameState, type Lever,
  type PolicyCard, type Role, type Stat, type Stats, type YearDecisions,
} from './types';

export const HAND_SIZE = 3;
export const MAX_YEARS = 5;
export const GLOBAL_SHOCK_YEAR = 3;

export { RULES } from './rules';

export const INITIAL_STATS: Stats = {
  harga: 4, kerja: 6, kas: 5, kepercayaan: 5, keresahan: 3,
  modal: 5, solidaritas: 2, kredibilitas: 3, tabungan: 3,
};
export const INITIAL_BUNGA = 3;

const LIMITS: Record<Stat, readonly [number, number]> = {
  harga: [0, 10], kerja: [0, 10], kas: [0, 10], kepercayaan: [0, 10], keresahan: [0, 10],
  modal: [0, 99], solidaritas: [0, 5], kredibilitas: [0, 5], tabungan: [0, 10],
};

export interface CreateGameOptions {
  seed: number;
  /** Mode Oknum: one random team gets the saboteur agenda instead of its own. */
  oknum?: boolean;
  /** Fix agendas instead of drawing them (tests, simulator). */
  agendas?: Partial<Record<Role, AgendaId>>;
  /** Open with this crisis instead of the deck's first card (the Year 0 practice). */
  firstCrisis?: string;
  /** Pemula (one response per team) or Lanjutan (cards, levers and powers); Lanjutan by default. */
  mode?: GameMode;
}

export const isPemula = (state: GameState) => state.mode === 'pemula';

export interface ResolveOptions {
  /**
   * Preview mode resolves the year without randomness and without starting the next one,
   * so bots and the phone UI can ask "what if?" without learning hidden outcomes.
   */
  preview?: boolean;
}

export function createGame(options: CreateGameOptions): GameState {
  const rng = new Rng(options.seed >>> 0);

  const globals = rng.shuffle(CRISIS_CARDS.filter(card => card.category === 'global'));
  const others = rng.shuffle(CRISIS_CARDS.filter(card => card.category !== 'global'));
  const deck = others.slice(0, MAX_YEARS - 1).map(card => card.id);
  deck.splice(GLOBAL_SHOCK_YEAR - 1, 0, globals[0]!.id);

  const agendas = {} as Record<Role, AgendaId>;
  for (const role of ROLES) agendas[role] = options.agendas?.[role] ?? rng.pick(agendasForRole(role, options.mode)).id;
  if (options.oknum) agendas[rng.pick(ROLES)] = 'oknum';

  const state: GameState = {
    mode: options.mode ?? 'lanjutan',
    seed: options.seed,
    rng: rng.state,
    year: 1,
    maxYears: MAX_YEARS,
    stats: { ...INITIAL_STATS },
    bunga: INITIAL_BUNGA,
    crisisId: options.firstCrisis ?? deck[0]!,
    crisisDeck: deck.slice(1),
    openingDeltas: [],
    hands: { pemerintah: [], bankSentral: [], pengusaha: [], buruh: [], masyarakat: [] },
    pipeline: [],
    austerity: false,
    lobiTersembunyi: null,
    counters: {
      infrastruktur: 0, investasi: 0, phk: 0, cetakUangLolos: 0, lobiDimainkan: 0,
      lobiAman: 0, lobiDibongkarWarga: 0, investigasi: 0, upahNaikTahun: 0, hargaPernahBahaya: false, kerjaPernahRendah: false,
    },
    agendas,
    log: [],
    ended: false,
    collapses: [],
  };
  openYear(state, rng);
  return state;
}

/** Reveals the current crisis and deals each team a fresh hand. */
function openYear(state: GameState, rng: Rng): void {
  const crisis = getCrisis(state.crisisId);
  const factor = state.year >= RULES.eskalasiKrisisMulaiTahun ? 2 : 1;
  state.openingDeltas = toDeltas(crisis.effects, `krisis:${crisis.id}`, factor);
  applyDeltas(state.stats, state.openingDeltas);
  for (const role of ROLES) {
    if (isPemula(state)) {
      state.hands[role] = responseCardsFor(crisis.id, role);
      continue;
    }
    const hand = rng.shuffle(cardsForRole(role)).slice(0, HAND_SIZE);
    // The crisis rewards one kind of card; whoever owns such a card always gets it this year, so
    // the answer to the crisis is on the table instead of in the deck.
    if (crisis.modifier.kind === 'scaleTag') {
      const tag = crisis.modifier.tag;
      const answer = cardsForRole(role).find(card => card.tags.includes(tag));
      if (answer && !hand.some(card => card.tags.includes(tag))) hand[hand.length - 1] = answer;
    }
    state.hands[role] = hand.map(card => card.id);
  }
  state.rng = rng.state;
}

export function canPlay(state: GameState, role: Role, cardId: string): boolean {
  if (!state.hands[role].includes(cardId)) return false;
  const card = getCard(cardId);
  return Object.entries(card.requires ?? {}).every(([stat, min]) => state.stats[stat as Stat] >= min);
}

export function playableCards(state: GameState, role: Role): string[] {
  return state.hands[role].filter(id => canPlay(state, role, id));
}

export function canMogok(state: GameState): boolean {
  return !isPemula(state) && state.stats.solidaritas >= 2;
}

export function canBelanja(state: GameState): boolean {
  return state.stats.tabungan >= 1;
}

export function isLeverFrozen(state: GameState, lever: Lever): boolean {
  if (isPemula(state)) return true; // Pemula has no levers: the response is the whole decision
  const modifier = getCrisis(state.crisisId).modifier;
  return modifier.kind === 'freezeLever' && modifier.lever === lever;
}

export function validateDecisions(state: GameState, decisions: YearDecisions): void {
  for (const role of ROLES) {
    const decision = decisions[role];
    if (decision.role !== role) throw new Error(`Decision for ${role} is labelled ${decision.role}`);
    if (decision.cardId !== null && !canPlay(state, role, decision.cardId)) {
      throw new Error(`${role} cannot play ${decision.cardId}`);
    }
  }
  if (decisions.buruh.mogok && !canMogok(state)) throw new Error('Mogok needs Solidaritas >= 2');
  if (decisions.masyarakat.konsumsi === 'belanja' && !canBelanja(state)) throw new Error('Belanja needs Tabungan >= 1');
  if (decisions.masyarakat.viral === 'masyarakat') throw new Error('Masyarakat cannot make itself viral');
  if (isPemula(state) && (decisions.bankSentral.tolakCetakUang || decisions.masyarakat.viral !== null)) {
    throw new Error('Pemula has no powers');
  }
}

/** Resolves one year (GDD, "Aturan resolusi per tahun") and returns the new state. */
export function resolveYear(state: GameState, decisions: YearDecisions, options: ResolveOptions = {}): GameState {
  if (state.ended) throw new Error('Game has ended');
  validateDecisions(state, decisions);

  const preview = options.preview ?? false;
  const s = cloneState(state);
  const rng = new Rng(s.rng);
  const crisis = getCrisis(s.crisisId);
  const modifier = crisis.modifier;
  const deltas: Delta[] = [];
  const events: string[] = [];
  const cancelled: string[] = [];
  const add = (effects: Effects, cause: string, factor = 1) => deltas.push(...toDeltas(effects, cause, factor));
  const pemerintahCard = cardOrNull(decisions.pemerintah.cardId);
  const masyarakatCard = cardOrNull(decisions.masyarakat.cardId);

  // 1. Cancellations.
  const cancelledCards = new Set<string>();
  if (pemerintahCard?.tags.includes('cetakUang') && decisions.bankSentral.tolakCetakUang) {
    cancelledCards.add(pemerintahCard.id);
    add({ kredibilitas: 1 }, 'kekuatan:tolakCetakUang');
    events.push('Bank Sentral menolak Cetak Uang');
  }
  if (decisions.buruh.mogok) {
    add({ solidaritas: -2, kas: -1, keresahan: 1, modal: -2 }, 'kekuatan:mogok');
    events.push('Serikat Buruh mogok');
    if (decisions.pengusaha.cardId) cancelledCards.add(decisions.pengusaha.cardId);
  }
  cancelled.push(...cancelledCards);

  // 2. Card effects, all at once.
  const investigated = masyarakatCard?.tags.includes('investigasi') ?? false;
  if (investigated && s.lobiTersembunyi === s.year - 1) {
    add({ modal: -3, kepercayaan: -2, keresahan: 1 }, 'lobi:terbongkarSusulan');
    s.counters.lobiAman--;
    s.counters.lobiDibongkarWarga++;
    events.push('Investigasi warga membongkar Lobi tahun lalu');
  }
  s.lobiTersembunyi = null;
  for (const role of ROLES) {
    const card = cardOrNull(decisions[role].cardId);
    if (!card || cancelledCards.has(card.id)) continue;

    let factor = 1;
    if (modifier.kind === 'scaleTag' && card.tags.includes(modifier.tag)) factor *= modifier.factor;
    if (s.austerity && card.tags.includes('belanja')) factor *= 0.5;

    const effects = { ...card.effects };
    if (decisions.masyarakat.viral === role && effects.kepercayaan) effects.kepercayaan *= 2;
    const cause = `kartu:${card.id}`;
    add(effects, cause, factor);
    for (const delayed of card.delayed ?? []) {
      s.pipeline.push({ dueYear: s.year + delayed.inYears, effects: scaleEffects(delayed.effects, factor), cause });
    }

    if (card.tags.includes('infrastruktur')) s.counters.infrastruktur++;
    if (card.tags.includes('investasi')) s.counters.investasi++;
    if (card.tags.includes('phk')) s.counters.phk++;
    if (card.tags.includes('cetakUang')) s.counters.cetakUangLolos++;
    if (card.tags.includes('investigasi')) s.counters.investigasi++;
    if (card.tags.includes('lobi')) {
      s.counters.lobiDimainkan++;
      const exposedByMedia = !preview && rng.next() < RULES.lobiMediaChance;
      if (investigated || exposedByMedia) {
        add({ modal: -2, kepercayaan: -2, keresahan: 1 }, 'lobi:terbongkar');
        if (investigated) s.counters.lobiDibongkarWarga++;
        events.push(investigated ? 'Lobi dibongkar warga' : 'Lobi dibongkar media');
      } else {
        add({ modal: 3, kas: -2 }, 'lobi:berhasil');
        s.counters.lobiAman++;
        s.lobiTersembunyi = s.year;
      }
    }
  }

  // 3. Levers.
  const { pajak } = decisions.pemerintah;
  if (!isLeverFrozen(s, 'pajak')) {
    if (pajak === 1) add({ kas: 2, kepercayaan: -1, modal: -1 }, 'tuas:pajakNaik');
    if (pajak === -1) add({ kas: -2, kepercayaan: 1, modal: 1 }, 'tuas:pajakTurun');
  }

  if (!isLeverFrozen(s, 'bunga')) {
    const level = clamp(s.bunga + decisions.bankSentral.bunga, 1, 5);
    if (level > s.bunga) {
      add({ kredibilitas: 1 }, 'tuas:bungaNaik');
      s.pipeline.push({ dueYear: s.year + 1, effects: { harga: -1, kerja: -1 }, cause: 'tuas:bungaNaik' });
    } else if (level < s.bunga) {
      s.pipeline.push({ dueYear: s.year + 1, effects: { kerja: 1, harga: 1 }, cause: 'tuas:bungaTurun' });
    }
    s.bunga = level;
  }

  const hargaNaik = decisions.pengusaha.hargaNaik && !isLeverFrozen(s, 'harga');
  if (hargaNaik) add({ modal: 2, harga: 1, kepercayaan: -1 }, 'tuas:hargaNaik');

  const upah = isLeverFrozen(s, 'upah') ? 0 : decisions.buruh.upah;
  if (isPemula(s)) {
    // No wage lever: a response tagged as a wage demand counts as a raise year for the agendas.
    if (cardOrNull(decisions.buruh.cardId)?.tags.includes('upah')) s.counters.upahNaikTahun++;
  } else if (upah === 0) {
    add({ solidaritas: -1 }, 'tuas:upahTetap');
  } else {
    s.counters.upahNaikTahun++;
    // Pengusaha either absorbs the raise or passes it on to prices.
    add(hargaNaik ? { kepercayaan: upah, harga: upah } : { kepercayaan: upah, modal: -upah }, 'tuas:upahNaik');
    if (upah === 2) add({ kerja: -1, solidaritas: 1 }, 'tuas:upahTinggi');
  }

  const konsumsi = isLeverFrozen(s, 'konsumsi') ? 'biasa' : decisions.masyarakat.konsumsi;
  if (konsumsi === 'belanja') add({ kerja: 1, harga: 1, tabungan: -1 }, 'tuas:konsumsiBelanja');
  if (konsumsi === 'hemat') add({ harga: -1, kerja: -1, tabungan: 1 }, 'tuas:konsumsiHemat');

  // 4. Delayed effects that fall due this year.
  for (const entry of s.pipeline.filter(e => e.dueYear === s.year)) add(entry.effects, `jalur:${entry.cause}`);
  s.pipeline = s.pipeline.filter(e => e.dueYear > s.year);
  applyDeltas(s.stats, deltas);

  // 5. System rules, read from the state after steps 1-4.
  const systemDeltas: Delta[] = [];
  if (modifier.kind === 'endOfYear') systemDeltas.push(...toDeltas(modifier.effects, `krisis:${crisis.id}`));
  // Pemula has no tax lever to pay the fixed yearly cost, so it starts with the escalation in year 3.
  if (RULES.bebanRutinKas && (!isPemula(s) || s.year >= RULES.eskalasiKrisisMulaiTahun)) systemDeltas.push({ stat: 'kas', amount: -RULES.bebanRutinKas, cause: 'sistem:bebanRutin' });
  const st = s.stats;
  if (s.bunga < RULES.inflasiBawaanDiBawahBunga) systemDeltas.push({ stat: 'harga', amount: 1, cause: 'sistem:inflasiBawaan' });
  const laba = Math.floor(st.kerja / RULES.labaUsahaPembagi);
  if (laba) systemDeltas.push({ stat: 'modal', amount: laba, cause: 'sistem:labaUsaha' });
  if (st.kerja >= RULES.gajiMinKerja) systemDeltas.push({ stat: 'tabungan', amount: 1, cause: 'sistem:gaji' });
  const z = RULES.zonaResah;
  if (st.harga >= z.harga) systemDeltas.push({ stat: 'keresahan', amount: 1, cause: 'sistem:hargaTinggi' });
  if (st.kerja <= z.kerja) systemDeltas.push({ stat: 'keresahan', amount: 1, cause: 'sistem:pengangguran' });
  if (st.kepercayaan <= z.kepercayaan) systemDeltas.push({ stat: 'keresahan', amount: 1, cause: 'sistem:tidakPercaya' });
  if (RULES.keresahanTurunSaatAman && st.harga < z.harga && st.kerja > z.kerja && st.kepercayaan > z.kepercayaan) systemDeltas.push({ stat: 'keresahan', amount: -1, cause: 'sistem:aman' });
  if (st.harga >= 8) systemDeltas.push({ stat: 'tabungan', amount: -1, cause: 'sistem:inflasiTabungan' });
  applyDeltas(s.stats, systemDeltas);
  deltas.push(...systemDeltas);

  // 6. Year-end bookkeeping and the single collapse check.
  s.austerity = s.stats.kas <= 2;
  if (s.stats.harga >= 7) s.counters.hargaPernahBahaya = true;
  if (s.stats.kerja <= 5) s.counters.kerjaPernahRendah = true;
  s.collapses = checkCollapses(s.stats);
  s.rng = rng.state;

  if (!preview) {
    s.log.push({
      year: s.year,
      crisisId: s.crisisId,
      openingDeltas: s.openingDeltas,
      decisions,
      cancelled,
      deltas,
      statsAfter: { ...s.stats },
      bungaAfter: s.bunga,
      events,
    });
  }

  if (s.collapses.length > 0 || s.year >= s.maxYears) {
    s.ended = true;
  } else if (!preview) {
    s.year++;
    s.crisisId = s.crisisDeck.shift()!;
    openYear(s, rng);
  }
  return s;
}

export function checkCollapses(stats: Stats): Collapse[] {
  const collapses: Collapse[] = [];
  if (stats.kas <= 0) collapses.push('bangkrut');
  if (stats.kepercayaan <= 0) collapses.push('lengser');
  if (stats.keresahan >= 10) collapses.push('anarki');
  if (stats.harga >= 10) collapses.push('hiperinflasi');
  return collapses;
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    stats: { ...state.stats },
    crisisDeck: [...state.crisisDeck],
    hands: {
      pemerintah: [...state.hands.pemerintah],
      bankSentral: [...state.hands.bankSentral],
      pengusaha: [...state.hands.pengusaha],
      buruh: [...state.hands.buruh],
      masyarakat: [...state.hands.masyarakat],
    },
    pipeline: [...state.pipeline],
    counters: { ...state.counters },
    agendas: { ...state.agendas },
    log: [...state.log],
    collapses: [...state.collapses],
  };
}

function cardOrNull(id: string | null): PolicyCard | null {
  return id === null ? null : getCard(id);
}

// Scaling rounds toward zero, so a halved -1 cost becomes 0 rather than -1.
function scaleEffects(effects: Effects, factor: number): Effects {
  if (factor === 1) return effects;
  const result: Effects = {};
  for (const [stat, amount] of Object.entries(effects)) result[stat as Stat] = Math.trunc(amount * factor);
  return result;
}

function toDeltas(effects: Effects, cause: string, factor = 1): Delta[] {
  const deltas: Delta[] = [];
  for (const [stat, amount] of Object.entries(scaleEffects(effects, factor))) {
    if (amount) deltas.push({ stat: stat as Stat, amount, cause });
  }
  return deltas;
}

function applyDeltas(stats: Stats, deltas: Delta[]): void {
  for (const delta of deltas) stats[delta.stat] += delta.amount;
  for (const stat of Object.keys(LIMITS) as Stat[]) {
    const [min, max] = LIMITS[stat];
    stats[stat] = clamp(stats[stat], min, max);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

