export const ROLES = ['pemerintah', 'bankSentral', 'pengusaha', 'buruh', 'masyarakat'] as const;
export type Role = typeof ROLES[number];

/** Public indicators, all on a 0–10 scale. */
export const INDICATORS = ['harga', 'kerja', 'kas', 'kepercayaan', 'keresahan'] as const;
export type Indicator = typeof INDICATORS[number];

/** Private resources, each visible only to the team that owns it. */
export const PRIVATE_RESOURCES = ['modal', 'solidaritas', 'kredibilitas', 'tabungan'] as const;
export type PrivateResource = typeof PRIVATE_RESOURCES[number];

export type Stat = Indicator | PrivateResource;
export type Stats = Record<Stat, number>;
export type Effects = Partial<Record<Stat, number>>;

export type Tag =
  | 'belanja' | 'bansos' | 'subsidi' | 'infrastruktur' | 'cetakUang'
  | 'investasi' | 'phk' | 'lobi' | 'investigasi' | 'dialog' | 'edukasi'
  | 'rupiah' | 'ekspor';

export interface DelayedEffect {
  inYears: 1 | 2;
  effects: Effects;
}

export interface PolicyCard {
  id: string;
  role: Role;
  name: string;
  description: string;
  effects: Effects;
  delayed?: DelayedEffect[];
  /** Minimum resource levels needed to play the card. */
  requires?: Effects;
  tags: Tag[];
}

export type Lever = 'pajak' | 'bunga' | 'harga' | 'upah' | 'konsumsi';

export type CrisisModifier =
  | { kind: 'scaleTag'; tag: Tag; factor: number }
  | { kind: 'endOfYear'; effects: Effects }
  | { kind: 'freezeLever'; lever: Lever };

export type CrisisCategory = 'pangan' | 'energi' | 'keuangan' | 'ketenagakerjaan' | 'digital' | 'global';

export interface CrisisCard {
  id: string;
  category: CrisisCategory;
  title: string;
  effects: Effects;
  modifier: CrisisModifier;
  ruleText: string;
}

export type Step = -1 | 0 | 1;
export type Konsumsi = 'hemat' | 'biasa' | 'belanja';
export type Upah = 0 | 1 | 2;

export type Decision =
  | { role: 'pemerintah'; cardId: string | null; pajak: Step }
  | { role: 'bankSentral'; cardId: string | null; bunga: Step; tolakCetakUang: boolean }
  | { role: 'pengusaha'; cardId: string | null; hargaNaik: boolean }
  | { role: 'buruh'; cardId: string | null; upah: Upah; mogok: boolean }
  | { role: 'masyarakat'; cardId: string | null; konsumsi: Konsumsi; viral: Role | null };

export type DecisionFor<R extends Role> = Extract<Decision, { role: R }>;
export type YearDecisions = { [R in Role]: DecisionFor<R> };

export type AgendaId =
  | 'pemilu' | 'mercusuar' | 'apbnSehat'
  | 'jangkarHarga' | 'tanpaCetakUang' | 'kredibel'
  | 'konglomerat' | 'ekspansi' | 'rajaLobi'
  | 'upahLayak' | 'barisanSolid' | 'nolPhk'
  | 'dapurNgebul' | 'kerjaSemua' | 'pengawas'
  | 'oknum';

export interface Counters {
  infrastruktur: number;
  investasi: number;
  phk: number;
  cetakUangLolos: number;
  lobiDimainkan: number;
  lobiAman: number;
  lobiDibongkarWarga: number;
  investigasi: number;
  upahNaikTahun: number;
  hargaPernahBahaya: boolean;
}

export interface PipelineEntry {
  dueYear: number;
  effects: Effects;
  cause: string;
}

/** One change to one stat, with the reason it happened, for the debrief's causal chain. */
export interface Delta {
  stat: Stat;
  amount: number;
  cause: string;
}

export interface YearLog {
  year: number;
  crisisId: string;
  openingDeltas: Delta[];
  decisions: YearDecisions;
  cancelled: string[];
  deltas: Delta[];
  statsAfter: Stats;
  bungaAfter: number;
  events: string[];
}

export type Collapse = 'bangkrut' | 'lengser' | 'anarki' | 'hiperinflasi';

export interface GameState {
  seed: number;
  rng: number;
  year: number;
  maxYears: number;
  stats: Stats;
  bunga: number;
  crisisId: string;
  /** Crises for the remaining years, in order. */
  crisisDeck: string[];
  /** What this year's crisis did when it was revealed. */
  openingDeltas: Delta[];
  hands: Record<Role, string[]>;
  pipeline: PipelineEntry[];
  /** Set when Kas ended a year at 2 or below: Pemerintah spending cards are halved this year. */
  austerity: boolean;
  counters: Counters;
  agendas: Record<Role, AgendaId>;
  log: YearLog[];
  ended: boolean;
  collapses: Collapse[];
}
