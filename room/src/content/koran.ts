// Harian TEI copy, draft v0. Satire rules from the GDD ("Pedoman menulis satir"): punch up,
// no real people, parties, institutions or brands, and every joke must be explainable in the debrief.
// The GDD asks for at least 8 variants per tag; this draft has 2–3 and is marked for the writers' room.

export type HeadlineTag =
  | 'kolaps_bangkrut' | 'kolaps_lengser' | 'kolaps_anarki' | 'kolaps_hiperinflasi'
  | 'pakta_dilanggar' | 'mogok' | 'lobi_terbongkar' | 'lobi_lolos' | 'tolak_cetak_uang' | 'cetak_uang' | 'phk'
  | 'harga_bahaya' | 'keresahan_tinggi' | 'kas_kritis'
  | 'bunga_naik' | 'bunga_turun' | 'harga_naik_pengusaha' | 'upah_tinggi' | 'pajak_naik' | 'pajak_turun'
  | 'konsumsi_hemat' | 'konsumsi_belanja' | 'investigasi' | 'viral'
  | 'investasi' | 'infrastruktur' | 'bansos' | 'subsidi'
  | 'kerja_naik' | 'kerja_turun' | 'kepercayaan_naik' | 'kepercayaan_turun' | 'tenang';

/** How newsworthy each tag is; the top two fill the headline and subheadline. */
export const TAG_WEIGHT: Record<HeadlineTag, number> = {
  kolaps_bangkrut: 100, kolaps_lengser: 100, kolaps_anarki: 100, kolaps_hiperinflasi: 100,
  pakta_dilanggar: 40, mogok: 30, lobi_terbongkar: 30, tolak_cetak_uang: 26, cetak_uang: 24, phk: 24,
  harga_bahaya: 22, keresahan_tinggi: 22, kas_kritis: 20,
  bunga_naik: 16, harga_naik_pengusaha: 15, upah_tinggi: 14, pajak_naik: 14,
  kerja_turun: 13, kepercayaan_turun: 13, bunga_turun: 12, konsumsi_hemat: 12, investigasi: 12,
  kerja_naik: 11, pajak_turun: 10, viral: 10, investasi: 10, infrastruktur: 10, kepercayaan_naik: 10,
  konsumsi_belanja: 9, bansos: 9, subsidi: 9, lobi_lolos: 6, tenang: 1,
};

