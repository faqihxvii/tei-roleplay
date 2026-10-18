# Panduan art & audio TEI

Untuk ilustrator, animator, sound designer, dan engineer yang memasang aset mereka. Dasarnya adalah GDD, bagian "Art direction & audio" dan "Aksesibilitas & inklusi". Dokumen ini mencatat apa yang sudah ada di kode, dan apa yang harus dikirim agar aset langsung terpasang.

**Status:** identitas, gerak, ilustrasi (karikatur, kartu krisis, diorama kota), sistem audio dengan suara sintesis sementara, dan getaran HP sudah ada. Rekaman suara final dari sound designer belum ada.

## Arah

**Merek TEI**, dengan sumber economic.co.id dan feed Instagram @theeconomicinfluence: tata letak editorial yang lapang di atas putih gading, merah TEI untuk penekanan, judul Geist yang rapat, sudut tegas, dan garis tipis. Dari sampul feed kita ambil rumus judulnya: klaim ditulis tebal merah, lalu penjelasannya langsung menyusul dalam warna hitam. Koran satir *Harian TEI* tetap ada sebagai cerita di dalam permainan, ditata seperti sampul postingan TEI. Ilustrasi tetap bergaya cetak risograph dengan tinta merah dan pink TEI.

Dilarang: gradien dekoratif, glassmorphism, emoji sebagai ikon, ikon generik sebagai visual utama, dan gambar stok (GDD). Target audio rilis tetap foley rekaman asli. Suara sintesis hanya dipakai sementara untuk playtest; lihat bagian audio.

## Yang sudah ada di kode

### Token

Sistem desainnya memakai **Tailwind CSS v4** dan **Radix UI**:

- `web/src/styles/tokens.css` adalah tema Tailwind (`@theme`) dan satu-satunya tempat nilai mentah. Tema bawaan Tailwind tidak dimuat (`styles/index.css` hanya mengimpor preflight dan mesin utilitas), jadi temanya tertutup: `p-7` atau `text-blue-500` tidak menghasilkan apa pun. Hanya nilai TEI yang ada. Nilainya diambil dari stylesheet economic.co.id, lalu disesuaikan untuk proyektor kelas: tidak ada teks di bawah 12 px, dan ukuran display mengikuti lebar layar.
- `web/src/styles/base.css` mengatur elemen dasar (judul, tautan, fokus), dan `web/src/styles/components.css` memuat bagian-bagian TEI (tombol, kartu, topbar, koran, papan), masing-masing didefinisikan sekali dan hanya memakai `var(--…)`.
- Komponen React mengatur tata letak dan jarak antar-bagian dengan utilitas Tailwind (`flex flex-col gap-4`, `text-muted`, `lg:grid-cols-2`).
- Bagian interaktif memakai Radix: `Dialog` untuk konsol fasilitator (fokus terkunci, Escape menutup), `Tabs` untuk tab bawah HP dan Keputusan/Pakta, `ToggleGroup` untuk tempo, `Switch` dan `Slider` untuk suara.

Lapisan token: primitif (palet mentah, hanya di `:root`), lalu token semantik di `@theme`, lalu token komponen. Tes `web/test/tokens.test.ts` gagal kalau ada ukuran huruf, bobot, jarak huruf, tinggi baris, warna, atau jarak (padding, margin, gap, inset) mentah di luar file token, atau ada nilai sembarang Tailwind seperti `p-[13px]` di komponen.

**Irama jarak** (basis 4 px): langkah 1–2 di dalam kontrol, 3–4 di dalam kartu, 5–6 antar-kartu (dan padding kartu di proyektor), 8–10 antar-bagian, 12–16 ruang lega proyektor. `--spacing-gutter` adalah margin samping proyektor yang mengikuti lebar layar.

**Hierarki huruf**, satu untuk dua permukaan. HP dan konsol: `2xs` label, `xs` keterangan, `sm` isi, `md` pembuka, `lg` judul, `xl` angka, `2xl` skor. Proyektor: `display-sm` teks, `display-md` judul layar, `display-lg` satu pertanyaan utama per layar, `display-xl` kode ruangan. Setiap ukuran membawa tinggi barisnya sendiri.

