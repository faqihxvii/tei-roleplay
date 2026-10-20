# Paket krisis bulanan

Kartu krisis yang paling terasa adalah yang beritanya masih diingat murid. Karena itu, krisis dikelompokkan dalam **paket**: paket Klasik (12 kartu dari peristiwa 2019–2024) ditambah satu paket per bulan dari berita sebulan terakhir. Fasilitator memilih paket saat membuka ruangan. Bawaannya adalah paket terbaru.

| File | Isi |
| --- | --- |
| `engine/src/content/packList.ts` | Daftar paket yang bisa dipilih: id, judul, satu kalimat penjelasan. Paket terbaru ditaruh paling atas. |
| `engine/src/content/packs/<yyyy-mm>.ts` | Kartu krisis paket itu dan respons Mode Pemula untuk tiap kartu. |
| `engine/src/content/crises.ts` | `PACK_CARDS`: menghubungkan id paket dengan kartunya. |
| `engine/src/content/responses.ts` | Menggabungkan respons paket ke `RESPONSES`. |
| `room/src/content/realWorld.ts` | Kartu "Di Dunia Nyata" untuk debrief: berita aslinya beserta sumbernya. |
| `web/art/photos.json` | Foto Unsplash untuk Linimasa, beserta kreditnya. |
| `web/art/crises.ts` | Ilustrasi: pakai ulang gambar krisis Klasik yang paling mirip, dengan judul sendiri. |

## Langkah membuat paket bulan depan

1. **Riset (19 bulan lalu–19 bulan ini).** Cari 6–8 berita ekonomi Indonesia yang ramai dibicarakan dan mudah dikenali murid: harga pangan, energi, pekerjaan, utang, digital, dan satu guncangan global. Buka setiap halaman sumbernya. Catat angka dan tanggalnya.
2. **Salin paket terakhir.** Salin `engine/src/content/packs/2026-10.ts` menjadi `<yyyy-mm>.ts`, lalu ganti nama ekspornya (`PACK_2026_11`, `RESPONSES_2026_11`).
3. **Tulis kartunya.** Satu kartu per berita:
   - `id` diawali `c_`, huruf kecil saja, tanpa angka, unik di semua paket (misalnya `c_gulanov`). Kunci responsnya adalah id tanpa `c_`.
   - Paling sedikit **satu kartu `global`** (guncangan tahun 3) dan **empat kartu lain**.
   - Judul paling banyak 8 kata, narasi paling banyak 60 kata, satu pertanyaan diskusi yang diakhiri `?`, dan 1–3 konsep ekonomi.
   - `effects`: total besarnya sekitar 2, seperti kartu Klasik.
   - `modifier` untuk Mode Lanjutan memakai salah satu dari tiga jenis: `scaleTag` (gandakan kartu dengan tanda tertentu), `endOfYear` (efek di akhir tahun), atau `freezeLever` (bekukan satu pilihan kebijakan). Untuk `scaleTag`, pilih tanda yang dimiliki kartu kebijakan Lanjutan **dan** salah satu respons Pemula kartu ini, supaya krisis selalu punya jawaban.
   - **Fiksikan nama.** Jangan memakai orang, merek, atau lembaga sungguhan. Contohnya "Lembaga Indeks Global" dan "aplikasi Ojek Kilat". Tes menolak kata-kata merek yang dilarang.
4. **Tulis respons Pemula.** Setiap peran mendapat 3 respons per kartu: satu populis, satu jangka panjang, dan satu yang menguntungkan diri sendiri. Setiap respons harus punya untung dan rugi. Nama paling banyak 32 karakter, deskripsi paling banyak 90 karakter. Ikuti aturan menulis di kepala `engine/src/content/responses.ts`.
5. **Daftarkan paketnya.**
   - Tambahkan paket di **paling atas** `PACK_CHOICES` (`packList.ts`).
   - Tambahkan `'<yyyy-mm>': PACK_<YYYY>_<MM>` ke `PACK_CARDS` (`crises.ts`).
   - Tambahkan `...RESPONSES_<YYYY>_<MM>` ke `RESPONSES` (`responses.ts`).
   - Paket lama boleh tetap ada. Hapus dari `PACK_CHOICES` dan `PACK_CARDS` saja jika daftarnya terlalu panjang, tetapi jangan hapus kartunya selama ruangan lama mungkin masih menyimpannya.
6. **Di Dunia Nyata.** Tambahkan satu catatan per kartu di `room/src/content/realWorld.ts`, paling banyak 50 kata, dengan URL `https://` ke berita aslinya.
7. **Foto dan ilustrasi.**
   - Cari foto **gratis** di Unsplash (bukan Unsplash+), lalu tambahkan ke `web/art/photos.json` dengan nama fotografer dan alt teks berbahasa Indonesia.
   - Jalankan `npm run art:photos`. Di balik proxy (misalnya kontainer cloud), jalankan dengan `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<bundel CA proxy>` agar unduhan tidak gagal.
   - Tambahkan baris ilustrasi di `web/art/crises.ts`, lalu jalankan `npm run art:build`.
8. **Periksa.**
   ```bash
   npm test                                      # anatomi kartu, sumber, foto, ilustrasi, deck, jawaban krisis
   npm run sim -- --pemula --pack <yyyy-mm>      # kelas campuran sebaiknya bertahan sekitar 60–70%
   npm run sim -- --pack <yyyy-mm>
   npm run lint && npm run build
   ```
   Jika paket terlalu berat atau terlalu ringan, ubah `effects` kartu atau efek responsnya, lalu jalankan simulator lagi.
9. **Kirim.** Buat PR, tunggu CI hijau, merge, lalu lakukan Manual Deploy di Render.

`engine/test/packs.test.ts` adalah daftar periksa yang dijalankan otomatis untuk setiap paket.
