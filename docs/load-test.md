# Uji beban server ruangan

Alat: `tools/loadtest/run.ts`. Satu host dan banyak HP bot memainkan satu permainan penuh lewat WebSocket: masuk, dibagi tim, rapat (usul + "Tim kami selesai"), lobi (pakta diajukan dan dijawab), pengesahan (SAH), tebak agenda. Setiap HP sekali putus lalu tersambung lagi di tahun 2. Bot berpikir sejenak secara acak sebelum tiap aksi (`--think-ms`).

```bash
npm run build
npm run loadtest -- --rooms 1 --players 40               # lokal: menjalankan dist/room.mjs dan mengukur CPU + memorinya
npm run loadtest -- --rooms 5 --players 40 --join-gap-ms 50
npm run loadtest -- --rooms 1 --players 40 --think-ms 200 # semburan: semua HP beraksi hampir bersamaan
npm run loadtest -- --base https://play.economic.co.id --rooms 1 --players 40   # situs live, dari laptop
```

Uji lokal menaikkan batas per IP (`RATE_LIMIT_SCALE=20`) karena semua bot datang dari satu mesin. Situs live tetap memakai batas aslinya: 10 ruangan dan 120 kali masuk per menit per IP, jadi `--rooms 2 --players 30 --stagger-ms 30000` adalah batas aman dari satu laptop. Ruangan uji di server live hilang pada Manual Deploy berikutnya (disk Render dihapus).

## Hasil lokal (18 Oktober 2026)

Mesin uji 4 inti, dipakai bersama oleh server dan bot, jadi angka CPU berselisih beberapa persen antar putaran. Bot memadatkan satu kelas (sekitar 45 menit) menjadi sekitar 45 detik, kira-kira 60 kali lebih rapat dari kelas sungguhan.

| Skenario | Latensi p50 / p95 / maks | Data ke klien | CPU server (rata-rata / puncak 10 dtk) | Memori maks |
|---|---|---|---|---|
| 1 × 40, sebelum perbaikan | 2 / 6 / 666 ms | 47,9 MB, 12.410 pesan | 7,6% / 10,3% | 87 MB |
| 1 × 40, sesudah | 51 / 56 / 696 ms | 19,4 MB, 4.883 pesan | 6,3% / 7,5% | 96 MB |
| 5 × 40, sesudah | 51 / 56 / 1.377 ms | 101 MB, 25.313 pesan | 6–10% / 9–15% | 117 MB |
| Semburan 1 × 40, sesudah | 35 / 53 / 155 ms | 8,9 MB | 4,6% | 88 MB |

Semua ruangan selesai tanpa error selain penolakan wajar (`fase-salah` saat bot terlambat sedetik setelah fase berganti, `pakta-penuh`).

Profil CPU (`--profile`) sebelum perbaikan: 64% waktu sibuk server habis untuk menyusun dan mengirim tampilan, yaitu satu tampilan host plus satu per HP, untuk setiap aksi siapa pun. Menyimpan snapshot dan laporan sesi tidak berarti (di bawah 2%).

## Perbaikan

- **Siaran dikumpulkan 50 ms** (`room/src/server.ts`). Perubahan dalam jendela itu dikirim sebagai satu siaran. Latensi naik menjadi sekitar 50 ms, masih jauh di bawah yang terasa, dan jumlah pesan turun lebih dari separuh.
- **Bagian yang sama dibangun sekali per siaran** (`ViewCache` di `room/src/views.ts`): bagian umum dan konteks keputusan per tim, bukan per HP.
- **Tampilan yang tidak berubah tidak dikirim lagi.** Server mengingat tampilan terakhir tiap koneksi.
- **Snapshot dan laporan tidak lagi saling tabrak.** Dua penyimpanan bersamaan dulu memakai satu file sementara, sehingga salah satunya gagal (`ENOENT ... rename`). Sekarang tiap penyimpanan punya file sementaranya sendiri.
- `/healthz` sekarang juga melaporkan `connections` dan `rssMb`.

Waktu sibuk thread utama untuk satu kelas turun dari sekitar 32 ms menjadi 17 ms per detik permainan bot.

## Artinya untuk Render free (0,1 CPU, 512 MB)

- Satu permainan penuh untuk 40 HP memakan sekitar 3 detik CPU secara total. Jatah 0,1 CPU memberi 6 detik CPU per menit, jadi beberapa kelas bersamaan masih muat secara rata-rata.
- Yang menentukan adalah semburan, misalnya 40 HP mengusulkan dalam detik yang sama saat Rapat dibuka. Satu putaran siaran untuk 41 klien butuh sekitar 6 ms CPU di mesin uji, atau sekitar 60 ms dengan 0,1 CPU. Dengan pengumpulan 50 ms, HP tetap mendapat tampilan baru dalam sekitar 0,1–0,2 detik.
- Memori jauh di bawah batas: sekitar 120 MB untuk lima kelas.

## Situs live

Belum dijalankan dari sesi ini: proxy jaringan lingkungan cloud tidak meneruskan WebSocket. Jalankan dari laptop setelah Manual Deploy, saat tidak ada kelas (`/healthz` menunjukkan `"rooms":0`), lalu tempel hasilnya di bawah.
