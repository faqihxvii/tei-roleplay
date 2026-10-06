export interface GlossaryTerm {
  term: string;
  definition: string;
  category?: 'Kebijakan' | 'Moneter' | 'Bisnis' | 'Sosial';
}

export const ECONOMIC_GLOSSARY: Record<string, GlossaryTerm> = {
  'inflasi': {
    term: 'Inflasi',
    definition: 'Kenaikan harga barang dan jasa secara umum yang menurunkan daya beli masyarakat.',
    category: 'Moneter'
  },
  'suku bunga': {
    term: 'Suku Bunga',
    definition: 'Persentase biaya pinjaman atau imbalan simpanan yang diatur bank sentral untuk mengontrol uang beredar.',
    category: 'Moneter'
  },
  'subsidi': {
    term: 'Subsidi',
    definition: 'Bantuan keuangan pemerintah untuk menekan harga barang pokok agar tetap terjangkau.',
    category: 'Kebijakan'
  },
  'defisit': {
    term: 'Defisit Anggaran',
    definition: 'Kondisi ketika pengeluaran belanja negara melebihi total pendapatan yang diterima.',
    category: 'Kebijakan'
  },
  'likuiditas': {
    term: 'Likuiditas',
    definition: 'Ketersediaan uang tunai atau kemudahan aset untuk dicairkan dalam transaksi ekonomi.',
    category: 'Moneter'
  },
  'resesi': {
    term: 'Resesi Ekonomi',
    definition: 'Penurunan signifikan aktivitas ekonomi nasional yang berlangsung selama beberapa bulan.',
    category: 'Kebijakan'
  },
  'cukai': {
    term: 'Cukai / Pajak Khusus',
    definition: 'Pungutan negara terhadap barang-barang tertentu yang konsumsinya perlu dikendalikan.',
    category: 'Kebijakan'
  },
  'infrastruktur': {
    term: 'Infrastruktur',
    definition: 'Fasilitas fisik dasar (seperti jalan, pelabuhan, energi) yang menopang roda ekonomi.',
    category: 'Kebijakan'
  },
  'otomatisasi': {
    term: 'Otomatisasi',
    definition: 'Pengalihan proses kerja manusia menggunakan mesin/AI untuk menghemat biaya operasional.',
    category: 'Bisnis'
  },
  'shrinkflation': {
    term: 'Shrinkflation',
    definition: 'Strategi produsen menyusutkan ukuran/porsi produk tanpa menurunkan harga jualnya.',
    category: 'Bisnis'
  },
  'insentif pajak': {
    term: 'Insentif Pajak',
    definition: 'Keringanan atau potongan pajak dari pemerintah agar pelaku usaha tetap berinvestasi.',
    category: 'Kebijakan'
  },
  'kpr': {
    term: 'KPR (Kredit Rumah)',
    definition: 'Pinjaman jangka panjang dari perbankan untuk membeli rumah atau properti.',
    category: 'Moneter'
  },
  'rupiah': {
    term: 'Nilai Tukar Rupiah',
    definition: 'Harga mata uang domestik dibanding mata uang asing (seperti Dolar AS) dalam perdagangan.',
    category: 'Moneter'
  },
  'pinjol': {
    term: 'Pinjaman Online (Pinjol)',
    definition: 'Layanan kredit digital berbasis aplikasi yang menawarkan dana instan.',
    category: 'Sosial'
  },
  'semikonduktor': {
    term: 'Chip Semikonduktor',
    definition: 'Komponen otak elektronik vital untuk pembuatan gadget, mobil, dan industri otomotif.',
    category: 'Bisnis'
  },
  'gagal bayar': {
    term: 'Gagal Bayar',
    definition: 'Ketidakmampuan perusahaan atau debitur melunasi utang/klaim jatuh tempo.',
    category: 'Bisnis'
  }
};