| Token semantik | Nilai | Dipakai untuk |
| --- | --- | --- |
| `--color-bg` | `#f7f6f2` | Latar, putih gading seperti economic.co.id |
| `--color-surface` | `#fffefa` | Kartu dan isian, dengan garis `--color-line` (`#d9d7d0`) |
| `--color-sunken` | `#f2eee7` | Tombol sekunder, jalur papan indikator |
| `--color-paper` | `#fdfcf9` | Halaman Harian TEI |
| `--color-inverse` | `#191918` | Panel gelap (agenda rahasia) |
| `--color-ink` / `--color-copy` / `--color-muted` | `#171717` / `#4d4c47` / `#5c5b56` | Judul, paragraf di bawah judul, teks pendamping |
| `--color-brand` | `#c30700` | Merah TEI: logo, tombol utama, judul koran, krisis, cincin fokus keyboard |
| `--color-brand-strong` | `#8d1b16` | Label kapital, hover tombol |
| `--color-brand-soft` | `#f5a99d` | Aksen di atas latar gelap, busur di sudut kartu krisis |
| `--color-highlight` | `#fde4df` | Pertanyaan tim, kartu pemandu |
| `--color-success` / `--color-warning` / `--color-danger` | hijau, cokelat, merah TEI | Naik-turun angka, zona bahaya |

Komponen pokok:

- **Logo** (`TeiLogo` di `web/src/shared.tsx`): kotak merah bertuliskan TEI, ditambah nama "The / Economic / Influence" dalam tiga baris. Ini rekonstruksi dari logo economic.co.id dengan huruf Geist. Kalau file SVG resmi tersedia, simpan di `web/public/brand/` dan ganti isi komponennya. Favicon ada di `web/public/favicon.svg`.
- **Kartu:** putih, garis 1 px, dan garis merah pendek di pojok kiri atas. Tidak ada bayangan.
- **Label:** huruf kapital kecil berjarak lebar, warna merah tua, hanya untuk label yang membawa informasi (kategori krisis, nama kotak). Tidak ada label hiasan di atas judul.
- **Kotak penjelas** (aturan tahun ini, pertanyaan tim, kartu pemandu): garis atas 2 px, bukan garis tebal di sisi kiri.
- **Aksen serif:** satu kata miring Gelasio (Georgia) berwarna merah (`.accent-serif`), seperti "follow." di situs. Pakai hemat, paling banyak satu per layar.
- **Garis coret tangan** (`.swoosh`): garis bawah merah untuk satu kata penting, seperti di sampul feed.

### Huruf

Semua font di-host sendiri lewat npm, sehingga tidak ada permintaan ke layanan luar. Semuanya berlisensi SIL OFL 1.1, yang mengizinkan embed web.

| Token | Font | Dipakai untuk |
| --- | --- | --- |
| `--font-sans` | Geist (variable) | Judul, teks isi, dan UI |
| `--font-serif` | Gelasio (variable), dengan cadangan Georgia | Nama koran, kutipan warga, satu kata aksen miring. Serif editorial situs TEI adalah Georgia; Gelasio digambar dengan ukuran yang sama dan di-host sendiri, karena HP Android tidak punya Georgia. |
| `--font-mono` | Geist Mono (variable) | Angka: timer, papan, skor, kode ruangan |

Skala hurufnya tertutup. Ukuran baru harus masuk ke token lebih dulu, dengan nama yang menjelaskan kegunaannya.

| Token | Ukuran | Dipakai untuk |
| --- | --- | --- |
| `--text-2xs` | 12 px | Label, tag |
| `--text-xs` | 14 px | Keterangan dan teks pendamping |
| `--text-sm` | 16 px | Teks isi |
| `--text-md` | 20 px | Teks pembuka, daftar di layar utama |
| `--text-lg` | 24 px | Judul kartu, judul di HP |
| `--text-xl` | 32 px | Angka besar di kartu, cap SAH |
| `--text-2xl` | 56 px | Skor akhir di HP |
| `--text-display-sm` | 20–28 px | Narasi, pertanyaan diskusi, petunjuk layar |
| `--text-display-md` | 28–44 px | Judul layar dan judul bagian |
| `--text-display-lg` | 36–68 px | Judul krisis, headline koran, pertanyaan besar |
| `--text-display-xl` | 48–112 px | Kode ruangan, nama koran di Edisi Khusus |

Ukuran display mengikuti lebar layar (`clamp`), supaya tetap terbaca dari bangku belakang. Pilihan lainnya juga sedikit:

