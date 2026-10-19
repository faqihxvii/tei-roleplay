import { getCard, responseCardId, responseSlotOf, type ResponseSlot } from './content/policies';
import { ROLE_LABEL } from './content/roles';
import { ROLES, type Decision, type GameMode, type Role, type Tag, type YearDecisions } from './types';

// Pacts are made in the Lobi phase and are not binding: the engine only checks, after the
// reveal, whether each side did what it promised (GDD, "Skor akhir": +1 kept, -1 broken).

/** Mode Pemula: "this team picks its response A, B or C" for this year's crisis. */
export type SlotTermId = `pilih${'Pem' | 'Bsn' | 'Ush' | 'Brh' | 'Msy'}${ResponseSlot}`;

export type PactTermId =
  | SlotTermId
  | 'usahaTidakPhk' | 'usahaTahanHarga' | 'usahaTidakLobi' | 'usahaInvestasi'
  | 'buruhTidakMogok' | 'buruhUpahModerat'
  | 'pemTidakCetakUang' | 'pemPajakTidakNaik' | 'pemBelanjaSosial'
  | 'bsBungaTidakNaik' | 'bsTidakTolakCetakUang'
  | 'wargaTidakHemat' | 'wargaTidakViral' | 'wargaTidakInvestigasi';

export interface PactTerm {
  id: PactTermId;
  role: Role;
  text: string;
  holds: (decision: Decision) => boolean;
  /** Which mode offers the term: slot terms in Pemula, lever and card terms in Lanjutan. */
  mode: GameMode;
  /** Slot terms only: which of the team's three responses. */
  slot?: ResponseSlot;
}

const playsTag = (decision: Decision, tag: Tag) => decision.cardId !== null && getCard(decision.cardId).tags.includes(tag);

const LANJUTAN_TERMS: Record<Exclude<PactTermId, SlotTermId>, Omit<PactTerm, 'mode'>> = {
  usahaTidakPhk: { id: 'usahaTidakPhk', role: 'pengusaha', text: 'Pengusaha tidak memainkan kartu PHK', holds: d => !playsTag(d, 'phk') },
  usahaTahanHarga: { id: 'usahaTahanHarga', role: 'pengusaha', text: 'Pengusaha menahan harga', holds: d => d.role === 'pengusaha' && !d.hargaNaik },
  usahaTidakLobi: { id: 'usahaTidakLobi', role: 'pengusaha', text: 'Pengusaha tidak memainkan kartu Lobi', holds: d => !playsTag(d, 'lobi') },
  usahaInvestasi: { id: 'usahaInvestasi', role: 'pengusaha', text: 'Pengusaha memainkan kartu Investasi', holds: d => playsTag(d, 'investasi') },
  buruhTidakMogok: { id: 'buruhTidakMogok', role: 'buruh', text: 'Serikat Buruh tidak mogok', holds: d => d.role === 'buruh' && !d.mogok },
  buruhUpahModerat: { id: 'buruhUpahModerat', role: 'buruh', text: 'Serikat Buruh tidak menuntut upah tinggi', holds: d => d.role === 'buruh' && d.upah <= 1 },
  pemTidakCetakUang: { id: 'pemTidakCetakUang', role: 'pemerintah', text: 'Pemerintah tidak memainkan kartu Cetak Uang', holds: d => !playsTag(d, 'cetakUang') },
  pemPajakTidakNaik: { id: 'pemPajakTidakNaik', role: 'pemerintah', text: 'Pemerintah tidak menaikkan pajak', holds: d => d.role === 'pemerintah' && d.pajak <= 0 },
  pemBelanjaSosial: { id: 'pemBelanjaSosial', role: 'pemerintah', text: 'Pemerintah memainkan kartu Bansos atau Subsidi', holds: d => playsTag(d, 'bansos') || playsTag(d, 'subsidi') },
  bsBungaTidakNaik: { id: 'bsBungaTidakNaik', role: 'bankSentral', text: 'Bank Sentral tidak menaikkan bunga', holds: d => d.role === 'bankSentral' && d.bunga <= 0 },
  bsTidakTolakCetakUang: { id: 'bsTidakTolakCetakUang', role: 'bankSentral', text: 'Bank Sentral tidak menolak Cetak Uang', holds: d => d.role === 'bankSentral' && !d.tolakCetakUang },
  wargaTidakHemat: { id: 'wargaTidakHemat', role: 'masyarakat', text: 'Masyarakat tidak berhemat', holds: d => d.role === 'masyarakat' && d.konsumsi !== 'hemat' },
  wargaTidakViral: { id: 'wargaTidakViral', role: 'masyarakat', text: 'Masyarakat tidak memviralkan tim mana pun', holds: d => d.role === 'masyarakat' && d.viral === null },
  wargaTidakInvestigasi: { id: 'wargaTidakInvestigasi', role: 'masyarakat', text: 'Masyarakat tidak memainkan Investigasi Warga', holds: d => !playsTag(d, 'investigasi') },
};

