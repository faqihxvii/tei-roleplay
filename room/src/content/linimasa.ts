import type { Role } from '../../../engine/src/types';
import type { Archetype, HeadlineTag, Zone } from './koran';

// Linimasa TEI: each year closes as a feed on the made-up platform "Kicau" instead of a newspaper.
// Every account is fictional and clearly parody (no real people, parties, institutions or brands);
// officials speak for the five roles and wear the role caricatures from web/art. Same satire rules
// as content/koran.ts: punch up, and every joke must point at a mechanic the debrief can explain.

export type AccountId =
  | 'harianTei' | 'menteri' | 'gubernur' | 'asosiasi' | 'serikat' | 'buzzer' | 'gosip' | 'dataWarga';

export interface Account {
  handle: string;
  name: string;
  /** The role whose caricature is the avatar; none for media, buzzer and gossip accounts. */
  role: Role | null;
  kind: 'media' | 'pejabat' | 'buzzer' | 'gosip' | 'data';
}

export const ACCOUNTS: Record<AccountId, Account> = {
  harianTei: { handle: 'HarianTEI', name: 'Harian TEI', role: null, kind: 'media' },
  menteri: { handle: 'MenteriSegalaUrusan', name: 'Menteri Segala Urusan', role: 'pemerintah', kind: 'pejabat' },
  gubernur: { handle: 'GubernurBankNegeri', name: 'Gubernur Bank Negeri', role: 'bankSentral', kind: 'pejabat' },
  asosiasi: { handle: 'AsosiasiPengusahaBerkah', name: 'Asosiasi Pengusaha Berkah', role: 'pengusaha', kind: 'pejabat' },
  serikat: { handle: 'KetumSerikatSolid', name: 'Ketum Serikat Solid', role: 'buruh', kind: 'pejabat' },
  buzzer: { handle: 'BuzzerPlatMerah', name: 'Pendukung Garis Keras', role: null, kind: 'buzzer' },
  gosip: { handle: 'AkunGosipEkonomi', name: 'Gosip Ekonomi', role: null, kind: 'gosip' },
  dataWarga: { handle: 'DataWarga', name: 'Data Warga', role: null, kind: 'data' },
};

/** Citizen voices (content/koran.ts VOICES) post under these handles. */
export const VOICE_HANDLES: Record<Archetype, string> = {
  warung: 'BuTiniWarung',
  ojol: 'MasDediNarik',
  mahasiswa: 'RaniRantau',
  pensiunan: 'PakHarunPensiun',
  umkm: 'BuSariKonfeksi',
  buruh: 'JokoShiftMalam',
};