/** Slots: {pelanggar} and {korban} name the teams in a broken pact. */
export const HEADLINES: Record<HeadlineTag, string[]> = {
  kolaps_bangkrut: [
    'Kas Negara Tinggal Debu, Menteri Minta Rakyat Patungan',
    'Brankas Negara Kosong, Satpamnya Ikut Dirumahkan',
    'Negara Resmi Bangkrut; Rapat Darurat Digelar di Kafe karena Listrik Kantor Diputus',
  ],
  kolaps_lengser: [
    'Kepercayaan Habis, Kabinet Pamit Lewat Pintu Belakang',
    'Survei Kepuasan: Nol Persen, Margin Kesalahan Juga Nol',
    'Pemerintah Lengser; Spanduk "Kerja Nyata" Diturunkan Diam-Diam',
  ],
  kolaps_anarki: [
    'Jalanan Membara, Semua Pihak Sibuk Menyalahkan Pihak Lain',
    'Kota Lumpuh, Rapat Koordinasi Ditunda Sampai Waktu yang Tidak Ditentukan',
    'Anarki Pecah; Para Pejabat Mendadak Ada Urusan di Luar Negeri',
  ],
  kolaps_hiperinflasi: [
    'Harga Naik Tiap Jam, Pedagang Ganti Label Pakai Spidol Papan Tulis',
    'Uang Satu Karung Cukup untuk Satu Kantong Belanja',
    'Hiperinflasi: Warga Mulai Bayar Parkir dengan Telur',
  ],
  pakta_dilanggar: [
    'Kemarin Salaman, Hari Ini Saling Tunjuk: Janji {pelanggar} kepada {korban} Menguap',
    '{korban} Merasa Ditikung, {pelanggar} Bilang "Itu Cuma Kesepakatan Lisan"',
    'Pakta di Meja Lobi Robek; {pelanggar} Disebut Paling Licin Tahun Ini',
  ],
  mogok: [
    'Mesin Berhenti, Spanduk Bergerak: Buruh Turun ke Jalan',
    'Pabrik Sepi, Halaman Kantor Penuh: Mogok Nasional Dimulai',
    'Serikat Buruh Mogok; Bos Pabrik Mendadak Ingat Nomor Telepon Ketua Serikat',
  ],
  lobi_terbongkar: [
    'Amplop Tebal Tertangkap Kamera, Semua Pihak Mengaku Lupa',
    'Lobi Pengusaha Terbongkar; Juru Bicara: "Itu Uang Konsumsi Rapat"',
    'Rapat di Lapangan Golf Ternyata Bukan Soal Golf',
  ],
  lobi_lolos: [
    'Keringanan Pajak Turun Tanpa Pengumuman, Tidak Ada yang Bertanya',
    'Rapat Tertutup Berjalan Lancar, Notulennya Juga Tertutup',
  ],
  tolak_cetak_uang: [
    'Bank Sentral Menolak Cetak Uang: "Mesinnya Bukan Mainan"',
    'Permintaan Cetak Uang Ditolak, Menteri Pulang dengan Tas Kosong',
    'Gubernur Bank Tegas Bilang Tidak; Pasar Lega, Kabinet Cemberut',
  ],
  cetak_uang: [
    'Mesin Cetak Uang Lembur, Harga Diam-Diam Ikut Lembur',
    'Uang Baru Mengalir; Warga Senang Seminggu, Pedagang Senang Selamanya',
    'Kas Terisi dari Mesin Cetak; Ekonom Mulai Membuka Buku Sejarah',
  ],
  phk: [
    'Pabrik Pasang Mesin Baru, Karyawan Pasang Status "Open to Work"',
    'PHK Massal Diumumkan Lewat Surel Pukul 23.59',
    'Efisiensi Tercapai: Laba Naik, Kursi Kantin Kosong',
  ],
  harga_bahaya: [
    'Harga Cabai Lebih Pedas dari Rasanya',
    'Porsi Nasi Warteg Menyusut, Harganya Tidak',
    'Daftar Belanja Makin Pendek, Struknya Tetap Panjang',
  ],
  keresahan_tinggi: [
    'Grup WhatsApp Keluarga Mulai Bahas Politik, Tanda Bahaya Tingkat Tinggi',
    'Warga Resah, Pejabat Menenangkan dengan Konferensi Pers Tiga Jam',
    'Spanduk Protes Lebih Laris dari Spanduk Diskon',
  ],
  kas_kritis: [
    'Kas Negara Menipis, Rapat Kabinet Kini Bawa Bekal Sendiri',
    'Menteri Keuangan Mulai Mengecek Saldo Sebelum Tidur',
    'Anggaran Darurat Habis untuk Rapat Membahas Anggaran Darurat',
  ],
  bunga_naik: [
    'Bunga Naik, Cicilan Motor Ikut Naik Pitam',
    'Bank Sentral Injak Rem; Pengusaha Mengeluh Mobilnya Mogok di Tanjakan',
    'Kredit Makin Mahal, Calon Pengantin Tunda Beli Rumah Lagi',
  ],
  bunga_turun: [
    'Bunga Turun, Kredit Mengalir, Spanduk "Cicilan Ringan" Kembali Bermunculan',
    'Bank Sentral Lepas Rem; Ekonom Berdebat Soal Kapan Harus Mengerem Lagi',
  ],
  harga_naik_pengusaha: [
    'Harga Naik "Menyesuaikan Kondisi", Kondisinya Tidak Dijelaskan',
    'Produsen Naikkan Harga, Ukuran Kemasan Ikut Diet',
    'Label Harga Baru Ditempel di Atas Label Harga Lama yang Belum Kering',
  ],
  upah_tinggi: [
    'Buruh Tuntut Upah Tinggi: "Harga Beras Tidak Ikut Rapat Tripartit"',
    'Tuntutan Upah Naik Tajam, Pengusaha Mendadak Fasih Bicara Daya Saing',
  ],
  pajak_naik: [
    'Pajak Naik, Pemerintah Janji Uangnya Kembali dalam Bentuk Baliho',
    'Tarif Pajak Baru Berlaku; Warga Mulai Hafal Istilah "Basis Pajak"',
    'Kas Negara Bernapas Lega, Dompet Warga Menahan Napas',
  ],
  pajak_turun: [
    'Pajak Turun, Warga Senang, Bendahara Negara Menghitung Ulang Sambil Berkeringat',
    'Pemerintah Pangkas Pajak; Kas Negara Diminta Bersabar',
  ],
  konsumsi_hemat: [
    'Warga Rajin Menabung, Warung Rajin Tutup',
    'Gerakan Masak di Rumah Meluas, Pedagang Kaki Lima Ikut Masak Strategi',
    'Dompet Dikunci Rapat; Pusat Belanja Berubah Jadi Tempat Jalan Pagi',
  ],
  konsumsi_belanja: [
    'Pusat Belanja Penuh, Tabungan Warga Sepi',
    'Diskon Akhir Tahun Datang Lebih Awal, Gaji Datang Seperti Biasa',
  ],
  investigasi: [
    'Warga Jadi Detektif: Aliran Dana Ditelusuri Lewat Utas Panjang',
    'Investigasi Warga Viral; Beberapa Pejabat Mendadak Menghapus Foto Liburan',
  ],
  viral: [
    'Satu Video Dua Menit Mengubah Peta Kepercayaan Publik',
    'Warganet Memutuskan Siapa yang Salah Tahun Ini, Seperti Biasa',
  ],
  investasi: [
    'Pabrik Baru Dibangun, Panennya Dijanjikan Tahun Depan',
    'Investasi Masuk; Peletakan Batu Pertama Lebih Meriah dari Batu Kedua',
  ],
  infrastruktur: [
    'Proyek Jalan Dimulai, Macetnya Sudah Duluan',
    'Pita Digunting, Jembatan Belum Tersambung',
  ],
  bansos: [
    'Bansos Cair, Antrean Mengular, Foto Pejabat Ikut Tercetak di Karung',
    'Bantuan Tunai Sampai ke Warga; Ongkos Ambilnya Setengah Bantuan',
  ],
  subsidi: [
    'Subsidi Menahan Harga, Kas Negara yang Menahan Sakit',
    'Harga di SPBU Tetap, Tagihan Negara Menggunung di Belakang Layar',
  ],
  kerja_naik: [
    'Lowongan Bertambah, Pencari Kerja Akhirnya Bisa Memilih',
    'Pabrik Buka Sif Malam, Warung Kopi Ikut Buka Sif Malam',
  ],
  kerja_turun: [
    'Antrean Bursa Kerja Lebih Panjang dari Antrean Konser',
    'Lapangan Kerja Menyempit, Lapangan Futsal Penuh di Jam Kantor',
  ],
  kepercayaan_naik: [
    'Survei: Warga Mulai Percaya Lagi, Setidaknya Sampai Survei Berikutnya',
    'Kepercayaan Publik Naik; Pemerintah Langsung Pasang Baliho Terima Kasih',
  ],
  kepercayaan_turun: [
    'Kepercayaan Publik Merosot, Humas Kementerian Lembur Bikin Infografis',
    'Warga Tidak Lagi Percaya Siaran Pers, Termasuk yang Benar',
  ],
  tenang: [
    'Tahun yang Tenang; Pengamat Ekonomi Kehabisan Bahan Diskusi',
    'Tidak Ada Krisis Besar, Rapat Kabinet Selesai Tepat Waktu untuk Pertama Kalinya',
  ],
};

