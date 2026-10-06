import { Action, Role } from '../types';

export const ROLES: Role[] = ['Pemerintah', 'Bank Sentral', 'Pengusaha', 'Serikat Buruh', 'Masyarakat'];

export const ROLE_INFO: Record<Role, { goal: string, challenge: string }> = {
  'Pemerintah': { goal: 'Bikin Kas Negara penuh melimpah tapi masyarakat jangan sampai tertekan.', challenge: 'Tiap mau naikin pajak atau kurangi subsidi, pasti diprotes warga.' },
  'Bank Sentral': { goal: 'Redam Level Chaos nasional, cegah kepanikan dan anarki.', challenge: 'Tugasnya menjaga kestabilan nilai uang, sering bikin aturan yang kurang populer.' },
  'Pengusaha': { goal: 'Kumpulin Token Cuan sebanyak-banyaknya untuk ekspansi bisnis.', challenge: 'Ditekan pajak sama Pemerintah, dituntut kesejahteraan oleh Buruh.' },
  'Serikat Buruh': { goal: 'Tegakkan hak pekerja dan berikan sanksi tegas atas pelanggaran Pengusaha.', challenge: 'Kalau tuntutan berlebihan, pabrik bisa tutup dan pekerja malah nganggur.' },
  'Masyarakat': { goal: 'Jaga Mood & kepuasan Rakyat agar senantiasa tenteram.', challenge: 'Sangat rentan terhadap kenaikan harga barang dan isu-isu sosial.' }
};

export const POSSIBLE_THEMES = [
  { title: "Lonjakan Harga Pangan", description: "Harga beras dan kebutuhan pokok meroket karena gagal panen akibat cuaca ekstrem." },
  { title: "Gelombang PHK Manufaktur", description: "Permintaan ekspor lesu, beberapa pabrik padat karya terpaksa merumahkan ribuan pekerja." },
  { title: "Epidemi Pinjaman Online", description: "Banyak warga terjerat utang pinjol ilegal berbunga tinggi, memicu keresahan sosial." },
  { title: "Beban Subsidi Energi", description: "Harga minyak dunia melambung tinggi, menyedot kas negara untuk subsidi BBM." },
  { title: "Krisis Pasokan Properti", description: "Harga rumah tak terjangkau bagi milenial, memicu protes ketimpangan ekonomi." },
  { title: "Skandal Korupsi Pajak", description: "Kasus penggelapan pajak oleh oknum pejabat terbongkar, menggerus kepercayaan publik." },
  { title: "Kelangkaan Pupuk Subsidi", description: "Distribusi pupuk tersendat, petani mengancam mogok tanam yang bisa memicu krisis pangan." },
  { title: "Kenaikan Cukai Ekstrem", description: "Pemerintah menaikkan cukai rokok dan minuman manis drastis untuk menambal defisit anggaran." },
  { title: "Mogok Kerja Transportasi", description: "Sopir logistik dan transportasi umum mogok massal menuntut penyesuaian tarif." },
  { title: "Kebocoran Data Nasional", description: "Data kependudukan bocor dan diperjualbelikan, memicu kepanikan soal keamanan siber." },
  { title: "Pelemahan Nilai Tukar Rupiah", description: "Suku bunga global naik, membuat rupiah anjlok dan biaya impor bahan baku industri membengkak." },
  { title: "Ledakan Tren Gaya Hidup Konsumtif", description: "Tren 'Fear of Missing Out' membuat tabungan masyarakat menipis, memicu kerentanan ekonomi keluarga." },
  { title: "Krisis Sampah Perkotaan", description: "TPA utama kelebihan kapasitas, protes warga di sekitar pembuangan menghentikan laju logistik kota." },
  { title: "Kelangkaan Chip Semikonduktor", description: "Industri otomotif dan elektronik domestik terhambat parah akibat macetnya pasokan global." },
  { title: "Kasus Gagal Bayar Asuransi", description: "Sebuah perusahaan asuransi raksasa gagal bayar klaim, memicu kepanikan massal di sektor keuangan." }
];