/** The official who answers each headline tag, with two spin lines (the gap between spin and data is the joke). */
export const SPIN: Record<HeadlineTag, { account: AccountId; lines: [string, string] }> = {
  kolaps_bangkrut: { account: 'menteri', lines: [
    'Kas negara tidak habis, hanya sedang beristirahat. Mohon warga tidak menyebar narasi "bangkrut". Istilah resminya: likuiditas sedang introspeksi.',
    'Kami tegaskan negara masih punya aset: semangat, gotong royong, dan beberapa kursi rapat. Rekening kosong itu soal teknis.',
  ] },
  kolaps_lengser: { account: 'menteri', lines: [
    'Kami tidak lengser, kami melakukan rotasi posisi duduk secara permanen. Terima kasih atas masukan yang sangat... lantang.',
    'Kepercayaan publik nol bukan berarti gagal. Artinya ruang untuk tumbuh sangat besar. Sampai jumpa di periode berikutnya.',
  ] },
  kolaps_anarki: { account: 'menteri', lines: [
    'Situasi kondusif terkendali. Yang terlihat di jalan itu bukan kerusuhan, melainkan partisipasi publik dengan intensitas tinggi.',
    'Kami imbau warga tetap tenang dan tidak mudah terprovokasi oleh kenyataan.',
  ] },
  kolaps_hiperinflasi: { account: 'gubernur', lines: [
    'Harga naik setiap jam menunjukkan ekonomi sangat dinamis. Kami sedang mengkaji apakah angka nol di uang kertas perlu dikurangi atau ditambah.',
    'Inflasi tinggi adalah fenomena global. Bahwa negara lain tidak mengalaminya, itu karena mereka kurang global.',
  ] },
  pakta_dilanggar: { account: 'menteri', lines: [
    'Kesepakatan itu bersifat aspiratif, bukan mengikat. Kalau mengikat, namanya kontrak, dan kontrak butuh pengacara.',
    'Kami menyayangkan ada pihak yang ingkar janji. Pihak yang dimaksud tentu bukan kami, kecuali kalau iya.',
  ] },
  mogok: { account: 'serikat', lines: [
    'Mogok ini bukan berhenti bekerja. Kami sedang memperlihatkan seberapa penting pekerjaan kami dengan cara tidak melakukannya.',
    'Kepada yang bilang mogok merugikan ekonomi: betul. Itu sebabnya upah kami penting untuk ekonomi.',
  ] },
  lobi_terbongkar: { account: 'asosiasi', lines: [
    'Amplop yang beredar adalah bentuk silaturahmi bisnis. Kebetulan isinya tebal karena silaturahminya erat.',
    'Kami menghormati proses hukum dan akan kooperatif, terutama dalam mencari siapa yang membocorkan.',
  ] },
  lobi_lolos: { account: 'asosiasi', lines: [
    'Insentif yang kami terima murni hasil dialog konstruktif. Dialognya kebetulan di restoran, tagihannya kebetulan bukan kami yang bayar.',
    'Tidak ada lobi. Yang ada hanya pertemuan rutin yang kebetulan selalu menghasilkan keputusan menguntungkan.',
  ] },
  tolak_cetak_uang: { account: 'gubernur', lines: [
    'Kami menolak mencetak uang demi menjaga nilai rupiah. Pemerintah boleh kecewa; dompet warga yang berterima kasih, tahun depan.',
    'Mesin cetak kami sedang diservis. Servisnya berlangsung selama pemerintah masih minta dicetakkan.',
  ] },
  cetak_uang: { account: 'gubernur', lines: [
    'Pencetakan uang dilakukan secara terukur. Ukurannya: sampai kas pemerintah cukup. Efek ke harga baru terasa tahun depan, jadi bukan urusan tahun ini.',
    'Uang baru ini sah dan wangi. Bahwa nilainya turun, itu soal persepsi pasar yang terlalu sensitif.',
  ] },
  phk: { account: 'asosiasi', lines: [
    'Kami tidak melakukan PHK. Kami memberi kesempatan karyawan untuk mengeksplorasi potensi di luar perusahaan.',
    'Efisiensi tenaga kerja adalah langkah strategis demi keberlanjutan. Keberlanjutan siapa, itu rahasia dagang.',
  ] },
  harga_bahaya: { account: 'gubernur', lines: [
    'Harga memang naik, tapi daya beli tetap terjaga. Terjaga dari jauh, oleh petugas keamanan.',
    'Kenaikan harga ini bersifat sementara. Definisi sementara kami: sampai harga berikutnya naik lagi.',
  ] },
  keresahan_tinggi: { account: 'menteri', lines: [
    'Keresahan warga kami tanggapi serius. Tim khusus sudah dibentuk untuk mendata siapa saja yang resah.',
    'Warga yang mengeluh menunjukkan demokrasi berjalan. Kami ingin demokrasi berjalan sedikit lebih pelan.',
  ] },
  kas_kritis: { account: 'menteri', lines: [
    'Kas tipis bukan krisis, melainkan diet anggaran. Negara sedang menuju bentuk ideal.',
    'Kami pastikan gaji pejabat aman. Ini penting agar pejabat tetap tenang mengurus kas yang tidak aman.',
  ] },
  bunga_naik: { account: 'gubernur', lines: [
    'Bunga naik untuk meredam inflasi. Efeknya terasa tahun depan. Cicilan Anda terasa sekarang, tapi itu efek samping yang terhormat.',
    'Kepada pemilik cicilan motor: kami mendengar Anda. Kami hanya memilih untuk tidak mendengarkan.',
  ] },
  bunga_turun: { account: 'gubernur', lines: [
    'Bunga turun agar kredit mengalir dan lapangan kerja tumbuh. Kalau harga ikut naik tahun depan, mohon salahkan tahun depan.',
    'Uang murah adalah hadiah kami untuk perekonomian. Struknya kami kirim belakangan dalam bentuk inflasi.',
  ] },
  harga_naik_pengusaha: { account: 'asosiasi', lines: [
    'Penyesuaian harga dilakukan karena biaya produksi. Biaya produksinya termasuk mempertahankan margin kami yang sudah terbiasa nyaman.',
    'Harga tidak naik, nilai produk kami yang meningkat. Isinya memang berkurang, tapi kualitas kenangannya bertambah.',
  ] },
  upah_tinggi: { account: 'serikat', lines: [
    'Kenaikan upah adalah hak, bukan hadiah. Kalau pengusaha bilang tidak mampu, kami minta lihat dulu mobil direkturnya.',
    'Upah naik membuat buruh bisa belanja, belanja membuat pabrik laku. Ekonomi itu lingkaran, bukan tangga untuk bos saja.',
  ] },
  pajak_naik: { account: 'menteri', lines: [
    'Pajak naik adalah wujud cinta tanah air. Semakin besar pajak Anda, semakin besar cinta Anda. Mohon cinta dibayar tepat waktu.',
    'Kenaikan pajak tidak membebani rakyat kecil, karena rakyat kecil memang sudah tidak punya apa-apa untuk dipajaki.',
  ] },
  pajak_turun: { account: 'menteri', lines: [
    'Pajak turun sebagai hadiah untuk warga. Kas negara menipis sebagai hadiah untuk menteri berikutnya.',
    'Dengan pajak turun, kami percaya warga akan membelanjakan uangnya. Kami juga percaya kas akan terisi sendiri, entah bagaimana.',
  ] },
  konsumsi_hemat: { account: 'menteri', lines: [
    'Warga yang berhemat adalah warga teladan. Kami hanya berharap teladannya tidak terlalu banyak, karena toko-toko mulai sepi.',
    'Kami apresiasi gerakan hemat warga. Pabrik yang tutup karena tidak ada pembeli juga ikut hemat listrik.',
  ] },
  konsumsi_belanja: { account: 'menteri', lines: [
    'Warga belanja, ekonomi bergerak! Kalau tabungan habis, anggap saja itu investasi pada perekonomian nasional.',
    'Pusat belanja ramai membuktikan rakyat sejahtera. Antrean di loket pinjaman sebelah tidak usah dihitung.',
  ] },
  investigasi: { account: 'menteri', lines: [
    'Kami menyambut baik investigasi warga. Kami juga menyambut baik jika investigasinya berhenti sampai di sini saja.',
    'Temuan warga akan kami tindak lanjuti dengan membentuk tim untuk menindaklanjuti tim yang menindaklanjuti.',
  ] },
  viral: { account: 'menteri', lines: [
    'Video yang beredar dipotong dari konteks. Konteks lengkapnya lebih buruk, jadi kami sarankan tetap pakai yang dipotong.',
    'Kami mohon maaf jika ada yang tersinggung. Kami tidak mohon maaf atas yang membuat tersinggung.',
  ] },
  investasi: { account: 'asosiasi', lines: [
    'Investasi pabrik baru adalah bukti kepercayaan kami pada negeri ini. Kepercayaan ini akan cair menjadi keuntungan tahun depan, untuk kami.',
    'Kami membuka lapangan kerja baru. Lowongannya terbatas, syaratnya pengalaman sepuluh tahun untuk umur dua puluh.',
  ] },
  infrastruktur: { account: 'menteri', lines: [
    'Jalan dibangun hari ini, manfaatnya dirasakan tahun depan, pitanya kami gunting hari ini juga. Itu namanya visi.',
    'Proyek ini mahal karena berkualitas. Kualitasnya bisa dilihat dari jumlah baliho peresmiannya.',
  ] },
  bansos: { account: 'menteri', lines: [
    'Bantuan sosial disalurkan tepat sasaran. Sasarannya tepat di depan kamera saat pembagian.',
    'Bansos adalah bentuk kehadiran negara. Negara hadir setiap menjelang pemilu, dan sangat hadir di stiker karungnya.',
  ] },
  subsidi: { account: 'menteri', lines: [
    'Subsidi untuk rakyat kecil. Kalau yang paling banyak menikmati pemilik mobil besar, itu karena tangkinya juga besar.',
    'Harga kami tahan demi rakyat. Biayanya kami ambil dari kas, yang kebetulan juga milik rakyat. Adil, kan?',
  ] },
  kerja_naik: { account: 'menteri', lines: [
    'Lapangan kerja bertambah berkat kebijakan kami. Kalau ternyata berkat kebijakan tahun lalu, itu juga kebijakan kami, kan satu gedung.',
    'Pengangguran turun drastis. Definisi bekerja kami perluas: membantu tetangga angkat galon kini dihitung.',
  ] },
  kerja_turun: { account: 'menteri', lines: [
    'Warga yang kehilangan pekerjaan sedang mengalami transisi karier. Kami doakan transisinya singkat dan tidak menyalahkan kami.',
    'Pengangguran naik karena warga terlalu selektif memilih pekerjaan. Contohnya: memilih pekerjaan yang ada gajinya.',
  ] },
  kepercayaan_naik: { account: 'menteri', lines: [
    'Survei membuktikan kepercayaan publik naik. Respondennya kami pilih secara acak dari daftar pegawai kementerian.',
    'Terima kasih atas kepercayaannya. Kepercayaan ini akan kami simpan baik-baik dan kami pakai di saat-saat yang membutuhkan alasan.',
  ] },
  kepercayaan_turun: { account: 'menteri', lines: [
    'Turunnya kepercayaan publik adalah akibat komunikasi yang kurang. Solusinya: konferensi pers yang lebih panjang.',
    'Kami tidak kehilangan kepercayaan publik. Publik saja yang sedang sibuk percaya pada hal lain.',
  ] },
  tenang: { account: 'menteri', lines: [
    'Tahun ini tidak ada drama. Kami mohon diakui sebagai prestasi, meskipun kami juga tidak tahu kenapa bisa begitu.',
    'Negara tenang dan aman. Kami sudah menyiapkan konferensi pers untuk mengklaim ketenangan ini.',
  ] },
};