/** Two-tag combinations, where the satire is sharpest (GDD examples first). */
export const COMBO_HEADLINES: { tags: [HeadlineTag, HeadlineTag]; text: string }[] = [
  { tags: ['bunga_naik', 'harga_naik_pengusaha'], text: 'Bunga Naik, Harga Tetap Naik: Warga Bingung Siapa yang Sebenarnya Mengerem' },
  { tags: ['pakta_dilanggar', 'phk'], text: 'Kemarin Janji Tak Ada PHK, Hari Ini Pabrik Pasang Mesin Baru' },
  { tags: ['konsumsi_hemat', 'kerja_turun'], text: 'Warga Rajin Menabung, Warung Rajin Tutup, Lowongan Rajin Hilang' },
  { tags: ['mogok', 'phk'], text: 'PHK Dibalas Mogok: Pabrik Sepi dari Dua Arah' },
  { tags: ['cetak_uang', 'harga_bahaya'], text: 'Uang Dicetak, Harga Melompat: Pelajaran Sejarah Diulang Tanpa Diminta' },
  { tags: ['tolak_cetak_uang', 'kas_kritis'], text: 'Kas Menipis, Mesin Cetak Dikunci: Menteri Mulai Menghitung Receh' },
  { tags: ['subsidi', 'kas_kritis'], text: 'Harga Ditahan Subsidi, Kas Negara Ditahan di Ruang Gawat Darurat' },
  { tags: ['pajak_naik', 'kepercayaan_turun'], text: 'Pajak Naik, Kepercayaan Turun: Dua Grafik Bertemu di Tengah Jalan' },
];

