import { RULES } from '../rules';
import type { Role, Stat } from '../types';

// What each role does, for the phone's role card and the paper kit's role sheet (GDD, "Peran").
// One source for both: `paper` overrides the few sentences that differ when the game is played on
// paper (sliding tokens, rolling a die).

export interface RoleBrief {
  /** One line on what the role cares about. */
  focus: string;
  lever: { name: string; paperName?: string; options: [string, string][] };
  power: { name: string; text: string; paper?: string };
  /** The team's private number, shown only on its own phone. */
  resource?: { stat: Stat; max: number; income?: string };
  allies: string;
}

export const ROLE_BRIEF: Record<Role, RoleBrief> = {
  pemerintah: {
    focus: 'Mengelola APBN. Hanya kamu yang bisa membelanjakan Kas Negara.',
    lever: { name: 'Pajak', options: [['Naik', 'Kas ▲▲, Kepercayaan ▼, Modal Pengusaha ▼'], ['Tetap', 'Tidak ada efek'], ['Turun', 'Kas ▼▼, Kepercayaan ▲, Modal Pengusaha ▲']] },
    power: { name: 'Hak Anggaran', text: `Kartu bertanda "Belanja negara" hanya bisa dimainkan olehmu. Jika Kas berakhir di 2 atau kurang, semua kartu belanja tahun berikutnya hanya berefek setengah. Negara membayar beban rutin Kas −${RULES.bebanRutinKas} setiap akhir tahun.` },
    allies: 'Butuh Bank Sentral untuk Cetak Uang, dan Masyarakat untuk Kepercayaan.',
  },
  bankSentral: {
    focus: 'Menjaga harga tetap stabil, walau sering tidak populer.',
    lever: { name: 'Suku bunga', paperName: 'Suku bunga (geser di papan)', options: [['Naik 1', 'Kredibilitas ▲ sekarang. Tahun depan: Harga ▼, Lapangan Kerja ▼'], ['Tahan', 'Tidak ada efek'], ['Turun 1', 'Tahun depan: Lapangan Kerja ▲, Harga ▲']] },
    power: { name: 'Independen: Tolak Cetak Uang', text: `Putuskan bersama pilihan rahasiamu. Jika Pemerintah memainkan Cetak Uang dan kamu menolak, kartunya batal dan Kredibilitas ▲. Selama bunga di bawah level ${RULES.inflasiBawaanDiBawahBunga}, Harga naik sendiri setiap akhir tahun.` },
    resource: { stat: 'kredibilitas', max: 5 },
    allies: 'Butuh Pemerintah agar tidak belanja berlebihan dan tidak meminta Cetak Uang.',
  },
  pengusaha: {
    focus: 'Mengumpulkan Modal untuk bisnis. Untung jangka pendek, atau investasi untuk tahun depan?',
    lever: { name: 'Harga jual', options: [['Naikkan', 'Modal ▲▲, Harga ▲, Kepercayaan ▼. Kenaikan upah tahun ini dibebankan ke harga, bukan ke Modal.'], ['Tahan', 'Kenaikan upah dibayar dari Modal.']] },
    power: {
      name: 'Lobi',
      text: `Kartu Lobi Insentif memindahkan uang negara ke Modalmu. Ada peluang 1 dari ${Math.round(1 / RULES.lobiMediaChance)} media membongkarnya tahun itu, dan Masyarakat bisa membongkarnya lewat Investigasi Warga, tahun ini atau tahun depan.`,
      paper: 'Mainkan kartu Lobi Insentif untuk memindahkan uang negara ke kantongmu. Lempar dadu: angka 1 berarti media membongkarnya. Masyarakat juga bisa membongkarnya lewat Investigasi Warga, tahun ini atau tahun depan.',
    },
    resource: { stat: 'modal', max: 20, income: `Laba usaha: setiap akhir tahun, Modal + (Lapangan Kerja ÷ ${RULES.labaUsahaPembagi}, dibulatkan ke bawah). Bisnismu butuh ekonomi yang hidup.` },
    allies: 'Butuh Serikat Buruh agar tidak mogok, dan Pemerintah untuk keringanan.',
  },
  buruh: {
    focus: 'Memperjuangkan upah dan pekerjaan anggota.',
    lever: { name: 'Tuntutan upah', options: [['Tidak menuntut', 'Solidaritas ▼ (anggota kecewa)'], ['Moderat', 'Kepercayaan ▲, Modal Pengusaha ▼ (atau Harga ▲ jika Pengusaha menaikkan harga)'], ['Tinggi', 'Efek moderat × 2, ditambah Lapangan Kerja ▼ dan Solidaritas ▲']] },
    power: { name: 'Mogok', text: 'Bayar 2 Solidaritas untuk membatalkan kartu Pengusaha tahun ini. Akibatnya: Kas ▼, Keresahan ▲, Modal Pengusaha ▼▼. Ancaman mogok saat Lobi boleh hanya gertakan.' },
    resource: { stat: 'solidaritas', max: 5 },
    allies: 'Butuh Masyarakat untuk dukungan publik saat mogok.',
  },
  masyarakat: {
    focus: 'Menjaga dapur tetap ngebul dan suara warga didengar.',
    lever: { name: 'Konsumsi', options: [['Belanja', 'Lapangan Kerja ▲, Harga ▲, Tabungan ▼ (butuh Tabungan ≥ 1)'], ['Biasa', 'Tidak ada efek'], ['Hemat', 'Harga ▼, Lapangan Kerja ▼, Tabungan ▲']] },
    power: { name: 'Suara Publik', text: 'Pilih satu tim lain. Efek Kepercayaan dari kartu tim itu tahun ini menjadi dua kali lipat, baik naik maupun turun.' },
    resource: { stat: 'tabungan', max: 10, income: `Gaji: Tabungan +1 setiap akhir tahun selama Lapangan Kerja ≥ ${RULES.gajiMinKerja}. Harga ≥ 8 menggerus Tabungan −1.` },
    allies: 'Bisa membongkar Lobi Pengusaha lewat kartu Investigasi Warga.',
  },
};
