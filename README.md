# The Economic Influence

Game kelas tentang ekonomi dan kebijakan publik dalam lima peran. Pemain bergabung lewat HP, layar utama menampilkan negara, dan fasilitator memandu dari laptop. Semua krisis, kebijakan, dan headline ditulis manual; tidak ada pemanggilan AI.

Dokumentasi lengkap server ruangan, aturan putaran, kuis, dan debrief ada di [`room/README.md`](room/README.md). Brief art dan audio ada di [`docs/art-audio.md`](docs/art-audio.md).

## Menjalankan lokal

Butuh Node.js 22 (versi tercatat di `.node-version`).

```sh
npm ci
npm run room        # server ruangan di :8787
npm run room:web    # klien Vite di :5173, terbuka untuk HP di Wi-Fi yang sama
```

Buka `http://<alamat-jaringan-laptop>:5173/host` di laptop fasilitator, dan `/` di HP peserta.

## Produksi

```sh
npm run build   # klien + server
npm start       # satu proses melayani klien dan WebSocket
```

`render.yaml` berisi konfigurasi deploy di Render (paket gratis). Tidak ada variabel rahasia yang wajib diisi.

**Deploy dilakukan manual.** Ruangan disimpan di disk yang dihapus setiap kali deploy atau restart, jadi deploy di tengah kelas mengakhiri semua permainan yang sedang berjalan. Karena itu auto-deploy dimatikan. Setelah merge ke `main`, buka layanan di dashboard Render, lalu pilih **Manual Deploy → Deploy latest commit** saat tidak ada kelas yang bermain.

Saat Render menghentikan server (deploy, restart, atau tidur setelah 15 menit tanpa pengunjung), server lebih dulu menyimpan ruangan dan mengirim laporan terakhir setiap sesi ke webhook telemetri, kalau diisi.

## Tes

```sh
npm run lint      # pemeriksaan tipe (strict) dan ESLint
npm test          # engine, server ruangan, dan audio/UI
npm run sim       # simulasi bot untuk balancing
npm run print-kit # kit cetak PDF (butuh Chromium)
npm run room:e2e  # satu permainan penuh di browser (butuh server dan klien berjalan)
```

GitHub Actions (`.github/workflows/ci.yml`) menjalankan lint, tes, dan build di setiap PR dan push ke `main`. Dependabot mengusulkan pembaruan dependensi sebulan sekali.

## Struktur

- `engine/`: aturan permainan murni dan konten (krisis, kebijakan, agenda, pakta). Dipakai server dan simulator.
- `room/`: server ruangan otoritatif, dengan Express dan WebSocket.
- `web/`: klien React untuk HP (`/`) dan layar utama (`/host`).
- `docs/`: brief art dan audio.
