import type { CrisisCard } from '../types';
import { CLASSIC_PACK, LATEST_PACK, PACK_CHOICES, type PackChoice } from './packList';
import { PACK_2026_10 } from './packs/2026-10';

// Draft v0 crisis deck: 6 categories x 2 cards. Year 3 always draws from 'global'.

export const CRISIS_CARDS: CrisisCard[] = [
  { id: 'c_beras', category: 'pangan', title: 'Beras Mahal, Piring Makin Kecil', effects: { harga: 1, keresahan: 1 }, modifier: { kind: 'scaleTag', tag: 'subsidi', factor: 2 }, ruleText: 'Kartu Subsidi bernilai dua kali lipat, biayanya juga.', narrative: 'Kemarau panjang memangkas panen. Harga beras di pasar naik tiga minggu berturut-turut. Pedagang warteg mulai mengurangi porsi nasi, sementara gudang pemerintah mengaku stok "aman, tapi di provinsi sebelah".', question: 'Siapa yang seharusnya menanggung biaya beras mahal: negara, pedagang, atau konsumen?', concepts: ['inflasi pangan', 'subsidi', 'sisi penawaran'] },
  { id: 'c_pupuk', category: 'pangan', title: 'Pupuk Subsidi Hilang di Jalan', effects: { harga: 1, kepercayaan: -1 }, modifier: { kind: 'endOfYear', effects: { kerja: -1 } }, ruleText: 'Petani mogok tanam: Lapangan Kerja -1 di akhir tahun.', narrative: 'Petani antre di kios sejak subuh, tetapi pupuk bersubsidi sudah habis sebelum toko buka. Anehnya, karung bercap "bersubsidi" muncul di pasar gelap dengan harga dua kali lipat. Pejabat berjanji membentuk tim. Petani berjanji tidak menanam dulu.', question: 'Subsidi yang bocor: lebih baik diperketat, diganti bantuan tunai, atau dihapus?', concepts: ['subsidi tidak tepat sasaran', 'sisi penawaran'] },
  { id: 'c_minyak', category: 'energi', title: 'Harga Minyak Dunia Melambung', effects: { kas: -1, harga: 1 }, modifier: { kind: 'endOfYear', effects: { kas: -1 } }, ruleText: 'Subsidi energi menyedot Kas -1 di akhir tahun.', narrative: 'Harga minyak dunia melonjak karena perang di belahan bumi lain. Harga bensin di dalam negeri masih ditahan, jadi selisihnya ditanggung kas negara. Setiap kali harga dunia naik satu dolar, bendahara negara menghitung ulang sambil memijat kening.', question: 'Harga bensin ditahan atau dinaikkan: siapa yang untung dan siapa yang rugi dari tiap pilihan?', concepts: ['subsidi energi', 'APBN', 'inflasi impor'] },
  { id: 'c_listrik', category: 'energi', title: 'Pemadaman Bergilir', effects: { kerja: -1, keresahan: 1 }, modifier: { kind: 'scaleTag', tag: 'infrastruktur', factor: 2 }, ruleText: 'Kartu Infrastruktur bernilai dua kali lipat, biayanya juga.', narrative: 'Beberapa pembangkit tua rusak bersamaan. Listrik padam bergilir empat jam sehari. Pabrik menghentikan sif malam, usaha kecil menyewa genset, dan pejabat mengimbau warga "bijak memakai listrik" dari ruangan berpendingin.', question: 'Bangun pembangkit baru sekarang dengan biaya besar, atau berhemat dan menunggu?', concepts: ['infrastruktur', 'investasi publik', 'efek tertunda'] },
  { id: 'c_asuransi', category: 'keuangan', title: 'Asuransi Raksasa Gagal Bayar', effects: { kepercayaan: -1, tabungan: -1 }, modifier: { kind: 'freezeLever', lever: 'bunga' }, ruleText: 'Suku bunga dibekukan tahun ini.', narrative: 'Perusahaan asuransi terbesar di negeri ini mengaku tidak sanggup membayar klaim. Uang premi nasabah ternyata ditaruh di saham yang harganya kini tinggal seperempat. Pensiunan antre di kantor cabang, dan suku bunga dibekukan agar kepanikan tidak menular.', question: 'Kalau negara menalangi nasabah, siapa yang sebenarnya membayar?', concepts: ['risiko keuangan', 'kepercayaan', 'dana talangan'] },
  { id: 'c_pinjol', category: 'keuangan', title: 'Epidemi Pinjol Ilegal', effects: { keresahan: 1, tabungan: -1 }, modifier: { kind: 'scaleTag', tag: 'edukasi', factor: 2 }, ruleText: 'Kartu edukasi keuangan bernilai dua kali lipat.', narrative: 'Aplikasi pinjaman tanpa izin menawarkan dana cair dalam lima menit. Bunganya tidak tercantum, dan penagihnya menyebarkan foto peminjam ke seluruh kontak. Ribuan keluarga berutang untuk menutup utang lain. Grup keluarga kini berisi peringatan, bukan ucapan selamat pagi.', question: 'Siapa yang paling bertanggung jawab: peminjam, pemberi pinjaman, atau pengawas?', concepts: ['literasi keuangan', 'utang konsumtif'] },
  { id: 'c_phk', category: 'ketenagakerjaan', title: 'Gelombang PHK Tekstil', effects: { kerja: -2 }, modifier: { kind: 'scaleTag', tag: 'investasi', factor: 2 }, ruleText: 'Kartu Investasi bernilai dua kali lipat, biayanya juga.', narrative: 'Pabrik tekstil di tiga kota menutup jalur produksi. Pesanan luar negeri pindah ke negara yang upahnya lebih murah, dan kain impor membanjiri pasar. Ribuan buruh pulang membawa surat PHK dan janji pesangon "setelah aset terjual".', question: 'Lindungi pabrik lama, atau bantu pekerjanya pindah ke industri baru?', concepts: ['PHK', 'daya saing', 'investasi'] },
  { id: 'c_ojol', category: 'ketenagakerjaan', title: 'Mogok Massal Pengemudi Daring', effects: { keresahan: 1, kerja: -1 }, modifier: { kind: 'scaleTag', tag: 'dialog', factor: 2 }, ruleText: 'Kartu dialog buruh bernilai dua kali lipat.', narrative: 'Ribuan pengemudi ojek daring mematikan aplikasi serentak. Mereka menuntut potongan aplikator diturunkan dan tarif dinaikkan. Perusahaan menyebut mereka "mitra", bukan pekerja, sehingga upah minimum tidak berlaku. Kota tiba-tiba sadar betapa bergantungnya ia pada motor-motor itu.', question: 'Pengemudi daring itu mitra atau pekerja? Apa bedanya bagi perlindungan mereka?', concepts: ['ekonomi gig', 'upah minimum', 'negosiasi'] },
  { id: 'c_data', category: 'digital', title: 'Data Kependudukan Bocor', effects: { kepercayaan: -2 }, modifier: { kind: 'freezeLever', lever: 'pajak' }, ruleText: 'Parlemen membekukan perubahan pajak selama skandal.', narrative: 'Data kependudukan seratus juta warga dijual di forum peretas seharga satu sepeda motor. Lembaga yang bertugas menjaganya saling lempar tanggung jawab. Parlemen membekukan semua perubahan pajak sampai skandal selesai.', question: 'Kalau warga tidak percaya negara menjaga datanya, apa yang terjadi pada kepatuhan pajak?', concepts: ['kepercayaan publik', 'tata kelola', 'pajak'] },
  { id: 'c_judol', category: 'digital', title: 'Judi Online Menggerogoti Gaji', effects: { tabungan: -1, keresahan: 1 }, modifier: { kind: 'scaleTag', tag: 'bansos', factor: 2 }, ruleText: 'Kartu Bansos bernilai dua kali lipat, biayanya juga.', narrative: 'Judi daring menyusup lewat iklan di gim dan video pendek. Gaji bulanan habis dalam semalam, tabungan sekolah anak ikut terkuras. Warung mencatat utang pelanggan naik, sementara bandarnya berkantor di luar negeri dan tidak membayar pajak sepeser pun.', question: 'Bansos untuk keluarga yang terjerat judi: menolong, atau justru ikut habis di meja judi?', concepts: ['perilaku konsumen', 'bansos', 'tabungan'] },
  { id: 'c_rupiah', category: 'global', title: 'Rupiah Anjlok, Impor Mahal', effects: { harga: 2 }, modifier: { kind: 'scaleTag', tag: 'rupiah', factor: 2 }, ruleText: 'Kartu Intervensi Rupiah bernilai dua kali lipat, biayanya juga.', narrative: 'Investor asing menarik dananya pulang setelah suku bunga di negara mereka naik. Rupiah melemah tajam, dan harga barang impor, dari gandum sampai obat, ikut naik. Pengusaha yang berutang dalam dolar mendadak punya utang lebih besar tanpa meminjam sepeser pun.', question: 'Lebih baik cadangan devisa dipakai untuk menahan rupiah, atau rupiah dibiarkan melemah?', concepts: ['nilai tukar', 'inflasi impor', 'cadangan devisa'] },
  { id: 'c_resesi', category: 'global', title: 'Resesi di Negara Mitra Dagang', effects: { kerja: -1, kas: -1 }, modifier: { kind: 'freezeLever', lever: 'harga' }, ruleText: 'Permintaan lesu: Pengusaha tidak bisa menaikkan harga.', narrative: 'Negara-negara mitra dagang masuk resesi. Pesanan batu bara, sawit, dan sepatu anjlok. Pabrik eksportir merumahkan pekerja, penerimaan pajak turun, dan pengusaha tidak bisa menaikkan harga karena pembelinya memang sedang tidak ada.', question: 'Saat dunia lesu, siapa yang harus belanja agar ekonomi tetap jalan: negara, pengusaha, atau warga?', concepts: ['perdagangan internasional', 'permintaan agregat', 'kebijakan fiskal'] },
];

