// Every economic term a player meets can be tapped for a one-line explanation (GDD, "Bahasa dan
// konten": tingkat baca kelas 10–12). Kept apart from the components so an English edition can
// replace the text without touching code.

export interface GlossaryEntry {
  term: string;
  /** Other spellings matched in running text. */
  aliases?: string[];
  text: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: 'inflasi', text: 'Kenaikan harga barang dan jasa secara umum dan terus-menerus. Uang yang sama jadi membeli lebih sedikit.' },
  { term: 'inflasi pangan', text: 'Inflasi yang dipicu naiknya harga bahan makanan seperti beras, cabai, dan minyak goreng.' },
  { term: 'inflasi impor', text: 'Kenaikan harga karena barang dari luar negeri jadi lebih mahal, misalnya saat rupiah melemah atau harga dunia naik.' },
  { term: 'ekspektasi inflasi', text: 'Perkiraan orang bahwa harga akan naik. Kalau semua orang yakin harga naik, mereka buru-buru membeli dan menaikkan harga, sehingga harga benar-benar naik.' },
  { term: 'subsidi', text: 'Bantuan pemerintah yang membuat harga suatu barang lebih murah dari harga pasar. Biayanya ditanggung Kas Negara.' },
  { term: 'subsidi energi', text: 'Subsidi untuk menahan harga bensin, solar, gas, atau listrik.' },
  { term: 'subsidi tidak tepat sasaran', text: 'Subsidi yang ikut dinikmati orang mampu atau bocor ke pasar gelap, bukan ke orang yang membutuhkan.' },
  { term: 'sisi penawaran', text: 'Hal-hal yang menentukan berapa banyak barang bisa diproduksi: panen, pupuk, bahan baku, pabrik, dan pekerja.' },
  { term: 'APBN', text: 'Anggaran Pendapatan dan Belanja Negara: rencana pemasukan dan pengeluaran negara selama satu tahun.' },
  { term: 'defisit', text: 'Keadaan ketika belanja negara lebih besar daripada pemasukannya, sehingga kekurangannya harus ditutup dengan utang atau cara lain.' },
  { term: 'pajak', text: 'Iuran wajib warga dan perusahaan kepada negara. Dari sinilah sebagian besar belanja negara dibiayai.' },
  { term: 'kebijakan fiskal', text: 'Keputusan pemerintah soal pajak dan belanja negara.' },
  { term: 'kebijakan moneter', text: 'Keputusan bank sentral soal suku bunga dan jumlah uang yang beredar.' },
  { term: 'suku bunga', aliases: ['bunga'], text: 'Harga meminjam uang. Bunga naik membuat pinjaman mahal sehingga orang lebih banyak menabung dan sedikit berbelanja.' },
  { term: 'cetak uang', text: 'Bank sentral membiayai belanja pemerintah dengan uang baru. Mudah dilakukan, tetapi uang yang terlalu banyak mendorong inflasi.' },
  { term: 'kredibilitas', text: 'Seberapa dipercaya janji bank sentral untuk menjaga harga tetap stabil.' },
  { term: 'infrastruktur', text: 'Jalan, listrik, air, pelabuhan, dan fasilitas dasar lain yang membuat kegiatan ekonomi bisa berjalan.' },
  { term: 'investasi', text: 'Menanam uang sekarang, misalnya untuk pabrik, mesin, atau usaha baru, demi hasil di masa depan.' },
  { term: 'investasi publik', text: 'Belanja pemerintah untuk hal yang manfaatnya terasa bertahun-tahun, seperti pembangkit listrik atau jalan.' },
  { term: 'efek tertunda', text: 'Akibat sebuah keputusan yang baru terasa satu atau dua tahun kemudian, sering setelah semua orang lupa siapa penyebabnya.' },
  { term: 'risiko keuangan', text: 'Kemungkinan uang yang ditabung, diasuransikan, atau diinvestasikan hilang atau berkurang nilainya.' },
  { term: 'kepercayaan publik', aliases: ['kepercayaan'], text: 'Seberapa yakin warga bahwa pemerintah dan lembaga negara bekerja jujur dan mampu.' },
  { term: 'dana talangan', text: 'Uang negara yang dipakai menyelamatkan perusahaan atau bank yang gagal bayar, agar kepanikan tidak menyebar.' },
  { term: 'literasi keuangan', text: 'Kemampuan memahami bunga, utang, tabungan, dan risiko sebelum mengambil keputusan soal uang.' },
  { term: 'utang konsumtif', text: 'Utang untuk kebutuhan sehari-hari atau barang konsumsi, bukan untuk usaha yang menghasilkan.' },
  { term: 'PHK', text: 'Pemutusan hubungan kerja: pekerja diberhentikan oleh perusahaan.' },
  { term: 'daya saing', text: 'Kemampuan barang buatan dalam negeri bersaing harga dan mutu dengan barang dari negara lain.' },
  { term: 'ekonomi gig', text: 'Pekerjaan lepas per tugas lewat aplikasi, seperti ojek atau kurir daring, tanpa status karyawan tetap.' },
  { term: 'upah minimum', text: 'Upah terendah yang boleh dibayar pemberi kerja, ditetapkan pemerintah.' },
  { term: 'negosiasi', text: 'Tawar-menawar antara dua pihak untuk mencapai kesepakatan yang bisa diterima keduanya.' },
  { term: 'tata kelola', text: 'Cara sebuah lembaga dijalankan: aturannya, pengawasannya, dan siapa yang bertanggung jawab saat terjadi masalah.' },
  { term: 'perilaku konsumen', text: 'Cara orang memutuskan untuk membeli, menabung, atau berutang, termasuk keputusan yang tidak masuk akal.' },
  { term: 'bansos', text: 'Bantuan sosial: uang atau barang dari pemerintah untuk keluarga yang membutuhkan.' },
  { term: 'tabungan', text: 'Bagian pendapatan yang tidak dibelanjakan dan disimpan untuk nanti.' },
  { term: 'nilai tukar', text: 'Harga satu mata uang dalam mata uang lain, misalnya berapa rupiah untuk satu dolar.' },
  { term: 'cadangan devisa', text: 'Simpanan mata uang asing milik negara, dipakai untuk membayar impor dan menahan nilai tukar.' },
  { term: 'perdagangan internasional', aliases: ['ekspor', 'impor'], text: 'Jual beli barang dan jasa antarnegara: ekspor adalah menjual ke luar negeri, impor adalah membeli dari luar negeri.' },
  { term: 'permintaan agregat', text: 'Total belanja di sebuah negara, oleh warga, pengusaha, pemerintah, dan pembeli dari luar negeri.' },
  { term: 'paradoks hemat', text: 'Kalau semua orang berhemat bersamaan, belanja turun, usaha sepi, dan pendapatan semua orang ikut turun.' },
  { term: 'resesi', text: 'Ekonomi menyusut beberapa bulan berturut-turut: produksi turun dan banyak orang kehilangan pekerjaan.' },
  { term: 'lapangan kerja', text: 'Seberapa mudah warga mendapat pekerjaan. Di papan, angka rendah berarti banyak pengangguran.' },
  { term: 'keresahan', text: 'Seberapa marah dan gelisah warga. Di papan, angka tinggi bisa berujung demo besar.' },
];

const byTerm = new Map(GLOSSARY.map(e => [e.term.toLowerCase(), e]));

export function lookup(term: string): GlossaryEntry | undefined {
  const key = term.toLowerCase();
  return byTerm.get(key) ?? GLOSSARY.find(e => e.aliases?.some(a => a.toLowerCase() === key));
}

export type Piece = string | { term: GlossaryEntry; text: string };

/**
 * Splits running text so each glossary term, the longest match first, becomes tappable once.
 * Whole words only, and case-insensitive ("Bunga ditahan" glosses as suku bunga).
 */
export function gloss(text: string): Piece[] {
  const names = GLOSSARY.flatMap(e => [e.term, ...(e.aliases ?? [])]).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  const seen = new Set<GlossaryEntry>();
  const out: Piece[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const entry = lookup(match[0]);
    if (!entry || seen.has(entry)) continue;
    seen.add(entry);
    if (match.index! > last) out.push(text.slice(last, match.index));
    out.push({ term: entry, text: match[0] });
    last = match.index! + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
