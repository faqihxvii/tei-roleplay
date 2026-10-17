# Panduan art & audio TEI

Untuk ilustrator, animator, sound designer, dan engineer yang memasang aset mereka. Dasarnya adalah GDD, bagian "Art direction & audio" dan "Aksesibilitas & inklusi". Dokumen ini mencatat apa yang sudah ada di kode, dan apa yang harus dikirim agar aset langsung terpasang.

**Status:** identitas tipografi, palet, tekstur, gerak, sistem audio, getaran HP, dan slot ilustrasi sudah ada. File ilustrasi, file Rive, dan rekaman suara belum ada. Sampai file itu dikirim, permainan berjalan utuh tanpa ilustrasi dan tanpa suara.

## Arah

"Koran satir": kartun editorial yang dicetak risograph. Murah diproduksi, mudah dikenali dari bangku belakang, dan sengaja jauh dari kesan template.

Dilarang: gradien dekoratif, glassmorphism, emoji sebagai ikon, ikon generik sebagai visual utama, gambar stok, dan gambar AI (GDD). Audio memakai foley rekaman asli, bukan bunyi beep dari oscillator.

## Yang sudah ada di kode

### Tinta dan kertas

Token ada di `web/src/styles.css` (`:root`).

| Token | Nilai | Dipakai untuk |
| --- | --- | --- |
| `--paper` | `#f4efe3` | Latar krem, dengan serat kertas (`--grain`) sangat tipis |
| `--ink` | `#1a1a1a` | Teks dan garis |
| `--red` | `#c91212` | Merah TEI: krisis, cap SAH, bahaya |
| `--blue` | `#0067a5` | Tinta riso kedua: pelat misregistrasi, fokus keyboard |
| `--newsprint` | `#faf6ec` | Halaman Harian TEI |
| `--highlight` | `#fbe3a6` | Pertanyaan tim, kartu pemandu |

Tekstur dipakai hemat agar teks tetap tajam di proyektor:

- **Halftone:** dipakai di sudut kartu krisis, spanduk kolaps, dan kotak iklan.
- **Misregistrasi:** pelat biru bergeser 0,04 em di bawah headline besar.
- **Serat kertas:** ada di latar. Kontrasnya cukup rendah sehingga teks tetap di atas 4,5:1.

### Huruf

Semua font di-host sendiri lewat npm, sehingga tidak ada permintaan ke layanan luar. Semuanya berlisensi SIL OFL 1.1, yang mengizinkan embed web.

| Peran | Font | Bobot |
| --- | --- | --- |
| Headline, narasi, koran | Libre Caslon Condensed | 400, 400 italic, 700 |
| Teks isi dan UI | Source Sans 3 (variable) | 200–900 |
| Angka: timer, papan, skor, kode ruangan | IBM Plex Mono | 500, 700 |

Hanya subset latin yang diunduh browser, sekitar 130 KB untuk semua font. Muatan awal HP (JS, CSS, dan font) sekitar 220 KB, masih di dalam anggaran 300 KB.

### Warna peran

Setiap peran punya **warna, pola, dan kode huruf**, jadi peran tidak pernah dibedakan oleh warna saja. Kelima warna dipisah lewat terang-gelap, bukan hanya rona. Hasil simulasi buta warna (Machado 2009, keparahan penuh): jarak warna terdekat ΔE ≈ 26 untuk protan, deutan, dan tritan. Palet lama hanya 6,5.

| Peran | Kode | Warna | Teks di atasnya | Pola |
| --- | --- | --- | --- | --- |
| Pemerintah | PEM | `#1b2a41` | putih | garis mendatar (kertas bergaris birokrasi) |
| Bank Sentral | BS | `#0067a5` | putih | kisi (buku besar) |
| Pengusaha | USH | `#e0a100` | hitam | garis miring |
| Serikat Buruh | BRH | `#c91212` | putih | garis tegak |
| Masyarakat | MSY | `#5fb49c` | hitam | titik halftone |

Sumber warna ada di `engine/src/content/roles.ts` (`ROLE_COLOR`, `ROLE_INK`). Kit cetak memakai sumber yang sama. Tes memastikan kontras teks di atas setiap warna peran minimal 4,5:1.

### Gerak

Setiap gerak punya makna (GDD, "Gerak"). Semuanya CSS murni, tanpa library animasi.

