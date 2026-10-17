import type { PolicyCard, Role } from '../types';

// Draft v0 deck: names and numbers for balancing only. Final card text is written and
// reviewed by the satire writer and economics editor (see GDD, "Konten").

export const POLICY_CARDS: PolicyCard[] = [
  // Pemerintah
  { id: 'gov_bansos', role: 'pemerintah', name: 'Bansos Tepat Sasaran', description: 'Bantuan tunai untuk keluarga termiskin.', effects: { kepercayaan: 1, keresahan: -1, kas: -1 }, tags: ['belanja', 'bansos'] },
  { id: 'gov_subsidi', role: 'pemerintah', name: 'Subsidi BBM', description: 'Menahan harga bensin dengan uang negara.', effects: { harga: -1, keresahan: -1, kas: -2 }, tags: ['belanja', 'subsidi'] },
  { id: 'gov_tol', role: 'pemerintah', name: 'Proyek Jalan Tol', description: 'Mahal sekarang, membuka lapangan kerja tahun depan.', effects: { kas: -2 }, delayed: [{ inYears: 1, effects: { kerja: 2 } }], tags: ['belanja', 'infrastruktur'] },
  { id: 'gov_amnesti', role: 'pemerintah', name: 'Tax Amnesty', description: 'Pengemplang pajak diampuni asal setor sekarang.', effects: { kas: 2, kepercayaan: -1 }, tags: [] },
  { id: 'gov_cetak', role: 'pemerintah', name: 'Minta Cetak Uang', description: 'Meminta bank sentral membiayai defisit. Bisa ditolak.', effects: { kas: 3, kredibilitas: -2 }, delayed: [{ inYears: 1, effects: { harga: 2 } }], tags: ['cetakUang'] },
  { id: 'gov_padat', role: 'pemerintah', name: 'Program Padat Karya', description: 'Membayar warga untuk membangun jalan desa.', effects: { kerja: 1, kas: -1 }, tags: ['belanja'] },
  { id: 'gov_operasi', role: 'pemerintah', name: 'Operasi Pasar Beras', description: 'Melepas stok gudang ke pasar.', effects: { harga: -1, kas: -1 }, tags: ['belanja'] },
  { id: 'gov_dinas', role: 'pemerintah', name: 'Pangkas Perjalanan Dinas', description: 'Rapat di hotel dipindah ke kantor.', effects: { kas: 1 }, tags: [] },

  // Bank Sentral
  { id: 'bs_opt', role: 'bankSentral', name: 'Operasi Pasar Terbuka', description: 'Menyerap uang beredar lewat surat berharga.', effects: { harga: -1, kerja: -1 }, tags: [] },
  { id: 'bs_rupiah', role: 'bankSentral', name: 'Intervensi Rupiah', description: 'Menjual cadangan devisa untuk menahan kurs.', effects: { harga: -1, kas: -1 }, tags: ['rupiah'] },
  { id: 'bs_kredit', role: 'bankSentral', name: 'Longgarkan Kredit', description: 'Bank lebih mudah memberi pinjaman usaha.', effects: { kerja: 1 }, delayed: [{ inYears: 1, effects: { harga: 1 } }], tags: [] },
  { id: 'bs_literasi', role: 'bankSentral', name: 'Kampanye Literasi Pinjol', description: 'Mengajari warga membaca bunga pinjaman.', effects: { keresahan: -1 }, tags: ['edukasi'] },
  { id: 'bs_ltv', role: 'bankSentral', name: 'Perketat Uang Muka KPR', description: 'Meredam harga rumah, calon pembeli gigit jari.', effects: { harga: -1, kepercayaan: -1 }, tags: [] },
  { id: 'bs_likuiditas', role: 'bankSentral', name: 'Pelonggaran Likuiditas', description: 'Menyuntik dana murah ke perbankan.', effects: { kerja: 1, kredibilitas: -1 }, delayed: [{ inYears: 1, effects: { harga: 1 } }], tags: [] },
  { id: 'bs_guidance', role: 'bankSentral', name: 'Forward Guidance', description: 'Mengumumkan arah kebijakan agar pasar tenang.', effects: { kredibilitas: 1 }, tags: [] },
  { id: 'bs_gwm', role: 'bankSentral', name: 'Naikkan Giro Wajib Minimum', description: 'Bank wajib menahan lebih banyak dana.', effects: { harga: -1 }, delayed: [{ inYears: 1, effects: { kerja: -1 } }], tags: [] },

  // Pengusaha
  { id: 'ent_investasi', role: 'pengusaha', name: 'Investasi Pabrik Baru', description: 'Modal keluar sekarang, panen tahun depan.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, modal: 3 } }], requires: { modal: 2 }, tags: ['investasi'] },
  { id: 'ent_otomasi', role: 'pengusaha', name: 'Otomatisasi', description: 'Mesin tidak minta THR.', effects: { modal: 2, kerja: -1 }, delayed: [{ inYears: 1, effects: { modal: 1 } }], tags: [] },
  { id: 'ent_shrink', role: 'pengusaha', name: 'Shrinkflation', description: 'Harga sama, isinya berkurang.', effects: { modal: 3, kepercayaan: -1, harga: 1 }, tags: [] },
  { id: 'ent_phk', role: 'pengusaha', name: 'PHK Efisiensi', description: 'Merampingkan karyawan demi laporan keuangan.', effects: { kerja: -2, modal: 4 }, delayed: [{ inYears: 1, effects: { keresahan: 1 } }], tags: ['phk'] },
  { id: 'ent_csr', role: 'pengusaha', name: 'Program CSR', description: 'Spanduk besar, bantuan secukupnya.', effects: { modal: -1, kepercayaan: 1, keresahan: -1 }, requires: { modal: 1 }, tags: [] },
  { id: 'ent_lobi', role: 'pengusaha', name: 'Lobi Insentif', description: 'Amplop untuk keringanan pajak. Bisa terbongkar.', effects: { modal: -1 }, tags: ['lobi'] },
  { id: 'ent_ekspor', role: 'pengusaha', name: 'Genjot Ekspor', description: 'Barang dijual ke luar, pasar dalam negeri menipis.', effects: { modal: 1, kas: 1, harga: 1 }, tags: ['ekspor'] },
  { id: 'ent_umkm', role: 'pengusaha', name: 'Kemitraan UMKM', description: 'Memasok bahan baku ke usaha kecil.', effects: { modal: -1, kerja: 1 }, requires: { modal: 1 }, tags: [] },

  // Serikat Buruh
  { id: 'lab_bipartit', role: 'buruh', name: 'Negosiasi Bipartit', description: 'Duduk satu meja dengan manajemen.', effects: { keresahan: -1 }, tags: ['dialog'] },
  { id: 'lab_demo', role: 'buruh', name: 'Demo Damai', description: 'Turun ke jalan dengan spanduk dan nasi bungkus.', effects: { solidaritas: 1, keresahan: 1, kepercayaan: 1, kas: -1 }, tags: [] },
  { id: 'lab_disnaker', role: 'buruh', name: 'Laporan ke Disnaker', description: 'Melaporkan pelanggaran jam kerja.', effects: { modal: -1, solidaritas: 1 }, tags: [] },
  { id: 'lab_koperasi', role: 'buruh', name: 'Koperasi Pekerja', description: 'Simpan pinjam tanpa rentenir.', effects: { tabungan: 1 }, tags: [] },
  { id: 'lab_pelatihan', role: 'buruh', name: 'Pelatihan Ulang Pekerja', description: 'Kursus keterampilan baru, didanai negara.', effects: { kas: -1 }, delayed: [{ inYears: 1, effects: { kerja: 1 } }], tags: [] },
  { id: 'lab_rekrut', role: 'buruh', name: 'Rekrut Anggota Baru', description: 'Barisan makin panjang, suasana makin panas.', effects: { solidaritas: 2, keresahan: 1 }, tags: [] },
  { id: 'lab_boikot', role: 'buruh', name: 'Kampanye Boikot Produk', description: 'Mengajak warga berhenti membeli merek tertentu.', effects: { modal: -2, solidaritas: 1, kepercayaan: 1, keresahan: 1 }, tags: [] },
  { id: 'lab_tripartit', role: 'buruh', name: 'Dewan Pengupahan Tripartit', description: 'Berunding bersama pemerintah dan pengusaha.', effects: { keresahan: -1, solidaritas: -1, modal: -1 }, tags: ['dialog'] },

  // Masyarakat
  { id: 'cit_borong', role: 'masyarakat', name: 'Borong Sembako', description: 'Stok di rumah aman, rak di pasar kosong.', effects: { harga: 1, tabungan: -1, keresahan: -1 }, requires: { tabungan: 1 }, tags: [] },
  { id: 'cit_lokal', role: 'masyarakat', name: 'Gerakan Beli Lokal', description: 'Belanja di warung tetangga.', effects: { kerja: 1, tabungan: -1 }, requires: { tabungan: 1 }, tags: [] },
  { id: 'cit_investigasi', role: 'masyarakat', name: 'Investigasi Warga', description: 'Menelusuri aliran dana mencurigakan.', effects: { kepercayaan: -1 }, tags: ['investigasi'] },
  { id: 'cit_arisan', role: 'masyarakat', name: 'Arisan Darurat', description: 'Saling menalangi antartetangga.', effects: { tabungan: 1, keresahan: -1 }, tags: [] },
  { id: 'cit_gotong', role: 'masyarakat', name: 'Gotong Royong Kampung', description: 'Kerja bakti dan dapur umum.', effects: { keresahan: -1, kepercayaan: 1, tabungan: -1 }, requires: { tabungan: 1 }, tags: [] },
  { id: 'cit_protes', role: 'masyarakat', name: 'Protes Harga di Medsos', description: 'Tagar trending, penjual mulai berhitung ulang.', effects: { kepercayaan: -1, keresahan: 1 }, delayed: [{ inYears: 1, effects: { harga: -1 } }], tags: [] },
  { id: 'cit_pinjol', role: 'masyarakat', name: 'Ngutang Pinjol Demi Gaya', description: 'Senang sekarang, ditagih tahun depan.', effects: { tabungan: 2, kerja: 1 }, delayed: [{ inYears: 1, effects: { tabungan: -3, keresahan: 1 } }], tags: [] },
  { id: 'cit_usaha', role: 'masyarakat', name: 'Buka Usaha Rumahan', description: 'Modal dari tabungan, karyawan dari keluarga.', effects: { kerja: 1, tabungan: -2 }, requires: { tabungan: 2 }, tags: [] },
];

export const CARDS_BY_ID: ReadonlyMap<string, PolicyCard> = new Map(POLICY_CARDS.map(card => [card.id, card]));

export function cardsForRole(role: Role): PolicyCard[] {
  return POLICY_CARDS.filter(card => card.role === role);
}

export function getCard(id: string): PolicyCard {
  const card = CARDS_BY_ID.get(id);
  if (!card) throw new Error(`Unknown policy card: ${id}`);
  return card;
}
