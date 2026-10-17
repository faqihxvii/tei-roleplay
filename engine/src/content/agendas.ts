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
  { id: 'pemilu', role: 'pemerintah', name: 'Tahun Pemilu', description: 'Kepercayaan Publik ≥ 9 di akhir tahun 5.', achieved: s => s.stats.kepercayaan >= 9, progress: s => atLeast(s.stats.kepercayaan, 9) },
  { id: 'mercusuar', role: 'pemerintah', name: 'Proyek Mercusuar', description: 'Mainkan kartu Infrastruktur 2 kali.', achieved: s => s.counters.infrastruktur >= 2, progress: s => 3 * atLeast(s.counters.infrastruktur, 2) },
  { id: 'apbnSehat', role: 'pemerintah', name: 'APBN Sehat', description: 'Kas Negara ≥ 8 di akhir tahun 5.', achieved: s => s.stats.kas >= 8, progress: s => atLeast(s.stats.kas, 8) },

  { id: 'jangkarHarga', role: 'bankSentral', name: 'Jangkar Harga', description: 'Harga tidak pernah mencapai 7 atau lebih.', achieved: s => !s.counters.hargaPernahBahaya, progress: s => (s.counters.hargaPernahBahaya ? -10 : 0) + atMost(s.stats.harga, 5) },
  { id: 'inflasiSasaran', role: 'bankSentral', name: 'Inflasi Sesuai Sasaran', description: 'Harga di antara 3 dan 5 di akhir tahun 5.', achieved: s => s.stats.harga >= 3 && s.stats.harga <= 5, progress: s => -Math.max(0, 3 - s.stats.harga) - Math.max(0, s.stats.harga - 5) },
  { id: 'kredibel', role: 'bankSentral', name: 'Kredibel', description: 'Kredibilitas 5 dan Lapangan Kerja ≥ 7 di akhir tahun 5.', achieved: s => s.stats.kredibilitas >= 5 && s.stats.kerja >= 7, progress: s => atLeast(s.stats.kredibilitas, 5) + atLeast(s.stats.kerja, 7) },

  { id: 'konglomerat', role: 'pengusaha', name: 'Konglomerat', description: 'Modal ≥ 9 di akhir tahun 5.', achieved: s => s.stats.modal >= 9, progress: s => atLeast(s.stats.modal, 9) },
  { id: 'ekspansi', role: 'pengusaha', name: 'Ekspansi', description: 'Mainkan Investasi 2 kali.', achieved: s => s.counters.investasi >= 2, progress: s => 3 * atLeast(s.counters.investasi, 2) },
  { id: 'rajaLobi', role: 'pengusaha', name: 'Raja Lobi', description: 'Minimal 1 Lobi berhasil dan tidak pernah terbongkar.', achieved: s => s.counters.lobiAman >= 1, progress: s => 3 * atLeast(s.counters.lobiAman, 1) },

  { id: 'upahLayak', role: 'buruh', name: 'Upah Layak', description: 'Upah naik di 3 tahun dan Lapangan Kerja ≥ 6 di akhir.', achieved: s => s.counters.upahNaikTahun >= 3 && s.stats.kerja >= 6, progress: s => 2 * atLeast(s.counters.upahNaikTahun, 3) + atLeast(s.stats.kerja, 6) },
  { id: 'barisanSolid', role: 'buruh', name: 'Barisan Solid', description: 'Solidaritas 5 dan Lapangan Kerja ≥ 6 di akhir tahun 5.', achieved: s => s.stats.solidaritas >= 5 && s.stats.kerja >= 6, progress: s => atLeast(s.stats.solidaritas, 5) + atLeast(s.stats.kerja, 6) },
  { id: 'kerjaAman', role: 'buruh', name: 'Kerja Aman', description: 'Lapangan Kerja tidak pernah turun ke 5 atau lebih rendah.', achieved: s => !s.counters.kerjaPernahRendah, progress: s => (s.counters.kerjaPernahRendah ? -10 : 0) + atLeast(s.stats.kerja, 6) },

  { id: 'dapurNgebul', role: 'masyarakat', name: 'Dapur Ngebul', description: 'Harga ≤ 4 di akhir tahun 5.', achieved: s => s.stats.harga <= 4, progress: s => atMost(s.stats.harga, 4) },
  { id: 'kerjaSemua', role: 'masyarakat', name: 'Kerja untuk Semua', description: 'Lapangan Kerja ≥ 7 dan Harga ≤ 7 di akhir tahun 5.', achieved: s => s.stats.kerja >= 7 && s.stats.harga <= 7, progress: s => atLeast(s.stats.kerja, 7) + atMost(s.stats.harga, 7) },
  { id: 'pengawas', role: 'masyarakat', name: 'Pengawas', description: 'Mainkan Investigasi Warga 2 kali, atau bongkar 1 Lobi.', achieved: s => s.counters.investigasi >= 2 || s.counters.lobiDibongkarWarga >= 1, progress: s => 10 * Math.min(s.counters.lobiDibongkarWarga, 1) + 3 * Math.min(s.counters.investigasi, 2) },

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