- **Bobot:** `--font-weight-regular` 400, `--font-weight-semibold` 650, `--font-weight-bold` 700, `--font-weight-black` 760 (judul), sama dengan situs TEI.
- **Jarak huruf:** `--tracking-display` −0,045 em (judul, seperti situs TEI), `--tracking-tight` −0,02 em, `--tracking-caps` 0,12 em (huruf kapital kecil), `--tracking-code` 0,3 em (isian kode ruangan).
- **Tinggi baris:** `--leading-display` 1,04, `--leading-snug` 1,25, `--leading-body` 1,6.
- **Sudut dan sentuhan:** kartu dan koran bersudut tegas; tombol, isian, dan pilihan memakai sudut 2 px (`--radius-control`). Target sentuh minimal 44 px (`--spacing-tap`), tombol 48 px (`--spacing-control`).

Hanya subset latin yang diunduh browser. Muatan awal HP (JS dan CSS dalam gzip, ditambah font latin) sekitar 196 KB, di dalam anggaran 300 KB. `npm run budget` menghitungnya setelah build, dan CI gagal bila melebihi anggaran.

### Warna peran

Setiap peran punya **warna, pola, dan kode huruf**, jadi peran tidak pernah dibedakan oleh warna saja. Kelima warna dipisah lewat terang-gelap, bukan hanya rona. Hasil simulasi buta warna (Machado 2009, keparahan penuh): jarak warna terdekat ΔE ≈ 26 untuk protan, deutan, dan tritan. Palet lama hanya 6,5.

| Peran | Kode | Warna | Teks di atasnya | Pola |
| --- | --- | --- | --- | --- |
| Pemerintah | PEM | `#1b2a41` | putih | garis mendatar (kertas bergaris birokrasi) |
| Bank Sentral | BS | `#0067a5` | putih | kisi (buku besar) |
| Pengusaha | USH | `#e0a100` | hitam | garis miring |
| Serikat Buruh | BRH | `#c30700` | putih | garis tegak |
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

## Ilustrasi

**Keputusan (17 Oktober 2026):** larangan gambar AI di GDD dicabut. Ilustrasi dibuat sebagai SVG dari kode, dengan bantuan AI, dan dipakai sampai rilis. Ilustrator boleh memperhalus asalkan memakai gaya yang sama.

Sumbernya ada di `web/art/`:

- `riso.ts`: tiga tinta (hitam, merah TEI `#c30700`, pink `#e9806e`), pola halftone, dan pelat warna yang digeser 4 × 3 unit di bawah garis tinta.
- `people.ts`: lima arketipe × empat ekspresi.
- `crises.ts`: 13 kartun editorial kartu krisis, termasuk Tahun 0.
- `build.ts`: menulis file ke `web/public/art/` beserta `manifest.json`.

Setelah mengubah sumber, jalankan `npm run art:build`. Tes menolak file yang tertinggal dari sumbernya, file yang lebih dari 12 KB, file tanpa judul aksesibel, dan warna di luar empat warna palet.

| Aset | Jumlah | Dipakai di |
| --- | --- | --- |
| Karikatur: Menteri berdasi, Gubernur Bank Sentral dengan kalkulator, Bos Pabrik berhelm proyek, Ketua Serikat dengan toa, Ibu warga dengan tas belanja | 5 × 4 (tenang, senang, panik, marah) | Kolom tim di lobi, HP saat briefing, kartu status tim di layar utama, tabel skor akhir |
| Ilustrasi kartu krisis | 13 | Kartu krisis di layar utama dan di HP, serta foto di halaman depan Harian TEI |
| Diorama kota | 6 distrik × 3 keadaan | Layar utama saat briefing, Rapat Tim, Lobi, dan Pengesahan (`web/src/Diorama.tsx`) |

**Gender dan identitas:** pemerannya tiga perempuan (Gubernur Bank Sentral, Ketua Serikat, Ibu warga) dan dua laki-laki (Menteri, Bos Pabrik). Tidak ada penanda suku atau agama. Wajah memakai warna kertas.

**Ekspresi di kartu status tim:**

- **senang:** tim yang sudah sah.
- **panik:** tim yang belum sah saat Pengesahan.
- **tenang:** semua keadaan lain. Tim tanpa HP selalu tenang.

