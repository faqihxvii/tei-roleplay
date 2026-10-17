// Pre/post quiz (GDD, "Alat fasilitator": 5 soal di HP). The same five questions before and after
// play, one per learning goal, so the class sees what moved. Draft for the economics editor.

export interface QuizQuestion {
  id: string;
  /** The learning goal or concept it measures (GDD, "Tujuan belajar"). */
  concept: string;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

/** An answer of -1 means "Tidak tahu", which beats a blind guess in a pre-test. */
export const DONT_KNOW = -1;

export const QUIZ: QuizQuestion[] = [
  {
    id: 'moneter',
    concept: 'Kebijakan fiskal dan moneter',
    text: 'Harga-harga naik cepat. Langkah mana yang termasuk kebijakan moneter untuk meredamnya?',
    options: [
      'Pemerintah menambah subsidi BBM',
      'Bank sentral menaikkan suku bunga',
      'Pemerintah menaikkan upah minimum',
      'Pemerintah membangun jalan tol baru',
    ],
    correct: 1,
    explanation: 'Kebijakan moneter dijalankan bank sentral lewat suku bunga dan jumlah uang beredar. Pajak, subsidi, dan belanja negara adalah kebijakan fiskal milik pemerintah.',
  },
  {
    id: 'tertunda',
    concept: 'Dampak kebijakan yang tertunda',
    text: 'Bank sentral menaikkan suku bunga hari ini. Kapan dampak terbesarnya pada harga biasanya terasa?',
    options: [
      'Hari itu juga',
      'Hanya pada harga saham, tidak pada harga barang',
      'Beberapa bulan sampai sekitar setahun kemudian',
      'Tidak pernah berdampak pada harga',
    ],
    correct: 2,
    explanation: 'Kredit, belanja, dan harga menyesuaikan perlahan, jadi dampak bunga butuh waktu. Di permainan, efek kenaikan bunga baru jatuh tempo tahun berikutnya.',
  },
  {
    id: 'hemat',
    concept: 'Paradoks hemat',
    text: 'Semua keluarga serentak berhemat karena takut krisis. Apa yang paling mungkin terjadi pada ekonomi?',
    options: [
      'Penjualan toko turun dan lapangan kerja bisa berkurang',
      'Ekonomi pasti tumbuh karena tabungan naik',
      'Harga-harga pasti naik',
      'Kas negara langsung bertambah',
    ],
    correct: 0,
    explanation: 'Hemat baik untuk satu keluarga, tetapi kalau semua orang berhemat bersamaan, belanja turun, warung sepi, dan pekerjaan berkurang. Ini disebut paradoks hemat (paradox of thrift).',
  },
  {
    id: 'upahHarga',
    concept: 'Konflik kepentingan antarpelaku',
    text: 'Buruh berhasil menuntut upah lebih tinggi, lalu pengusaha menaikkan harga jualnya. Siapa yang ikut menanggung kenaikan upah itu?',
    options: [
      'Hanya pengusaha',
      'Bank sentral',
      'Tidak ada yang menanggung',
      'Konsumen, lewat harga yang lebih mahal',
    ],
    correct: 3,
    explanation: 'Biaya yang naik bisa diteruskan ke harga, sehingga konsumen ikut membayar. Kepentingan buruh, pengusaha, dan masyarakat saling bertabrakan, dan karena itu mereka perlu bernegosiasi.',
  },
  {
    id: 'cetakUang',
    concept: 'APBN, defisit, dan independensi bank sentral',
    text: 'Pemerintah meminta bank sentral mencetak uang untuk menutup defisit APBN. Apa risiko utamanya?',
    options: [
      'Nilai rupiah pasti menguat',
      'Inflasi naik karena uang beredar bertambah lebih cepat daripada barang',
      'Pengangguran langsung hilang',
      'Pajak otomatis turun',
    ],
    correct: 1,
    explanation: 'Uang baru tanpa tambahan barang mendorong harga naik. Karena itu bank sentral dibuat independen dan boleh menolak, seperti kekuatan Bank Sentral di permainan.',
  },
];

/** Count of correct answers; "Tidak tahu" counts as wrong. */
export const quizScore = (answers: number[]): number => answers.filter((a, i) => a === QUIZ[i]!.correct).length;
