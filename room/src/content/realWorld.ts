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
};