export type Archetype = 'warung' | 'ojol' | 'mahasiswa' | 'pensiunan' | 'umkm' | 'buruh';
export type Zone = 'aman' | 'bahaya' | 'kolaps';

/** Each archetype watches one indicator and has a line for each zone (GDD, "Arketipe Suara Warga"). */
export const VOICES: Record<Archetype, { who: string; watches: 'harga' | 'kerja' | 'kepercayaan' | 'keresahan'; lines: Record<Zone, string[]> }> = {
  warung: {
    who: 'Bu Tini, pemilik warung',
    watches: 'harga',
    lines: {
      aman: ['Harga minyak goreng masih wajar. Pelanggan masih berani nambah gorengan.', 'Alhamdulillah, belanja ke pasar masih bisa pakai satu lembar uang.'],
      bahaya: ['Saya sudah tiga kali ganti papan harga bulan ini. Spidolnya yang paling untung.', 'Pelanggan protes porsi mengecil. Saya juga protes, tapi ke siapa?'],
      kolaps: ['Warung saya tutup. Yang buka cuma tukang gadai di sebelah.'],
    },
  },
  ojol: {
    who: 'Mas Dedi, pengemudi ojek daring',
    watches: 'kerja',
    lines: {
      aman: ['Orderan lancar. Kantor-kantor ramai, jadi antar makan siang juga ramai.', 'Lumayan, sekarang bisa narik setengah hari lalu jemput anak.'],
      bahaya: ['Teman-teman yang kena PHK sekarang jadi ojol semua. Orderannya dibagi rame-rame.', 'Aplikasi saya nyala dari subuh, yang order cuma ibu sendiri.'],
      kolaps: ['Bensin tidak terbeli, motor saya parkir. Aplikasinya masih nyala, buat hiburan.'],
    },
  },
  mahasiswa: {
    who: 'Rani, mahasiswa rantau',
    watches: 'kepercayaan',
    lines: {
      aman: ['Kebijakan tahun ini lumayan masuk akal. Dosen saya sampai kehabisan bahan kritik.', 'Akhirnya ada rapat pemerintah yang notulennya bisa dibaca publik.'],
      bahaya: ['Kiriman orang tua telat, katanya harga di kampung naik. Di berita katanya semua terkendali.', 'Kami diskusi di kantin: siapa sebenarnya yang membuat keputusan di negara ini?'],
      kolaps: ['Kuliah diliburkan. Kami belajar ekonomi langsung dari keadaan.'],
    },
  },
  pensiunan: {
    who: 'Pak Harun, pensiunan guru',
    watches: 'harga',
    lines: {
      aman: ['Uang pensiun masih cukup sampai akhir bulan. Itu sudah prestasi.', 'Tabungan saya tidak bertambah, tapi juga tidak menyusut. Saya bersyukur.'],
      bahaya: ['Uang pensiun saya tetap, harga yang tidak tetap. Matematikanya tidak ketemu.', 'Dulu saya mengajar bunga majemuk. Sekarang saya merasakan inflasi majemuk.'],
      kolaps: ['Tabungan empat puluh tahun sekarang cukup untuk beli dua karung beras.'],
    },
  },
  umkm: {
    who: 'Bu Sari, pemilik konfeksi rumahan',
    watches: 'kerja',
    lines: {
      aman: ['Pesanan seragam sekolah banyak. Saya sampai menambah dua penjahit.', 'Orang punya kerja, orang beli baju. Sesederhana itu.'],
      bahaya: ['Pesanan sepi. Mesin jahit saya sekarang lebih sering dipakai buat menambal celana sendiri.', 'Pembeli menawar sampai harga modal. Saya mengerti, mereka juga sedang susah.'],
      kolaps: ['Konfeksi tutup. Penjahit saya pulang kampung, saya ikut.'],
    },
  },
  buruh: {
    who: 'Joko, buruh pabrik',
    watches: 'keresahan',
    lines: {
      aman: ['Lembur ada, gaji cair tepat waktu. Tidak ada yang perlu didemo minggu ini.', 'Suasana pabrik tenang. Grup serikat isinya cuma ucapan ulang tahun.'],
      bahaya: ['Grup serikat ramai sampai tengah malam. Semua orang punya rencana, tidak ada yang punya uang.', 'Kami bukan mau ribut. Kami mau dapur tetap ngebul.'],
      kolaps: ['Pabrik dijaga aparat, kami dijaga utang.'],
    },
  },
};