| Momen | Gerak | Versi kurangi gerak |
| --- | --- | --- |
| Kartu krisis dibuka | Kertas meluncur ke meja | Pudar 160 ms |
| Tim mengesahkan | Cap SAH menghantam, tinta menyebar, kartu tim sedikit tertekan | Pudar |
| Pengungkapan | Kartu dibalik, penyebab meresap seperti tinta | Pudar |
| Pakta dilanggar | Kartu pakta tersentak sekali | Pudar |
| Negara kolaps | Spanduk merah mendarat | Pudar |
| Halaman depan | Koran meluncur dan sedikit berputar | Pudar |

Versi kurangi gerak dipakai jika perangkat meminta `prefers-reduced-motion`, atau jika fasilitator mencentang "Kurangi gerak" di konsol (khusus layar utama, sesuai GDD). Isian tombol tahan-SAH tetap berjalan, karena itu umpan balik, bukan hiasan.

### Audio

- **Hanya layar utama yang berbunyi.** HP tidak pernah memuat kode audio. Tab cetak Edisi Khusus juga senyap.
- **Howler.js** dimuat hanya jika `web/public/audio/manifest.json` mendaftarkan setidaknya satu file. Selama manifest kosong, tidak ada byte audio yang diunduh.
- **Pemicu cue diturunkan dari perubahan state ruangan** (`web/src/audio/derive.ts`), lalu diuji. Pengungkapan berbunyi mengikuti tempo layar: satu bunyi per kartu, per penyebab, per pakta, lalu vonis.
- **Musik:** tiga loop yang berganti menurut Keresahan, dengan crossfade 1,5 detik. Musik turun (ducking) saat kartu krisis dibuka, saat pengungkapan, saat halaman depan, dan saat jeda. Musik diam saat debrief, karena kelas sedang berdiskusi.
- **Konsol fasilitator (K):** tombol bisu, volume utama, musik dan efek terpisah, sakelar kurangi gerak, dan jumlah file yang terpasang. Di lobi ada sakelar suara singkat. Pengaturan ini tersimpan per laptop.
- **Pemeriksaan:** setiap cue yang diminta tercatat di `window.__teiAudio`, ada filenya atau tidak. Uji browser memakainya untuk memastikan semua cue terpicu.

### Getaran HP

HP senyap dan hanya bergetar (`web/src/haptics.ts`). Setiap getaran punya padanan di layar.

| Pola | Kapan |
| --- | --- |
| 60 ms | Setiap ganti fase |
| 80 ms | Rapat Tim dimulai: giliran tim memilih |
| 60-40-60 | Juru Bicara: Lobi, Pengesahan, dan tebak agenda dimulai |
| 100-50-100 | Juru Bicara menerima tawaran pakta |
| 120 ms | Keputusan tim disahkan (anggota selain Juru Bicara; Juru Bicara sudah merasakannya saat menahan tombol) |

## Brief ilustrator

Gaya: garis tinta tebal, maksimal tiga tinta (hitam, merah TEI, biru riso) di atas kertas, arsir halftone, dan sedikit misregistrasi. Gambar ditampilkan dengan `mix-blend-mode: multiply`, jadi latar putih file akan hilang menyatu dengan kertas. Tidak perlu latar transparan.

Karakter harus seimbang gender, dan tidak boleh mengaitkan sifat buruk dengan suku, agama, atau daerah tertentu. Jangan memakai tokoh atau partai nyata (GDD).

| Aset | Jumlah | Ukuran kirim | Nama file | Dipakai di |
| --- | --- | --- | --- | --- |
| Karikatur arketipe: Menteri berdasi, Gubernur Bank dengan kalkulator, Bos Pabrik, Ketua Serikat dengan toa, Ibu-ibu warga | 5 × 4 ekspresi (tenang, senang, panik, marah) | 640 × 640, WebP, ≤ 60 KB | `peran/<peran>-<ekspresi>.webp` | HP saat briefing (tenang); tabel skor akhir (ekspresi dipilih otomatis) |
| Ilustrasi kartu krisis | 12 (+1 latihan) | 1200 × 800, WebP, ≤ 120 KB | `crisis/<id kartu>.webp`, misalnya `crisis/c_beras.webp` | Kartu krisis di layar utama, sepertiga kanan |
| Diorama kota | 1 file Rive, 6 zona × 3 state | Lihat kontrak di bawah | `diorama/kota.riv` | Layar utama (dipasang engineer setelah file ada) |
| Template halaman depan + karikatur | 1 + 6 | Menyusul setelah template disetujui | `koran/...` | Harian TEI |

Ekspresi di tabel skor akhir dipilih otomatis (`endExpression`):

- **panik:** jika negara kolaps.
- **senang:** tim dengan skor tertinggi.
- **marah:** tim yang agendanya gagal.
- **tenang:** semua tim lain.

