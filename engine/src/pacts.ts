import { getCard } from './content/policies';
import type { Decision, Role, Tag, YearDecisions } from './types';

// Pacts are made in the Lobi phase and are not binding: the engine only checks, after the
// reveal, whether each side did what it promised (GDD, "Skor akhir": +1 kept, -1 broken).

export type PactTermId =
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
}

const playsTag = (decision: Decision, tag: Tag) => decision.cardId !== null && getCard(decision.cardId).tags.includes(tag);

export const PACT_TERMS: Record<PactTermId, PactTerm> = {
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

export function termsForRole(role: Role): PactTerm[] {
  return Object.values(PACT_TERMS).filter(term => term.role === role);
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