/** The buzzer replying to the official, by how the year went. */
export const BUZZER: Record<Zone, string[]> = {
  aman: [
    'Mantap Pak! Yang protes pasti belum baca data. Atau sudah baca tapi iri.',
    'Negara lain sibuk krisis, kita sibuk bersyukur. Terima kasih Pak!',
    'Kerja nyata, bukan kerja kata. Yang nyinyir silakan bikin negara sendiri.',
    'Angkanya hijau semua, hati saya juga ikut hijau. Lanjutkan Pak!',
    'Saya tidak paham ekonomi, tapi saya paham ini prestasi luar biasa.',
  ],
  bahaya: [
    'Harga naik itu tanda ekonomi hidup. Mati itu kalau harga tidak bergerak sama sekali. Belajar dong!',
    'Yang mengeluh pasti tidak pernah bersyukur. Saya bersyukur, tolong yang lain menyesuaikan.',
    'Ini semua salah tahun lalu, salah cuaca, dan salah warga yang terlalu banyak bertanya.',
    'Tenang saudara-saudara, Bapak pasti punya rencana. Kami belum tahu rencananya, tapi pasti ada.',
    'Kalau tidak bisa membantu, setidaknya jangan bikin trending yang negatif. Patriot dong.',
  ],
  kolaps: [
    'Negara kolaps? Ini justru kesempatan memulai lembaran baru. Visioner sekali Bapak!',
    'Yang menyebut ini kegagalan pasti antek asing. Ini cuma penyesuaian yang agak dalam.',
    'Saya tetap mendukung Bapak, meskipun rumah saya sudah tidak ada listrik untuk mengetik ini.',
    'Krisis adalah peluang. Peluang untuk diam dan percaya pada pemimpin.',
    'Mantap Pak! Gelap total artinya kita hemat energi. Langkah hijau yang berani!',
  ],
};