Id kartu krisis: `c_beras`, `c_listrik`, `c_data`, dan seterusnya. Daftar lengkapnya ada di `engine/src/content/crises.ts`. Kartu latihan memakai id `c_latihan`.

**Kontrak Rive untuk diorama:**

- Artboard `Kota`, state machine `kota`.
- Input angka 0–10: `harga`, `kerja`, `kas`, `kepercayaan`, `keresahan`.
- Input trigger: `kolaps`.
- Enam zona dan state-nya:
  - **Pasar:** antrean memanjang saat Harga tinggi.
  - **Pabrik:** tutup saat Lapangan Kerja rendah.
  - **Bank:** —
  - **Kantor pemerintah:** —
  - **Permukiman:** —
  - **Jalan raya:** demo saat Keresahan tinggi.
- Setiap zona punya tiga state: aman, bahaya, kolaps. Batas zona sama dengan papan: lihat `ZONES` di `web/src/text.ts`.
- Target 60 fps di laptop sekolah kelas menengah.
- Harus ada state diam untuk mode kurangi gerak.

**Pengiriman:** taruh file di `web/public/art/`, lalu daftarkan di `web/public/art/manifest.json`:

```json
{
  "crisis": { "c_beras": "crisis/c_beras.webp" },
  "peran": { "buruh": { "tenang": "peran/buruh-tenang.webp", "marah": "peran/buruh-marah.webp" } },
  "diorama": null
}
```

Ekspresi yang belum ada akan diganti dengan ekspresi tenang. Peran tanpa gambar tampil seperti sekarang.

## Brief sound designer

**Teknis**

- **Format:**
  - Setiap file dikirim dua kali: WebM/Opus 96 kbps dan MP3 128 kbps (untuk Safari lama).
  - 48 kHz.
  - Efek suara mono; musik stereo.
- **Loudness:**
  - Efek suara: puncak −1 dBTP, sekitar −18 LUFS jangka pendek.
  - Musik: sekitar −20 LUFS integrated.
  - Gain akhir diatur di manifest, jadi master tidak perlu dipaksa keras.
- **Mixing untuk speaker laptop dan speaker kelas:**
  - High-pass sekitar 150 Hz.
  - Informasi penting jangan di bawah 200 Hz.
  - Efek suara pendek: kebanyakan di bawah 1,5 detik, kecuali `waktu.hampir` (10 detik) dan `fase.koran`.
- **Loop musik:**
  - Durasi 60–90 detik, dengan titik loop mulus.
  - Ketiga loop memakai tempo dan nada dasar yang sama agar crossfade terdengar seperti satu lagu yang berubah suasana.
  - Aransemen satir dengan unsur instrumen lokal, misalnya brass dan kendang.
- **Varian:** cue yang sering berulang dibuat 3 varian. Mesin memilih secara acak agar tidak terdengar mekanis.

**Daftar cue**

Tabel ini sama dengan `web/src/audio/cues.ts`, yang menjadi sumber kebenarannya. Tes memastikan setiap cue di kode tercantum di sini.

