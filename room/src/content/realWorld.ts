// "Di Dunia Nyata" cards: one real event per crisis card, with its source (GDD, "Mode debrief").
// Draft researched October 2026; every source page was opened. The economics editor still checks each
// fact before a pilot (GDD, "Alur produksi konten").

export interface RealWorldNote {
  title: string;
  text: string;
  source: string;
  url: string;
  when: string;
}

export const REAL_WORLD: Partial<Record<string, RealWorldNote>> = {
  c_beras: {
    title: 'Inflasi Beras September 2023 Tertinggi Sejak 2018',
    text: 'BPS mencatat harga beras eceran pada September 2023 naik 5,61% dibanding bulan sebelumnya, tertinggi sejak Februari 2018, dan 18,44% dibanding setahun sebelumnya. Penyebabnya: produksi padi turun karena luas panen menyusut dan dampak El Niño, serta pasokan beras dunia terganggu.',
    source: 'detikFinance (mengutip BPS)',
    url: 'https://finance.detik.com/berita-ekonomi-bisnis/d-6960628/inflasi-beras-september-2023-tembus-5-61-tertinggi-sejak-2018',
    when: '2023',
  },
  c_pupuk: {
    title: 'Ombudsman Temukan Celah Tata Kelola Pupuk Subsidi',
    text: 'Kajian Ombudsman RI (April 2021) menemukan lima potensi maladministrasi dalam tata kelola pupuk bersubsidi, antara lain data petani penerima tidak akurat, akses petani terbatas, penunjukan distributor kurang transparan, dan pengawasan belum efektif. Padahal subsidi pupuk adalah subsidi non-energi terbesar.',
    source: 'Ombudsman Republik Indonesia',
    url: 'https://ombudsman.go.id/artikel/r/temuan-dan-saran-ombudsman-untuk-perbaikan-tata-kelola-pupuk-bersubsidi',
    when: '2021',
  },
  c_minyak: {
    title: 'Subsidi Energi 2022 Melonjak Jadi Rp502,4 Triliun',
    text: 'Ketika harga minyak dunia melonjak pada 2022, pemerintah menaikkan anggaran subsidi dan kompensasi energi (BBM, elpiji, listrik) sekitar tiga kali lipat menjadi Rp502,4 triliun. Harga BBM tetap disesuaikan pada September 2022 karena beban subsidi diperkirakan terus membengkak.',
    source: 'Sekretariat Kabinet RI',
    url: 'https://setkab.go.id/harga-bbm-disesuaikan-menkeu-anggaran-subsidi-energi-tetap-naik/',
    when: '2022',
  },
  c_listrik: {
    title: 'Blackout Besar Jawa Bagian Barat, Agustus 2019',
    text: 'Pada 4 Agustus 2019, listrik padam total (blackout) di Jawa Barat, DKI Jakarta, dan Banten, mengganggu telekomunikasi, air bersih, transportasi, dan usaha warga. Investigasi Ombudsman RI menemukan kelalaian pemeliharaan pohon di jalur transmisi dan penyimpangan prosedur di Gardu Induk 500 kV Pemalang.',
    source: 'Ombudsman Republik Indonesia',
    url: 'https://www.ombudsman.go.id/news/r/maladministrasi-pada-peristiwa-blackout-4-agustus-2019',
    when: '2019',
  },
  c_asuransi: {
    title: 'Kasus Jiwasraya: Kerugian Negara Rp16,81 Triliun',
    text: 'Pada Maret 2020, BPK menyatakan kerugian negara dalam kasus PT Asuransi Jiwasraya (Persero) mencapai Rp16,81 triliun. Penyebabnya adalah investasi saham dan reksa dana yang dikelola menyimpang dari aturan selama 2008–2018. Pelajarannya: dana premi nasabah harus diinvestasikan dengan hati-hati.',
    source: 'Badan Pemeriksa Keuangan (BPK) RI',
    url: 'https://www.bpk.go.id/news/kerugian-negara-kasus-jiwasraya-rp1681-triliun',
    when: '2020',
  },
  c_pinjol: {
    title: 'Ratusan Pinjol Ilegal Dihentikan dalam Tiga Bulan',
    text: 'Satgas Pemberantasan Aktivitas Keuangan Ilegal (Satgas PASTI) menghentikan 951 entitas pinjol ilegal hanya dalam periode Januari–Maret 2026. Pinjol ilegal berisiko menimbulkan kerugian, penyalahgunaan data pribadi, dan penagihan yang meresahkan. Legalitas pinjaman bisa dicek melalui Kontak OJK 157.',
    source: 'Otoritas Jasa Keuangan (OJK)',
    url: 'https://ojk.go.id/id/berita-dan-kegiatan/info-terkini/Pages/Satgas-PASTI-Hentikan-953-Entitas-Pinjol-Ilegal-dan-Penawaran-Investasi-Ilegal.aspx',
    when: '2026',
  },
  c_phk: {
    title: 'Sritex Pailit, 11.025 Pekerja Kena PHK',
    text: 'Kemnaker mencatat 11.025 pekerja Sritex Group terkena PHK sejak Agustus 2024, setelah Pengadilan Niaga Semarang memutus raksasa tekstil itu pailit. Perusahaan berhenti beroperasi 1 Maret 2025. Pesangon pekerja baru bisa dibayar dari hasil penjualan aset perusahaan.',
    source: 'Bisnis.com (mengutip Kemnaker)',
    url: 'https://ekonomi.bisnis.com/read/20250311/12/1860178/kemnaker-ungkap-sritex-phk-total-11025-pekerja-sejak-agustus-2024',
    when: '2024–2025',
  },
  c_ojol: {
    title: 'Demo Ojol 20 Mei 2025: Tuntut Potongan 10%',
    text: 'Pada 20 Mei 2025, pengemudi ojek daring berdemo di Jakarta dan beramai-ramai mematikan aplikasi. Tuntutan utamanya: potongan aplikator diturunkan dari maksimal 20% menjadi 10%, serta tarif disesuaikan. Status mereka sebagai \'mitra\' membuat penghasilan tidak tetap.',
    source: 'BBC News Indonesia',
    url: 'https://www.bbc.com/indonesia/articles/cj425z82x47o',
    when: '2025',
  },
  c_data: {
    title: 'Ransomware Lumpuhkan Pusat Data Nasional Sementara',
    text: 'Sejak 20 Juni 2024, serangan ransomware Brain Cipher (varian LockBit 3.0) melumpuhkan Pusat Data Nasional Sementara di Surabaya. Ratusan layanan instansi pemerintah terganggu, termasuk imigrasi dan pendaftaran sekolah (PPDB). Peretas meminta tebusan US$8 juta, dan pemerintah menolak membayar.',
    source: 'BBC News Indonesia',
    url: 'https://www.bbc.com/indonesia/articles/cxee2985jrvo',
    when: '2024',
  },
  c_judol: {
    title: 'PPATK: Mayoritas Pemain Judol Berpenghasilan Rendah',
    text: 'PPATK mencatat sekitar 9,79 juta pemain judi online pada 2024, dan 70,7% di antaranya berpenghasilan di bawah Rp5 juta per bulan. Judi online juga memicu kejahatan turunan seperti penipuan, kekerasan, dan jeratan pinjaman online ilegal.',
    source: 'PPATK',
    url: 'https://www.ppatk.go.id/news/read/1473/melalui-promensisko-perkuat-sinergi-untuk-perangi-judi-online.html',
    when: '2024',
  },
  c_rupiah: {
    title: 'Krisis Moneter 1998: Rupiah Ambruk, Ekonomi Menyusut',
    text: 'Saat krisis moneter, hingga Juli 1998 rupiah melemah sekitar 80% dibanding setahun sebelumnya dan inflasi melonjak hingga sekitar 70% per tahun. Sepanjang 1998, ekonomi Indonesia menyusut 13%, penurunan terdalam di antara negara Asia yang dilanda krisis.',
    source: 'International Monetary Fund (IMF)',
    url: 'https://www.elibrary.imf.org/view/journals/002/2004/189/article-A001-en.xml',
    when: '1997–1998',
  },
  c_resesi: {
    title: 'Pandemi 2020: Ekonomi Mitra Dagang Ikut Terkontraksi',
    text: 'Pada kuartal III-2020, di tengah pandemi, ekonomi mitra dagang Indonesia ikut menyusut: Singapura minus 7,0%, Amerika Serikat minus 2,9%, dan Korea Selatan minus 1,3%. Ekonomi Indonesia terkontraksi 3,49% (yoy), setelah kontraksi yang lebih dalam pada kuartal II-2020.',
    source: 'Kantor Staf Presiden (mengutip data BPS)',
    url: 'https://www.ksp.go.id/en/sinyal-pemulihan-indonesia-kontraksi-ekonomi-q-iii-2020-mengecil.html',
    when: '2020',
  },
  // Paket Oktober 2026 (engine/src/content/packs/2026-10.ts): news of 19 September–19 October 2026.
  c_cabai: {
    title: 'Cabai dan Ayam Pemicu Inflasi September 2026',
    text: 'BPS mencatat inflasi September 2026 sebesar 0,30% secara bulanan dan 3,28% secara tahunan. Pendorong utamanya cabai rawit (andil 0,08%), cabai merah (0,06%), daging ayam ras (0,05%), dan beras (0,03%). Kelompok makanan, minuman, dan tembakau naik 0,88%.',
    source: 'CNBC Indonesia (mengutip BPS)',
    url: 'https://www.cnbcindonesia.com/news/20261001111720-4-772441/biang-kerok-inflasi-september-cabai-rawit-merah-daging-ayam',
    when: '2026',
  },
  c_makansiang: {
    title: 'Keracunan Berulang di Program Makan Bergizi Gratis',
    text: 'Pada 24 September 2026, puluhan siswa dua SD di Lampung Tengah dilarikan ke puskesmas karena mual dan pusing seusai menyantap menu Makan Bergizi Gratis; 33 siswa ditangani dan empat dirujuk ke rumah sakit. Dapur penyedianya dihentikan sementara. Kejadian serupa sudah berulang di Lampung sejak Juli.',
    source: 'Kompas.id',
    url: 'https://www.kompas.id/artikel/puluhan-siswa-di-lampung-tengah-alami-gejala-keracunan-makanan-masalah-berulang-program-mbg',
    when: '2026',
  },
  c_antrebbm: {
    title: 'Bali Beli Bensin Pakai Ganjil-Genap',
    text: 'Pertengahan Oktober 2026, antrean BBM di Bali mencapai 700 meter hingga lebih dari satu kilometer. Pembelian diatur ganjil-genap berdasarkan nomor kendaraan hingga 23 Oktober, dan sebuah universitas sempat kuliah daring. Kelangkaan serupa terjadi di Sumatra pada Juli dan Makassar pada September.',
    source: 'BBC News Indonesia',
    url: 'https://www.bbc.com/indonesia/articles/c6kgle0k20nlo',
    when: '2026',
  },
  c_pinjolguru: {
    title: 'Guru Terbanyak di Antara Korban Pinjol',
    text: 'Dalam sebuah diskusi publik pada Oktober 2026 disebutkan sekitar 45 juta warga Indonesia terdampak pinjaman online, dan 42% di antaranya berprofesi sebagai guru. Bunga pinjol disebut bisa mencapai 0,3% per hari, sehingga literasi keuangan dan perlindungan konsumen dinilai mendesak.',
    source: 'RM.id',
    url: 'https://rm.id/baca-berita/parpol/330044/sarankan-perkuat-literasi-keuangan-nasdem-sedih-guru-banyak-terjerat-pinjol',
    when: '2026',
  },
  c_phkmassal: {
    title: '63.789 Pekerja Kena PHK hingga September 2026',
    text: 'Data Kementerian Ketenagakerjaan mencatat 63.789 pekerja melaporkan terkena PHK sepanjang Januari–September 2026. Jawa Barat menjadi provinsi dengan laporan terbanyak, yakni 13.044 orang, disusul provinsi industri lain seperti Banten dan Jawa Timur. Angka ini masih bisa bertambah.',
    source: 'Bisnis.com (mengutip Kemnaker)',
    url: 'https://ekonomi.bisnis.com/read/20261012/12/2011713/badai-phk-membayangi-ri-63789-pekerja-terdampak-hingga-september-2026',
    when: '2026',
  },
  c_potongan: {
    title: 'Perpres Batasi Potongan Aplikasi Ojol 8 Persen',
    text: 'Pada Oktober 2026 pemerintah menerbitkan Perpres Nomor 27 Tahun 2026 tentang perlindungan pengemudi transportasi daring. Potongan aplikator atas pendapatan pengemudi dibatasi 8 persen, turun dari sekitar 20 persen. Aturan ini juga mengatur tarif dan jaminan sosial pengemudi.',
    source: 'Kompas.com',
    url: 'https://nasional.kompas.com/read/2026/10/08/12310771/perpres-ojol-terbit-potongan-aplikator-8-persen',
    when: '2026',
  },
  c_bursa: {
    title: 'MSCI Tinjau Status Bursa, IHSG dan Rupiah Terjun',
    text: 'Pada 16 Oktober 2026, IHSG anjlok lebih dari 11% dan rupiah sempat menyentuh Rp18.000 per dolar AS. Pemicunya, MSCI mengusulkan menurunkan klasifikasi pasar saham Indonesia dari Emerging Market menjadi Standalone Market karena kekhawatiran soal kemudahan investasi dan transparansi.',
    source: 'CNBC Indonesia',
    url: 'https://www.cnbcindonesia.com/market/20261016092937-17-776724/ihsg-anjlok-11-rupiah-tembus-rp-18000-ini-penyebabnya',
    when: '2026',
  },
};
