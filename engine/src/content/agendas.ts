import type { AgendaId, GameState, Role } from '../types';

export interface Agenda {
  id: AgendaId;
  role: Role | null;
  name: string;
  description: string;
  /** Checked when the game ends. */
  achieved: (state: GameState) => boolean;
  /** Higher is closer to achieving it; used by bots to rank options. */
  progress: (state: GameState) => number;
}

// Rewards distance to a "≥ target" threshold, capped once reached.
const atLeast = (value: number, target: number) => Math.min(value, target) - target;
const atMost = (value: number, target: number) => target - Math.max(value, target);

export const AGENDAS: Agenda[] = [
  { id: 'pemilu', role: 'pemerintah', name: 'Tahun Pemilu', description: 'Kepercayaan Publik ≥ 7 di akhir tahun 5.', achieved: s => s.stats.kepercayaan >= 7, progress: s => atLeast(s.stats.kepercayaan, 7) },
  { id: 'mercusuar', role: 'pemerintah', name: 'Proyek Mercusuar', description: 'Mainkan kartu Infrastruktur 3 kali.', achieved: s => s.counters.infrastruktur >= 3, progress: s => 3 * atLeast(s.counters.infrastruktur, 3) },
  { id: 'apbnSehat', role: 'pemerintah', name: 'APBN Sehat', description: 'Kas Negara ≥ 7 di akhir tahun 5.', achieved: s => s.stats.kas >= 7, progress: s => atLeast(s.stats.kas, 7) },

  { id: 'jangkarHarga', role: 'bankSentral', name: 'Jangkar Harga', description: 'Harga tidak pernah mencapai 7 atau lebih.', achieved: s => !s.counters.hargaPernahBahaya, progress: s => (s.counters.hargaPernahBahaya ? -10 : 0) + atMost(s.stats.harga, 5) },
  { id: 'tanpaCetakUang', role: 'bankSentral', name: 'Tanpa Cetak Uang', description: 'Tidak pernah ada Cetak Uang yang lolos.', achieved: s => s.counters.cetakUangLolos === 0, progress: s => -10 * s.counters.cetakUangLolos },
  { id: 'kredibel', role: 'bankSentral', name: 'Kredibel', description: 'Kredibilitas ≥ 4 di akhir tahun 5.', achieved: s => s.stats.kredibilitas >= 4, progress: s => atLeast(s.stats.kredibilitas, 4) },

  { id: 'konglomerat', role: 'pengusaha', name: 'Konglomerat', description: 'Modal ≥ 12 di akhir tahun 5.', achieved: s => s.stats.modal >= 12, progress: s => atLeast(s.stats.modal, 12) },
  { id: 'ekspansi', role: 'pengusaha', name: 'Ekspansi', description: 'Mainkan Investasi 3 kali.', achieved: s => s.counters.investasi >= 3, progress: s => 3 * atLeast(s.counters.investasi, 3) },
  { id: 'rajaLobi', role: 'pengusaha', name: 'Raja Lobi', description: '2 Lobi berhasil tanpa terbongkar.', achieved: s => s.counters.lobiAman >= 2, progress: s => 3 * atLeast(s.counters.lobiAman, 2) },

  { id: 'upahLayak', role: 'buruh', name: 'Upah Layak', description: 'Upah naik di 3 tahun dan Lapangan Kerja ≥ 5 di akhir.', achieved: s => s.counters.upahNaikTahun >= 3 && s.stats.kerja >= 5, progress: s => 2 * atLeast(s.counters.upahNaikTahun, 3) + atLeast(s.stats.kerja, 5) },
  { id: 'barisanSolid', role: 'buruh', name: 'Barisan Solid', description: 'Solidaritas ≥ 4 di akhir tahun 5.', achieved: s => s.stats.solidaritas >= 4, progress: s => atLeast(s.stats.solidaritas, 4) },
  { id: 'nolPhk', role: 'buruh', name: 'Nol PHK', description: 'Pengusaha tidak pernah memainkan PHK.', achieved: s => s.counters.phk === 0, progress: s => -10 * s.counters.phk },

  { id: 'dapurNgebul', role: 'masyarakat', name: 'Dapur Ngebul', description: 'Harga ≤ 5 di akhir tahun 5.', achieved: s => s.stats.harga <= 5, progress: s => atMost(s.stats.harga, 5) },
  { id: 'kerjaSemua', role: 'masyarakat', name: 'Kerja untuk Semua', description: 'Lapangan Kerja ≥ 7 di akhir tahun 5.', achieved: s => s.stats.kerja >= 7, progress: s => atLeast(s.stats.kerja, 7) },
  { id: 'pengawas', role: 'masyarakat', name: 'Pengawas', description: 'Membongkar minimal 1 Lobi.', achieved: s => s.counters.lobiDibongkarWarga >= 1, progress: s => 10 * Math.min(s.counters.lobiDibongkarWarga, 1) + Math.min(s.counters.investigasi, 3) },

  { id: 'oknum', role: null, name: 'Oknum', description: 'Negara kolaps sebelum permainan berakhir, tanpa ketahuan.', achieved: s => s.collapses.length > 0, progress: () => 0 },
];

export const AGENDAS_BY_ID: ReadonlyMap<AgendaId, Agenda> = new Map(AGENDAS.map(agenda => [agenda.id, agenda]));

export function agendasForRole(role: Role): Agenda[] {
  return AGENDAS.filter(agenda => agenda.role === role);
}

export function getAgenda(id: AgendaId): Agenda {
  const agenda = AGENDAS_BY_ID.get(id);
  if (!agenda) throw new Error(`Unknown agenda: ${id}`);
  return agenda;
}