| Cue | Kapan | Rekaman | Padanan visual | Gain | Varian |
| --- | --- | --- | --- | --- | --- |
| `gabung` | Pemain baru masuk ruangan | Paku payung ditekan ke papan gabus | Nama muncul di kolom tim | 0.5 | 3 |
| `briefing` | Briefing peran dimulai | Amplop cokelat dirobek, kertas ditarik keluar | Layar briefing dan hitung mundur | 0.8 | 1 |
| `fase.krisis` | Kartu krisis dibuka | Mesin ketik cepat lalu bel ruang redaksi | Kartu krisis meluncur masuk | 0.9 | 1 |
| `fase.rapat` | Rapat Tim dimulai | Kursi digeser, gumam ruang rapat | Pertanyaan tim tampil besar | 0.6 | 1 |
| `fase.lobi` | Lobi Terbuka dimulai | Bel pasar dan obrolan kerumunan naik | Meja Lobi | 0.7 | 1 |
| `fase.pengesahan` | Pengesahan dimulai | Ketukan palu sidang dua kali | Kartu status tim menunggu SAH | 0.8 | 1 |
| `fase.pengungkapan` | Pengungkapan dimulai | Gulungan kendang pendek | Kartu keputusan tertutup | 0.8 | 1 |
| `fase.koran` | Halaman depan terbit | Mesin cetak berputar lalu koran dilempar ke meja | Koran meluncur masuk | 0.9 | 1 |
| `sah` | Satu tim mengesahkan keputusan | Stempel karet menghantam kertas | Cap SAH merah di kartu tim | 0.9 | 3 |
| `pakta.sepakat` | Pakta disepakati di Lobi | Pulpen menandatangani, kertas dilipat | Pakta muncul di Meja Lobi | 0.7 | 3 |
| `kartu.buka` | Keputusan satu tim dibuka | Kartu dibalik di atas meja | Kartu tim terbuka | 0.7 | 3 |
| `sebab.baik` | Perubahan indikator yang membaik | Koin jatuh ke kaleng | Angka hijau dan papan bergerak | 0.6 | 3 |
| `sebab.buruk` | Perubahan indikator yang memburuk | Map tebal dijatuhkan ke meja | Angka merah dan papan bergerak | 0.6 | 3 |
| `pakta.tepat` | Pakta ditepati | Jabat tangan dan tepukan pundak | Pakta hijau "Ditepati +1" | 0.6 | 1 |
| `pakta.robek` | Pakta dilanggar | Kertas dirobek dua | Pakta bergaris merah dan bergetar | 0.8 | 1 |
| `bahaya` | Indikator masuk zona bahaya | Peluit demo dari kejauhan | Label Bahaya dan arsir merah di papan | 0.7 | 1 |
| `kolaps` | Negara kolaps | Kerumunan meledak, peluit panjang, toa | Spanduk merah "Negara kolaps" | 1 | 1 |
| `waktu.hampir` | 10 detik terakhir sebuah fase | Jam meja berdetak 10 detik | Timer berubah merah | 0.5 | 1 |
| `jeda` | Fasilitator menjeda | Peluit wasit pendek | Timer bertuliskan Jeda | 0.6 | 1 |
| `lanjut` | Fasilitator melanjutkan | Peluit wasit dua kali | Timer berjalan lagi | 0.6 | 1 |
| `tebak` | Fase tebak agenda | Laci arsip dibuka, map dibalik-balik | Layar tebak agenda | 0.7 | 1 |
| `akhir.baik` | Permainan berakhir tanpa kolaps | Sting brass pendek yang sedikit fals | Layar hasil akhir | 0.9 | 1 |
| `akhir.kolaps` | Permainan berakhir dengan kolaps | Brass jatuh "wah-wah" dan satu pukulan gong | Layar hasil akhir bertanda kolaps | 0.9 | 1 |
| `halaman` | Fasilitator pindah bagian debrief | Halaman koran dibalik | Bagian debrief berganti | 0.5 | 1 |
| `kuis.jawaban` | Jawaban kuis dibuka | Kapur diketuk dua kali di papan tulis | Jawaban benar tampil | 0.6 | 1 |

Total ada 25 cue. Enam di antaranya dibuat 3 varian, jadi totalnya 37 file efek suara (GDD: ±30), ditambah 3 loop musik.

| Loop | Kapan | Arah |
| --- | --- | --- |
| `tenang` | Lobi, briefing, dan tahun dengan Keresahan 0–4 | Brass ringan dan kendang santai, tempo jalan kaki. Satir, bukan komedi slapstick. |
| `tegang` | Keresahan 5–6, atau fase tebak agenda | Motif yang sama, kendang lebih rapat, bass berdenyut. Ada rasa menunggu. |
| `krisis` | Keresahan 7 ke atas, atau satu indikator di zona kolaps | Motif yang sama dalam minor, brass sumbang, perkusi kerumunan. Tidak boleh menakutkan untuk anak SMA. |

**Pengiriman:** taruh file di `web/public/audio/sfx/` dan `web/public/audio/music/`, lalu daftarkan di `web/public/audio/manifest.json` tanpa ekstensi:

```json
{
  "format": ["webm", "mp3"],
  "sfx": {
    "sah": ["sfx/sah-1", "sfx/sah-2", "sfx/sah-3"],
    "kolaps": { "files": ["sfx/kolaps"], "gain": 1 }
  },
  "music": { "tenang": "music/tenang", "tegang": "music/tegang", "krisis": "music/krisis" }
}
```

Lalu jalankan `npm test`. Tes menolak manifest yang memuat nama cue atau loop yang tidak dikenal. Konsol fasilitator akan menampilkan jumlah file yang terpasang. Tidak ada kode yang perlu diubah.

## Belum dibuat

- Semua file ilustrasi, file Rive diorama, dan rekaman suara. Ini pekerjaan ilustrator, animator, dan sound designer (GDD, "Tim inti").
- Komponen Rive untuk diorama. Akan dipasang setelah file `.riv` pertama ada, agar runtime-nya (sekitar 150 KB) tidak dimuat tanpa guna.
- Kit cetak masih memakai huruf lamanya. Palet perannya sudah mengikuti palet baru.
