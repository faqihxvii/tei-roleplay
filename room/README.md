# Server ruangan TEI

Server otoritatif untuk versi baru: memegang ruangan, pemain, tim, dan state engine. Layar host dan HP hanya menampilkan dan mengirim input (GDD, "Arsitektur teknis").

## Menjalankan

```bash
npm run room       # server ruangan di :8787 (restart otomatis saat kode berubah)
npm run room:web   # klien Vite di :5173, terbuka untuk HP di Wi-Fi yang sama
```

Buka `http://<alamat-jaringan-laptop>:5173/host` di laptop fasilitator. Jangan lewat `localhost`, karena QR akan menunjuk ke alamat yang tidak bisa dijangkau HP.

Produksi: `npm run room:build` lalu `npm run room:start` (satu proses melayani klien dan WebSocket).

| Variabel | Bawaan | Kegunaan |
| --- | --- | --- |
| `PORT` | 8787 | Port HTTP dan WebSocket |
| `ROOM_DATA_DIR` | `data/rooms` | Folder snapshot ruangan |
| `CORS_ORIGIN` | kosong | Origin tambahan yang boleh membuka socket, dipisah koma |
| `TRUST_PROXY` | 0 | Jumlah reverse proxy di depan server, untuk membaca IP klien |

## Modul

- `src/room.ts`: kelas `Room` murni, tanpa jaringan. Gabung, sambung ulang, pembagian tim (acak, seimbang, manual), keluarkan pemain, briefing, Juru Bicara bergilir, dan tampilan per perangkat. Bisa dipindah ke Durable Object atau PartyKit tanpa diubah.
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

## Belum dibuat

Enam fase tahunan (Krisis, Rapat Tim, Lobi, Pengesahan, Pengungkapan, Koran), voting di dalam tim, pemisahan layar utama dan konsol fasilitator, serta pakta dan voting Oknum di klien.
