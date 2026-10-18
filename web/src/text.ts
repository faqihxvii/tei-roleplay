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
  rapat: 'Diskusikan di dalam tim. Setiap anggota memilih di HP-nya. Juru Bicara menekan Tim kami selesai bila sudah sepakat.',
  lobi: 'Datangi tim lain. Buat pakta lewat HP Juru Bicara, lalu tekan Tim kami selesai.',
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

/**
 * Year 0 coaching: what each step is for, in a sentence or two, on the main screen and on phones.
 * The GDD wants no walls of tutorial text, so each line explains only the step on screen.
 */
export const PRACTICE_COACH: Record<YearStep, { main: string; phone: string; spokesperson?: string }> = {
  krisis: {
    main: 'Setiap tahun dibuka dengan krisis. Angkanya langsung mengubah Papan Negara, dan aturan tahun ini berlaku untuk semua tim.',
    phone: 'Baca krisis di layar utama. Di bawah ini ada sumber daya dan agenda rahasia timmu.',
  },
  rapat: {
    main: 'Rapat Tim: setiap orang memilih satu kartu dan tuas untuk timnya. Panah menunjukkan arah dampak, bukan angka pasti.',
    phone: 'Coba pilih satu kartu dan satu tuas. Angka kuning di samping pilihan adalah jumlah anggota timmu yang memilihnya.',
  },
  lobi: {
    main: 'Lobi Terbuka: berdiri, datangi tim lain, tawar-menawar. Janji yang disepakati muncul di Meja Lobi.',
    phone: 'Bantu Juru Bicaramu menawar ke tim lain. Pakta dibuat lewat HP Juru Bicara.',
    spokesperson: 'Buka tab Pakta dan coba ajukan satu janji ke tim lain.',
  },
  pengesahan: {
    main: 'Pengesahan: Juru Bicara menahan tombol SAH. Kalau tidak sempat, pilihan suara terbanyak yang dipakai.',
    phone: 'Tunggu Juru Bicaramu mengesahkan. Pilihanmu masih dihitung kalau waktu habis.',
    spokesperson: 'Tahan tombol SAH sampai penuh. Kalau dilepas di tengah, tidak terjadi apa-apa.',
  },
  pengungkapan: {
    main: 'Semua keputusan dibuka. Setiap perubahan angka punya penyebab dan nama timnya. Pakta yang dilanggar robek.',
    phone: 'Lihat layar utama. Perubahan sumber daya timmu ada di bawah.',
  },
  koran: {
    main: 'Setiap tahun ditutup Harian TEI. Setelah ini permainan sungguhan dimulai dari awal, dan hasil latihan dibuang.',
    phone: 'Latihan hampir selesai. Tahun 1 dimulai dari papan awal; hasil latihan tidak dihitung.',
  },
};
