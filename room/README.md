# Server ruangan TEI

Server otoritatif untuk versi baru: memegang ruangan, pemain, tim, dan state engine. Layar host dan HP hanya menampilkan dan mengirim input (GDD, "Arsitektur teknis").

## Menjalankan

```bash
npm run room       # server ruangan di :8787 (restart otomatis saat kode berubah)
npm run room:web   # klien Vite di :5173, terbuka untuk HP di Wi-Fi yang sama
```

Buka `http://<alamat-jaringan-laptop>:5173/host` di laptop fasilitator. Jangan lewat `localhost`, karena QR akan menunjuk ke alamat yang tidak bisa dijangkau HP.

Produksi: `npm run room:build` lalu `npm run room:start` (satu proses melayani klien dan WebSocket).

Uji browser satu permainan penuh (1 host, 4 HP, 1 tim lewat konsol) saat kedua server di atas berjalan:

```bash
TEI_BASE=http://<alamat-jaringan>:5173 npm run room:e2e -- <folder-tangkapan-layar>
```

| Variabel | Bawaan | Kegunaan |
| --- | --- | --- |
| `PORT` | 8787 | Port HTTP dan WebSocket |
| `ROOM_DATA_DIR` | `data/rooms` | Folder snapshot ruangan |
| `CORS_ORIGIN` | kosong | Origin tambahan yang boleh membuka socket, dipisah koma |
| `TRUST_PROXY` | 0 | Jumlah reverse proxy di depan server, untuk membaca IP klien |

## Modul

- `src/room.ts`: kelas `Room` murni, tanpa jaringan. Gabung, sambung ulang, pembagian tim, briefing, putaran tahunan enam fase, voting anggota dan SAH Juru Bicara, pakta, resolusi lewat engine, tebakan akhir, voting Oknum, dan skor. Bisa dipindah ke Durable Object atau PartyKit tanpa diubah.
- `src/views.ts`: apa yang boleh dilihat tiap layar. Layar utama tidak pernah menerima agenda, kartu di tangan, atau sumber daya pribadi. HP hanya menerima milik timnya.
- `src/labels.ts`: bahasa sebab-akibat untuk pengungkapan ("Upah naik, Pengusaha menaikkan harga").
- `src/koran.ts` dan `src/content/koran.ts`: halaman depan Harian TEI dari tag peristiwa tahun itu, templat headline, Suara Warga, dan iklan satir.
- `src/debrief.ts`: titik balik, rantai sebab-akibat (efek tertunda dilacak ke keputusan asalnya), gelar akhir, pembukaan agenda, pertanyaan diskusi, dan riwayat lengkap untuk ekspor.
- `src/content/realWorld.ts`: kartu Di Dunia Nyata, satu peristiwa nyata bersumber untuk setiap kartu krisis.
- `src/protocol.ts`: format pesan dan validasi ketat untuk semua input klien.
- `src/server.ts`: Express + `ws`. Membuat ruangan, menyiarkan tampilan, batas laju, cek Origin, heartbeat, timer fase, dan pembersihan ruangan yang ditinggal.
- `src/store.ts`: snapshot ke file (tulis lalu rename). Antarmukanya kecil agar bisa diganti KV atau database.
- `../web/`: klien grey-box. `/` untuk HP, `/host` untuk layar utama dan konsol fasilitator.

## Aturan yang sudah berlaku

- Kode ruangan 4 huruf konsonan (tanpa I, L, O, dan tanpa huruf vokal agar tidak membentuk kata).
- Maksimal 40 pemain per ruangan. Kelas 41–80 memakai dua ruangan (GDD, "Ukuran kelompok").
- Nama panggilan 1–16 karakter, unik tanpa membedakan huruf besar dan kecil. Tidak ada data pribadi lain.
- Token sesi disimpan di HP. Refresh atau sinyal putus menyambung ke tim yang sama. Pemain yang dikeluarkan tidak bisa kembali dengan token lamanya.
- Layar host tidak pernah menerima agenda rahasia. HP hanya menerima agenda timnya sendiri, dan baru setelah briefing dimulai.
- Tim tanpa anggota saat briefing dimainkan lewat konsol fasilitator (Mode tanpa HP). Pemain yang datang terlambat masuk ke tim terkecil.
- Snapshot disimpan segera setiap ganti fase atau ada pemain baru, dan maksimal 0,5 detik setelah perubahan lain. Server yang di-restart memulihkan semua ruangan.

