// Cue sheet: every sound the main screen can make, with what triggers it and what a player sees at
// the same moment (GDD, "Aksesibilitas": every important sound has a visual equivalent, and the game
// is fully playable muted). Files are mapped in public/audio/manifest.json, so the sound designer can
// deliver without touching code. A cue with no file is simply silent.

export type Mood = 'tenang' | 'tegang' | 'krisis';

export const MOODS: Record<Mood, { when: string; brief: string }> = {
  tenang: { when: 'Lobi, briefing, dan tahun dengan Keresahan 0–4', brief: 'Brass ringan dan kendang santai, tempo jalan kaki. Satir, bukan komedi slapstick.' },
  tegang: { when: 'Keresahan 5–6, atau fase tebak agenda', brief: 'Motif yang sama, kendang lebih rapat, bass berdenyut. Ada rasa menunggu.' },
  krisis: { when: 'Keresahan 7 ke atas, atau satu indikator di zona kolaps', brief: 'Motif yang sama dalam minor, brass sumbang, perkusi kerumunan. Tidak boleh menakutkan untuk anak SMA.' },
};

export type CueId =
  | 'gabung' | 'briefing'
  | 'fase.krisis' | 'fase.rapat' | 'fase.lobi' | 'fase.pengesahan' | 'fase.pengungkapan' | 'fase.koran'
  | 'sah' | 'pakta.sepakat'
  | 'kartu.buka' | 'sebab.baik' | 'sebab.buruk' | 'pakta.tepat' | 'pakta.robek' | 'bahaya' | 'kolaps'
  | 'waktu.hampir' | 'jeda' | 'lanjut'
  | 'tebak' | 'akhir.baik' | 'akhir.kolaps'
  | 'halaman' | 'kuis.jawaban';

export interface CueSpec {
  /** What happens in the game. */
  trigger: string;
  /** The foley the sound designer records (GDD: real recordings, not oscillator beeps). */
  sound: string;
  /** The visual that carries the same information when the room is muted. */
  visual: string;
  /** Default gain 0–1 before the master volume. */
  gain: number;
  /** Minimum gap between two plays, so 30 phones joining at once do not machine-gun. */
  throttleMs?: number;
  /** Music drops under this cue. */
  duck?: boolean;
}

export const CUES: Record<CueId, CueSpec> = {
  gabung: { trigger: 'Pemain baru masuk ruangan', sound: 'Paku payung ditekan ke papan gabus', visual: 'Nama muncul di kolom tim', gain: 0.5, throttleMs: 350 },
  briefing: { trigger: 'Briefing peran dimulai', sound: 'Amplop cokelat dirobek, kertas ditarik keluar', visual: 'Layar briefing dan hitung mundur', gain: 0.8 },
  'fase.krisis': { trigger: 'Kartu krisis dibuka', sound: 'Mesin ketik cepat lalu bel ruang redaksi', visual: 'Kartu krisis meluncur masuk', gain: 0.9, duck: true },
  'fase.rapat': { trigger: 'Rapat Tim dimulai', sound: 'Kursi digeser, gumam ruang rapat', visual: 'Pertanyaan tim tampil besar', gain: 0.6 },
  'fase.lobi': { trigger: 'Lobi Terbuka dimulai', sound: 'Bel pasar dan obrolan kerumunan naik', visual: 'Meja Lobi', gain: 0.7 },
  'fase.pengesahan': { trigger: 'Pengesahan dimulai', sound: 'Ketukan palu sidang dua kali', visual: 'Kartu status tim menunggu SAH', gain: 0.8 },
  'fase.pengungkapan': { trigger: 'Pengungkapan dimulai', sound: 'Gulungan kendang pendek', visual: 'Kartu keputusan tertutup', gain: 0.8, duck: true },
  'fase.koran': { trigger: 'Halaman depan terbit', sound: 'Mesin cetak berputar lalu koran dilempar ke meja', visual: 'Koran meluncur masuk', gain: 0.9, duck: true },
  sah: { trigger: 'Satu tim mengesahkan keputusan', sound: 'Stempel karet menghantam kertas', visual: 'Cap SAH merah di kartu tim', gain: 0.9, throttleMs: 180 },
  'pakta.sepakat': { trigger: 'Pakta disepakati di Lobi', sound: 'Pulpen menandatangani, kertas dilipat', visual: 'Pakta muncul di Meja Lobi', gain: 0.7 },
  'kartu.buka': { trigger: 'Keputusan satu tim dibuka', sound: 'Kartu dibalik di atas meja', visual: 'Kartu tim terbuka', gain: 0.7 },
  'sebab.baik': { trigger: 'Perubahan indikator yang membaik', sound: 'Koin jatuh ke kaleng', visual: 'Angka hijau dan papan bergerak', gain: 0.6 },
  'sebab.buruk': { trigger: 'Perubahan indikator yang memburuk', sound: 'Map tebal dijatuhkan ke meja', visual: 'Angka merah dan papan bergerak', gain: 0.6 },
  'pakta.tepat': { trigger: 'Pakta ditepati', sound: 'Jabat tangan dan tepukan pundak', visual: 'Pakta hijau "Ditepati +1"', gain: 0.6 },
  'pakta.robek': { trigger: 'Pakta dilanggar', sound: 'Kertas dirobek dua', visual: 'Pakta bergaris merah dan bergetar', gain: 0.8 },
  bahaya: { trigger: 'Indikator masuk zona bahaya', sound: 'Peluit demo dari kejauhan', visual: 'Label Bahaya dan arsir merah di papan', gain: 0.7 },
  kolaps: { trigger: 'Negara kolaps', sound: 'Kerumunan meledak, peluit panjang, toa', visual: 'Spanduk merah "Negara kolaps"', gain: 1, duck: true },
  'waktu.hampir': { trigger: '10 detik terakhir sebuah fase', sound: 'Jam meja berdetak 10 detik', visual: 'Timer berubah merah', gain: 0.5 },
  jeda: { trigger: 'Fasilitator menjeda', sound: 'Peluit wasit pendek', visual: 'Timer bertuliskan Jeda', gain: 0.6, duck: true },
  lanjut: { trigger: 'Fasilitator melanjutkan', sound: 'Peluit wasit dua kali', visual: 'Timer berjalan lagi', gain: 0.6 },
  tebak: { trigger: 'Fase tebak agenda', sound: 'Laci arsip dibuka, map dibalik-balik', visual: 'Layar tebak agenda', gain: 0.7 },
  'akhir.baik': { trigger: 'Permainan berakhir tanpa kolaps', sound: 'Sting brass pendek yang sedikit fals', visual: 'Layar hasil akhir', gain: 0.9, duck: true },
  'akhir.kolaps': { trigger: 'Permainan berakhir dengan kolaps', sound: 'Brass jatuh "wah-wah" dan satu pukulan gong', visual: 'Layar hasil akhir bertanda kolaps', gain: 0.9, duck: true },
  halaman: { trigger: 'Fasilitator pindah bagian debrief', sound: 'Halaman koran dibalik', visual: 'Bagian debrief berganti', gain: 0.5 },
  'kuis.jawaban': { trigger: 'Jawaban kuis dibuka', sound: 'Kapur diketuk dua kali di papan tulis', visual: 'Jawaban benar tampil', gain: 0.6 },
};

export const CUE_IDS = Object.keys(CUES) as CueId[];
