import type { CrisisCategory, Effects, Role, Stat, Tag } from '../src/types';

export const ROLE_LABEL: Record<Role, string> = {
  pemerintah: 'Pemerintah',
  bankSentral: 'Bank Sentral',
  pengusaha: 'Pengusaha',
  buruh: 'Serikat Buruh',
  masyarakat: 'Masyarakat',
};

/** Card code prefix, also printed as a letter mark so roles never depend on colour alone. */
export const ROLE_CODE: Record<Role, string> = {
  pemerintah: 'PEM',
  bankSentral: 'BS',
  pengusaha: 'USH',
  buruh: 'BRH',
  masyarakat: 'MSY',
};

export const ROLE_COLOR: Record<Role, string> = {
  pemerintah: '#1f2937',
  bankSentral: '#1e3a8a',
  pengusaha: '#8a4b0f',
  buruh: '#c91212',
  masyarakat: '#166534',
};

export const STAT_LABEL: Record<Stat, string> = {
  harga: 'Harga',
  kerja: 'Lapangan Kerja',
  kas: 'Kas Negara',
  kepercayaan: 'Kepercayaan',
  keresahan: 'Keresahan',
  modal: 'Modal Pengusaha',
  solidaritas: 'Solidaritas Buruh',
  kredibilitas: 'Kredibilitas BS',
  tabungan: 'Tabungan Warga',
};

export const STAT_ORDER: Stat[] = ['harga', 'kerja', 'kas', 'kepercayaan', 'keresahan', 'modal', 'solidaritas', 'kredibilitas', 'tabungan'];

export const TAG_LABEL: Partial<Record<Tag, string>> = {
  belanja: 'Belanja negara',
  bansos: 'Bansos',
  subsidi: 'Subsidi',
  infrastruktur: 'Infrastruktur',
  cetakUang: 'Cetak Uang',
  investasi: 'Investasi',
  phk: 'PHK',
  lobi: 'Lobi',
  investigasi: 'Investigasi',
  dialog: 'Dialog',
  edukasi: 'Edukasi keuangan',
  rupiah: 'Rupiah',
  ekspor: 'Ekspor',
};

export const CATEGORY_LABEL: Record<CrisisCategory, string> = {
  pangan: 'Pangan',
  energi: 'Energi',
  keuangan: 'Keuangan',
  ketenagakerjaan: 'Ketenagakerjaan',
  digital: 'Digital',
  global: 'Global',
};

/** Player-facing magnitude: direction and size, never the exact number (GDD, "Ketidakpastian terukur"). */
export function arrows(amount: number): string {
  const n = Math.min(3, Math.abs(amount));
  return (amount > 0 ? '▲' : '▼').repeat(n);
}

export function signed(amount: number): string {
  return amount > 0 ? `+${amount}` : `−${Math.abs(amount)}`;
}

export function effectEntries(effects: Effects): [Stat, number][] {
  return STAT_ORDER.filter(stat => effects[stat]).map(stat => [stat, effects[stat]!]);
}

export function exactEffects(effects: Effects): string {
  const entries = effectEntries(effects);
  return entries.length ? entries.map(([stat, n]) => `${STAT_LABEL[stat]} ${signed(n)}`).join(', ') : '—';
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