const CODE: Record<Role, string> = { pemerintah: 'Pem', bankSentral: 'Bsn', pengusaha: 'Ush', buruh: 'Brh', masyarakat: 'Msy' };
const SLOT_TERMS = Object.fromEntries(ROLES.flatMap(role => (['A', 'B', 'C'] as const).map(slot => {
  const id = `pilih${CODE[role]}${slot}` as SlotTermId;
  const term: PactTerm = { id, role, slot, mode: 'pemula', text: `${ROLE_LABEL[role]} memilih respons ${slot}`, holds: d => d.cardId !== null && responseSlotOf(d.cardId)?.slot === slot };
  return [id, term];
}))) as Record<SlotTermId, PactTerm>;

export const PACT_TERMS: Record<PactTermId, PactTerm> = {
  ...SLOT_TERMS,
  ...Object.fromEntries(Object.entries(LANJUTAN_TERMS).map(([id, term]) => [id, { ...term, mode: 'lanjutan' as const }])) as Record<Exclude<PactTermId, SlotTermId>, PactTerm>,
};

/** A term as players read it; a Pemula term names the response it stands for in that year's crisis. */
export function pactTermText(id: PactTermId, crisisId: string | null): string {
  const term = PACT_TERMS[id];
  if (!term.slot || !crisisId) return term.text;
  try {
    return `${ROLE_LABEL[term.role]} memilih "${getCard(responseCardId(crisisId, term.role, term.slot)).name}"`;
  } catch {
    return term.text;
  }
}

/** A two-sided promise. */
export interface Pact {
  a: PactTermId;
  b: PactTermId;
}

/** The deals that arise naturally from the role tensions in the GDD ("Interaksi wajib antar peran"). */
export const PACT_TEMPLATES: Pact[] = [
  { a: 'usahaTidakPhk', b: 'buruhTidakMogok' },
  { a: 'usahaTahanHarga', b: 'buruhUpahModerat' },
  { a: 'pemTidakCetakUang', b: 'bsBungaTidakNaik' },
  { a: 'pemPajakTidakNaik', b: 'wargaTidakHemat' },
  { a: 'usahaTahanHarga', b: 'wargaTidakHemat' },
];

/**
 * Deals offered as one tap in the Negosiasi screen: the templates above plus one obvious trade for
 * every other pair of roles, so no team opens the screen to an empty list. Not used by the bots.
 */
export const SUGGESTED_DEALS: Pact[] = [
  ...PACT_TEMPLATES,
  { a: 'pemPajakTidakNaik', b: 'usahaTidakPhk' },
  { a: 'pemBelanjaSosial', b: 'buruhTidakMogok' },
  { a: 'pemBelanjaSosial', b: 'wargaTidakViral' },
  { a: 'bsBungaTidakNaik', b: 'usahaInvestasi' },
  { a: 'bsBungaTidakNaik', b: 'buruhUpahModerat' },
  { a: 'bsBungaTidakNaik', b: 'wargaTidakHemat' },
  { a: 'usahaTidakLobi', b: 'wargaTidakInvestigasi' },
  { a: 'buruhUpahModerat', b: 'wargaTidakHemat' },
];

export function termsForRole(role: Role, mode: GameMode = 'lanjutan'): PactTerm[] {
  return Object.values(PACT_TERMS).filter(term => term.role === role && term.mode === mode);
}

export function termKept(term: PactTermId, decisions: YearDecisions): boolean {
  const t = PACT_TERMS[term];
  return t.holds(decisions[t.role]);
}

export interface PactOutcome {
  pact: Pact;
  keptA: boolean;
  keptB: boolean;
}

export function checkPacts(pacts: Pact[], decisions: YearDecisions): PactOutcome[] {
  return pacts.map(pact => ({ pact, keptA: termKept(pact.a, decisions), keptB: termKept(pact.b, decisions) }));
}

export type PactTally = Record<Role, { kept: number; broken: number }>;

export function tallyPacts(outcomes: PactOutcome[], into: PactTally): PactTally {
  for (const { pact, keptA, keptB } of outcomes) {
    into[PACT_TERMS[pact.a].role][keptA ? 'kept' : 'broken']++;
    into[PACT_TERMS[pact.b].role][keptB ? 'kept' : 'broken']++;
  }
  return into;
}

export function emptyTally(): PactTally {
  return {
    pemerintah: { kept: 0, broken: 0 }, bankSentral: { kept: 0, broken: 0 }, pengusaha: { kept: 0, broken: 0 },
    buruh: { kept: 0, broken: 0 }, masyarakat: { kept: 0, broken: 0 },
  };
}