/** The gossip account's take, by how the year went. */
export const GOSIP: Record<Zone, string[]> = {
  aman: [
    'Katanya tahun ini aman, tapi kenapa ada pejabat yang mendadak ganti mobil? Tanya buat teman 👀',
    'Bisik-bisik dari lantai sembilan: rapatnya cuma 10 menit, makan siangnya 3 jam.',
    'Tahun tenang, tapi grup arisan pejabat ramai bahas liburan. Hmm.',
    'Ada yang tahu kenapa laporan keuangannya baru keluar setelah semua sibuk merayakan? 🤔',
    'Spill dikit: yang paling keras klaim prestasi justru yang paling jarang datang rapat.',
  ],
  bahaya: [
    'Katanya ada rapat sampai subuh, tapi kok notulennya kosong? 👀',
    'Sumber terpercaya: rencana darurat ternyata cuma satu slide, isinya logo.',
    'Harga naik, tapi kantin kementerian masih harga lama. Sumbernya dari mana nih?',
    'Kabarnya ada pejabat yang diam-diam borong beras sebelum pengumuman. Kebetulan sekali ya 🤭',
    'Rapat koordinasi diundur lagi karena para peserta sibuk koordinasi liburan.',
  ],
  kolaps: [
    'Saat negara kolaps, ada yang sudah transfer tabungan ke luar negeri seminggu sebelumnya. Feeling-nya tajam ya 👀',
    'Yang kemarin bilang "semua terkendali" sekarang tidak bisa dihubungi. Nomornya terkendali juga, tidak aktif.',
    'Bocoran: kantor kosong, tapi printer masih menyala mencetak surat pengunduran diri.',
    'Gedung kementerian gelap, kecuali satu ruangan: ruang penghancur dokumen.',
    'Spill: pidato "negara kuat" kemarin ternyata hasil salin dari pidato lima tahun lalu.',
  ],
};