## Putaran tahunan

| Fase | Durasi bawaan | Yang terjadi |
| --- | --- | --- |
| Krisis | 45 detik | Kartu krisis dan efeknya di layar utama. Tahun 5 dibuka dengan survei Kepercayaan. |
| Rapat Tim | 75 detik | Setiap anggota memilih kartu dan tuas di HP. Jumlah suara tampil di semua HP tim. |
| Lobi Terbuka | 120 detik | Juru Bicara mengajukan dan menjawab pakta. Pakta yang disepakati tampil di Meja Lobi. Tawaran yang belum dijawab kedaluwarsa. |
| Pengesahan | 45 detik | Juru Bicara menahan SAH 1 detik. Jika waktu habis, pilihan terbanyak per bagian yang dipakai (seri: pilihan yang masuk lebih dulu). Fase berakhir begitu kelima tim sah. |
| Pengungkapan | 60 detik | Keputusan dibuka satu per satu (dampak terbesar terakhir), lalu setiap perubahan indikator dengan penyebabnya, lalu pakta ditepati atau robek. |
| Halaman Depan | 45 detik | Harian TEI tahun itu. |

Total 6,5 menit per tahun. Tempo Santai menambah 50%. Fasilitator bisa menjeda, menambah 30 detik, atau melewati fase dari konsol (tombol K di layar utama). Setelah tahun 5 atau kolaps: tebak agenda dan tunjuk Oknum (120 detik), lalu hasil akhir dengan skor dari engine, garis waktu, dan daftar headline.

Konsol fasilitator juga mengisi keputusan dan tebakan tim tanpa HP, atau mengambil alih tim yang macet.

## Debrief terpandu

Setelah skor keluar, fasilitator memandu enam bagian dari layar utama (tombol di bawah atau panah kiri-kanan). Semua HP ikut berpindah.

| Bagian | Layar utama | HP |
| --- | --- | --- |
| Hasil | Ending, Oknum, gelar (Paling Menepati Janji, Paling Licin, Penyelamat Tahun Krisis, Paling Berpengaruh), skor | Skor dan gelar tim sendiri |
| Garis waktu | Lima grafik kecil 0–10 dengan zona bahaya, penanda peristiwa per tahun, tabel. Titik bisa diketuk. | Lihat layar utama |
| Sebab-akibat | Titik balik terbesar, lalu setiap penyebab perubahan dengan nama tim. Efek tertunda menunjukkan tahun dan keputusan asalnya. | Rantai yang sama, baris tim sendiri ditebalkan |
| Buka agenda | Agenda dibuka satu per satu, dibandingkan dengan tebakan tim lain | Apakah tebakan timnya benar |
| Diskusi | Tiga putaran: Apa yang terjadi? Mengapa? Di dunia nyata? Pertanyaan diisi data sesi. | Pertanyaan yang sama plus satu pertanyaan refleksi per peran |
| Di Dunia Nyata | Peristiwa nyata yang mirip krisis terberat sesi itu, dengan sumber | Teks dan tautan sumber |

Ekspor di konsol (K): tiga CSV (garis waktu, keputusan per tim, log pakta; pemisah titik koma untuk Excel berbahasa Indonesia) dan Edisi Khusus, halaman semua headline dan hasil yang siap dicetak atau disimpan sebagai PDF.

## Belum dibuat

- Tahun 0 latihan dan kuis pra/pasca.
- Narasi, pertanyaan tim, dan "Tahukah Anda" di kartu krisis (belum ada di data engine).
- Templat headline baru 2–3 varian per tag; GDD meminta minimal 8. Perlu ruang penulis.
- Audio, animasi Rive, dan art direction final.