export const ADS: { tag: HeadlineTag | null; text: string }[] = [
  { tag: 'bunga_naik', text: 'PINJAMAN KILAT! Bunga naik? Bunga kami sudah tinggi dari dulu, jadi tidak terasa. Syarat: KTP dan kesabaran.' },
  { tag: 'harga_bahaya', text: 'DIJUAL: Timbangan digital presisi 0,1 gram. Cocok untuk menimbang cabai dan bawang zaman sekarang.' },
  { tag: 'konsumsi_hemat', text: 'Kursus Online "Hidup dengan Dua Puluh Ribu Sehari". Biaya kursus: dua ratus ribu.' },
  { tag: 'phk', text: 'Seminar Motivasi: "PHK Adalah Awal Petualangan". Pembicara kami masih bekerja tetap.' },
  { tag: 'pajak_naik', text: 'Jasa Konsultan Pajak: kami bantu Anda memahami pajak yang tidak dipahami pembuatnya.' },
  { tag: 'cetak_uang', text: 'Dompet Ekstra Besar Model Terbaru. Muat uang lebih banyak untuk belanja yang sama.' },
  { tag: null, text: 'Baliho Ukuran Raksasa, Siap Cetak Wajah Siapa Saja. Diskon khusus menjelang pemilu.' },
  { tag: null, text: 'Kalender Rapat Koordinasi Tahun Depan: semua tanggal sudah terisi, hasilnya menyusul.' },
];