**Ekspresi di tabel skor akhir:**

- **panik:** jika negara kolaps.
- **senang:** tim dengan skor tertinggi.
- **marah:** tim yang agendanya gagal.
- **tenang:** semua tim lain.

**Diorama.** Setiap distrik membaca satu angka, memakai batas zona yang sama dengan papan:

| Distrik | Membaca | Bahaya | Kolaps |
| --- | --- | --- | --- |
| Pasar | Harga | Antrean 3 orang | Antrean 6 orang, kios bertuliskan HABIS |
| Pabrik | Lapangan Kerja | Asap berhenti, papan PHK | Kerja ≤ 2: TUTUP, gerbang dirantai |
| Kas Negara | Kas | Tinggal dua koin | Brankas KOSONG |
| Kantor Pemerintah | Kepercayaan | Bendera setengah tiang, dinding retak | Tulisan LENGSER? |
| Permukiman | Indeks negara | Satu jendela padam | Semua jendela padam |
| Jalan Raya | Keresahan | Tiga pendemo membawa poster | Kerumunan dan ban terbakar |

Asap dan poster bergoyang pelan. Gerakan itu berhenti jika perangkat meminta kurangi gerak, atau jika fasilitator mencentangnya di konsol. Pembaca layar membaca keadaan keenam distrik dalam satu kalimat.

Rive tidak dipakai. Diorama digambar langsung di halaman supaya bereaksi pada angka tanpa runtime tambahan, dan `diorama` di manifest tetap `null`.

## Audio sementara

Sampai rekaman sound designer ada, layar utama memakai suara sintesis yang dibuat dari kode di `web/audio/`. Bunyi ini meniru bunyi fisik, bukan beep:

- **Resonator modal** untuk bel redaksi, lonceng pasar, koin di kaleng, palu sidang, kapur, dan gong.
- **Derau terfilter** untuk kertas, amplop, tanda tangan, kerumunan, dan rel laci.
- **Membran bernada turun** untuk kendang (dung, tung, tak, ketipung).
- **Gergaji band-limited lewat filter** untuk brass dan tuba.

Musiknya satu lagu dalam D, 96 BPM, 16 birama (40 detik), diaransemen tiga cara:

- **tenang:** oompah tuba, brass, kendang ringan, dan bonang.
- **tegang:** minor, bas berdenyut, trompet bisu, kendang rapat.
- **krisis:** brass sumbang dengan sekon turun, kendang ganda, dan kerumunan pelan.

Ekor gema dilipat kembali ke awal supaya loop mulus. Player men-decode musik utuh, bukan streaming, sehingga titik loop tepat per sampel.

| | Nilai |
| --- | --- |
| Efek | 25 cue, 37 file, mono. Masing-masing dinormalkan ke −18 LUFS (momentary maksimum, berbobot K) dengan puncak ≤ −1,5 dBFS. Bunyi transien boleh sedikit lebih pelan daripada dipotong limiter. |
| Musik | 3 loop stereo, sekitar −20 LUFS integrated, puncak ≤ −1 dBFS |
| Format | WebM/Opus (40 kbps efek, 72 kbps musik) dan MP3 |
| Ukuran | Sekitar 3,8 MB seluruhnya, dimuat bertahap selama lobi |

`npm run audio:build` merender ulang semuanya. Perintah ini butuh ffmpeg, dan hasilnya sama untuk seed yang sama. Manifest ditandai `"temporary": true`, dan konsol menampilkan "sintesis sementara".

**Saat rekaman asli datang:** timpa file di `sfx/` dan `music/`, atau ubah daftar di manifest, lalu hapus `temporary`. Tes memastikan setiap cue tetap punya file di setiap format.

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
| `waktu.hampir` | 10 detik terakhir fase berwaktu; berhenti saat jeda, dilanjutkan sesuai sisa waktu | Jam meja berdetak 10 detik | Timer berubah merah | 0.5 | 1 |
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

- Rekaman foley dan musik final dari sound designer (GDD, "Tim inti"). Suara yang terpasang sekarang adalah sintesis sementara.
- Karikatur untuk halaman depan Harian TEI (GDD: 6 karikatur). Untuk sementara, foto halaman depan memakai ilustrasi krisis tahun itu.
- Kit cetak masih memakai huruf lamanya. Palet perannya sudah mengikuti palet baru.
