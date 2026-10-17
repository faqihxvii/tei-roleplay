import type { Indicator } from '../../engine/src/types';
import type { RoomPhase, YearStep } from '../../room/src/room';

export const INDICATOR_LABEL: Record<Indicator, string> = {
  harga: 'Harga',
  kerja: 'Lapangan Kerja',
  kas: 'Kas Negara',
  kepercayaan: 'Kepercayaan',
  keresahan: 'Keresahan',
};

export const INDICATOR_ORDER: Indicator[] = ['harga', 'kerja', 'kas', 'kepercayaan', 'keresahan'];

/** Danger zones and collapse points (GDD, "Indikator publik"). Higher is worse for Harga and Keresahan. */
export const ZONES: Record<Indicator, { worseWhen: 'tinggi' | 'rendah'; danger: number; collapse: number | null }> = {
  harga: { worseWhen: 'tinggi', danger: 6, collapse: 10 },
  kerja: { worseWhen: 'rendah', danger: 4, collapse: null },
  kas: { worseWhen: 'rendah', danger: 2, collapse: 0 },
  kepercayaan: { worseWhen: 'rendah', danger: 4, collapse: 0 },
  keresahan: { worseWhen: 'tinggi', danger: 7, collapse: 10 },
};

export function zoneOf(stat: Indicator, value: number): 'aman' | 'bahaya' | 'kolaps' {
  const z = ZONES[stat];
  if (z.collapse !== null && (z.worseWhen === 'tinggi' ? value >= z.collapse : value <= z.collapse)) return 'kolaps';
  return (z.worseWhen === 'tinggi' ? value >= z.danger : value <= z.danger) ? 'bahaya' : 'aman';
}

export const STEP_LABEL: Record<YearStep, string> = {
  krisis: 'Krisis',
  rapat: 'Rapat Tim',
  lobi: 'Lobi Terbuka',
  pengesahan: 'Pengesahan',
  pengungkapan: 'Pengungkapan',
  koran: 'Halaman Depan',
};

/** One sentence on what teams should do now, always on the main screen (GDD, "Onboarding"). */
export const STEP_HINT: Record<YearStep, string> = {
  krisis: 'Baca krisis tahun ini. Apa dampaknya bagi timmu?',
  rapat: 'Diskusikan di dalam tim. Setiap anggota memilih di HP-nya.',
  lobi: 'Datangi tim lain. Buat pakta lewat HP Juru Bicara.',
  pengesahan: 'Juru Bicara menahan tombol SAH untuk mengunci keputusan tim.',
  pengungkapan: 'Semua keputusan dibuka. Lihat siapa menyebabkan apa.',
  koran: 'Harian TEI melaporkan tahun ini.',
};

export const PHASE_LABEL: Record<RoomPhase, string> = {
  gabung: 'Bergabung',
  briefing: 'Briefing peran',
  tahun: 'Tahun',
  tebak: 'Tebak agenda',
  selesai: 'Hasil akhir',
};

export const ENDING_LABEL = {
  kolaps: 'Negara Kolaps',
  sejahtera: 'Negara Sejahtera',
  bertahan: 'Negara Bertahan',
  tertatih: 'Negara Tertatih',
} as const;

export const COLLAPSE_LABEL = {
  bangkrut: 'Bangkrut: Kas Negara habis',
  lengser: 'Lengser: Kepercayaan Publik habis',
  anarki: 'Anarki: Keresahan memuncak',
  hiperinflasi: 'Hiperinflasi: Harga tak terkendali',
} as const;

export const signed = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