/** One trending hashtag per headline tag, without the "#". */
export const HASHTAGS: Record<HeadlineTag, string> = {
  kolaps_bangkrut: 'NegaraNgutangSeumurHidup',
  kolaps_lengser: 'MundurBukanMenyerah',
  kolaps_anarki: 'KondusifKatanya',
  kolaps_hiperinflasi: 'UangKertasJadiBungkus',
  pakta_dilanggar: 'JanjiTinggalJanji',
  mogok: 'PabrikSepiSuaraRamai',
  lobi_terbongkar: 'AmplopTebalKetahuan',
  lobi_lolos: 'AmplopAmanSentosa',
  tolak_cetak_uang: 'MesinCetakDikunci',
  cetak_uang: 'UangBaruHargaBaru',
  phk: 'EfisiensiKatanya',
  harga_bahaya: 'GajiTetapHargaTerbang',
  keresahan_tinggi: 'WargaSudahLelah',
  kas_kritis: 'KasTinggalReceh',
  bunga_naik: 'CicilanMencekik',
  bunga_turun: 'UangMurahTagihanNanti',
  harga_naik_pengusaha: 'IsinyaMakinSedikit',
  upah_tinggi: 'UpahLayakBukanMimpi',
  pajak_naik: 'CintaDibayarPajak',
  pajak_turun: 'PajakTurunKasMenangis',
  konsumsi_hemat: 'HematSampaiTokoTutup',
  konsumsi_belanja: 'BelanjaDuluMikirNanti',
  investigasi: 'WargaJadiDetektif',
  viral: 'KlarifikasiBesokPagi',
  investasi: 'PanenTahunDepan',
  infrastruktur: 'JalanJadiKasHabis',
  bansos: 'StikerLebihBesar',
  subsidi: 'SubsidiBuatTangkiBesar',
  kerja_naik: 'KerjaAdaGajiTipis',
  kerja_turun: 'TransisiKarierMassal',
  kepercayaan_naik: 'SurveiInternalAman',
  kepercayaan_turun: 'TrustIssueNasional',
  tenang: 'TahunTanpaDrama',
};