/** Year 0 practice only: mild, no special rule, never dealt into a real game's deck. */
export const TUTORIAL_CRISIS: CrisisCard = {
  id: 'c_latihan',
  category: 'digital',
  title: 'Gosip Harga Naik Beredar di Grup Keluarga',
  effects: { keresahan: 1 },
  modifier: { kind: 'endOfYear', effects: {} },
  ruleText: 'Tahun latihan: tidak ada aturan khusus, dan hasilnya tidak dihitung.',
  narrative: 'Pesan berantai di grup keluarga mengabarkan semua harga akan naik minggu depan. Tidak ada yang tahu sumbernya, tetapi beberapa orang sudah memborong gula. Tahun ini dipakai untuk mencoba aturan; hasilnya tidak dihitung.',
  question: 'Kalau semua orang percaya harga akan naik, apa yang terjadi pada harga?',
  concepts: ['ekspektasi inflasi'],
};

/**
 * Crisis packs: the classic deck plus one pack per month of real news (docs/paket-krisis.md). A pack
 * needs at least one 'global' card (year 3's shock) and four others. Ids stay unique across packs, so
 * snapshots, debriefs and exports can look any card up without knowing its pack.
 */
export interface CrisisPack extends PackChoice { cards: CrisisCard[] }

const PACK_CARDS: Record<string, CrisisCard[]> = { '2026-10': PACK_2026_10, [CLASSIC_PACK]: CRISIS_CARDS };

export const CRISIS_PACKS: readonly CrisisPack[] = PACK_CHOICES.map(choice => ({ ...choice, cards: PACK_CARDS[choice.id]! }));

export { CLASSIC_PACK, LATEST_PACK };

export function packCards(id: string | undefined): CrisisCard[] {
  return (CRISIS_PACKS.find(pack => pack.id === id) ?? CRISIS_PACKS.find(pack => pack.id === CLASSIC_PACK)!).cards;
}

export const ALL_CRISIS_CARDS: readonly CrisisCard[] = CRISIS_PACKS.flatMap(pack => pack.cards);

export const CRISES_BY_ID: ReadonlyMap<string, CrisisCard> = new Map([...ALL_CRISIS_CARDS, TUTORIAL_CRISIS].map(card => [card.id, card]));

export function getCrisis(id: string): CrisisCard {
  const card = CRISES_BY_ID.get(id);
  if (!card) throw new Error(`Unknown crisis card: ${id}`);
  return card;
}