export const ACTIONS: Record<Role, Action[]> = {
  'Pemerintah': [
    {
      id: 'gov_bansos',
      name: 'Bagi-Bagi Sembako Darurat',
      description: 'Membagikan bantuan langsung ke masyarakat bawah untuk meredam protes.',
      effects: { mood: 2, kas: -2, chaos: -1 }
    },
    {
      id: 'gov_tax',
      name: 'Pungut Pajak Barang Tersier',
      description: 'Menaikkan pajak barang non-kebutuhan pokok untuk menambah kas.',
      effects: { kas: 2, mood: -2, chaos: 1 }
    },
    {
      id: 'gov_project',
      name: 'Proyek Infrastruktur',
      description: 'Membangun fasilitas publik skala besar. Butuh biaya tapi bagus buat bisnis.',
      effects: { kas: -3, cuanPengusaha: 2, mood: 1 }
    }
  ],
  'Bank Sentral': [
    {
      id: 'cb_print',
      name: 'Cetak Uang Tambahan',
      description: 'Solusi instan menambah likuiditas negara, berisiko menurunkan nilai mata uang.',
      effects: { kas: 2, chaos: 2, mood: -1 }
    },
    {
      id: 'cb_rate',
      name: 'Naikkan Suku Bunga',
      description: 'Mengerem peredaran uang dengan membuat cicilan KPR dan kredit modal lebih mahal.',
      effects: { chaos: -2, mood: -2, kas: 1 }
    },
    {
      id: 'cb_pinjol',
      name: 'Longgarkan Aturan Kredit',
      description: 'Mempermudah warga mengambil pinjaman di bank maupun lembaga keuangan lain.',
      effects: { mood: 2, chaos: 1, kas: -1 }
    }
  ],
  'Pengusaha': [
    {
      id: 'ent_ai',
      name: 'Otomatisasi Pabrik',
      description: 'Mengganti sebagian pekerja dengan mesin untuk efisiensi biaya jangka panjang.',
      effects: { cuanPengusaha: 3, mood: -2, chaos: 1 }
    },
    {
      id: 'ent_monopoly',
      name: 'Kurangi Porsi, Harga Tetap',
      description: 'Menyusutkan ukuran produk (shrinkflation) agar profit margin tetap terjaga.',
      effects: { cuanPengusaha: 2, mood: -2, chaos: 1 }
    },
    {
      id: 'ent_bribe',
      name: 'Minta Insentif Pajak',
      description: 'Melobi pemerintah untuk mendapatkan keringanan pajak demi bertahan.',
      effects: { cuanPengusaha: 2, kas: -2, chaos: 1 }
    }
  ],
  'Serikat Buruh': [
    {
      id: 'lab_demo',
      name: 'Tuntut Kenaikan UMR 15%',
      description: 'Mengajukan tuntutan kenaikan upah minimum agar seimbang dengan harga kebutuhan.',
      effects: { penaltyPengusaha: 1, chaos: 1, mood: 1 }
    },
    {
      id: 'lab_strike',
      name: 'Mogok Kerja Pabrik',
      description: 'Menghentikan proses produksi seharian untuk memaksa pengusaha menuruti tuntutan.',
      effects: { penaltyPengusaha: 2, chaos: 2, kas: -1 }
    },
    {
      id: 'lab_viral',
      name: 'Laporkan Kondisi Kerja',
      description: 'Melaporkan perusahaan yang tidak sesuai standar ke Dinas Tenaga Kerja.',
      effects: { penaltyPengusaha: 1, chaos: 1, cuanPengusaha: -1 }
    }
  ],
  'Masyarakat': [
    {
      id: 'cit_fomo',
      name: 'Ngutang Demi Gengsi',
      description: 'Tetap memaksakan diri membeli barang di luar kemampuan dengan cicilan berbunga.',
      effects: { mood: 1, chaos: 2, kas: -1 }
    },
    {
      id: 'cit_boikot',
      name: 'Protes Jalan Rusak',
      description: 'Warga memblokir jalan umum karena frustrasi infrastruktur daerah tidak diperbaiki.',
      effects: { kas: -2, mood: -1, chaos: 2 }
    },
    {
      id: 'cit_panic',
      name: 'Borong Sembako',
      description: 'Panik membeli stok beras dan minyak begitu ada isu gagal panen atau kelangkaan.',
      effects: { mood: -2, kas: -1, chaos: 2 }
    }
  ]
};
