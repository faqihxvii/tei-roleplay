# The Economic Influence

Game simulasi sosial-ekonomi satir berbasis React, Vite, dan Express. Skenario dan rekap tahunan dibuat melalui Google Gemini.

## Persyaratan

- Node.js 22 atau lebih baru
- Bun (disarankan karena repository menyediakan `bun.lock`), atau npm
- API key Gemini untuk fitur generasi skenario dan rekap

## Menyiapkan lingkungan lokal

1. Install dependency:

   ```sh
   bun install
   ```

   Alternatif menggunakan npm:

   ```sh
   npm install --no-package-lock
   ```

2. Buat file `.env` di root proyek dan isi API key secara lokal:

   ```dotenv
   GEMINI_API_KEY=masukkan_api_key_gemini_baru_di_sini
   ```

   Jangan commit `.env` atau membagikan API key. `.env*` sudah dikecualikan oleh `.gitignore`.

3. Jalankan server pengembangan:

   ```sh
   bun run dev
   ```

   Dengan npm, gunakan `npm run dev`.

4. Buka `http://localhost:3000`.

Server Express melayani API dan middleware Vite pada port `3000` (dapat diubah dengan `PORT`). Jika frontend produksi di-host pada origin terpisah, tambahkan origin yang diizinkan melalui `CORS_ORIGIN` di lingkungan server (beberapa origin dipisahkan koma). Dalam production, origin lintas-domain tidak diizinkan secara default. Endpoint AI dibatasi hingga 20 permintaan per IP per menit; penghitung ini disimpan di memori proses, sehingga deployment multi-instance memerlukan rate limiter bersama di proxy/API gateway.

## Pemeriksaan dan build

```sh
bun run lint
bun run build
```

Skrip `lint` menjalankan pemeriksaan TypeScript (`tsc --noEmit`). Skrip `build` membangun frontend Vite dan membundel server Express untuk produksi. Untuk menjalankan hasil build, gunakan:

```sh
NODE_ENV=production bun run start
```

## Aturan simulasi saat ini

- Mood, Kas, dan Chaos dibatasi pada rentang `0–10`; Cuan dan Penalti tidak bisa kurang dari `0`.
- Setiap aksi pada Chaos `7` atau lebih mengurangi Mood `1` setelah efek aksi diterapkan.
- Di akhir ronde, Chaos `8` atau lebih mengurangi Mood dan Kas masing-masing `1`. Setelah itu, Mood `8` atau lebih mengurangi Chaos `1`.
- Kondisi kolaps diperiksa setelah seluruh peran menyelesaikan ronde. Jika beberapa kondisi fatal terjadi bersamaan, prioritas ending adalah Mood `0` (`lengser`), lalu Kas `0` (`bangkrut`), lalu Chaos `10` (`anarki`). Jika tidak kolaps sampai akhir tahun kelima, ending-nya `survive`.
- Misi rahasia dinilai saat permainan berakhir: Pemerintah menang jika Kas `> 7`; Bank Sentral jika Chaos `< 7`; Pengusaha jika Cuan `>= 10`; Serikat Buruh jika Penalti `>= 5`; Masyarakat jika Mood tidak pernah turun di bawah `5`.

## Aksesibilitas

- Batas waktu giliran (60 detik) dapat dimatikan dengan tombol timer di bilah atas, sehingga pemain yang memerlukan waktu lebih lama tidak terburu-buru. Saat dimatikan, giliran tetap terbuka tanpa penalti waktu.
- Modal panduan peran dan detail ketahanan mendukung keyboard: fokus awal, jebakan Tab, Escape untuk tutup, dan fokus kembali ke tombol pembuka.
- Kartu kebijakan memakai `aria-pressed`, metrik memakai `role="progressbar"`, dan status giliran diumumkan melalui live region.
- Gerakan animasi mengikuti preferensi `prefers-reduced-motion`.

## Tes

Jalankan tes aturan engine dengan:

```sh
bun run test
```

Dengan npm, gunakan `npm test`.

Tes browser end-to-end memakai Playwright dan memalsukan respons API, jadi tidak menghabiskan kuota Gemini. Konfigurasi saat ini menggunakan Google Chrome yang sudah terpasang:

```sh
bun run test:e2e
```

Dengan npm, gunakan `npm run test:e2e`. Pasang Google Chrome terlebih dahulu jika belum tersedia.

## Endpoint API

- `POST /api/scenario` — membuat skenario dan pilihan kebijakan untuk satu tahun.
- `POST /api/recap` — membuat feed reaksi setelah semua peran memilih aksi.
