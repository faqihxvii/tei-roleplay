# TEI engine v0

Aturan permainan The Economic Influence versi rebuild, sesuai GDD. Ditulis sebagai TypeScript murni tanpa dependensi UI, deterministik dari seed, dan dipakai bersama oleh server, klien, dan simulator.

- `src/game.ts`: `createGame`, `resolveYear` (urutan resolusi 1–6 di GDD), dan mode preview untuk pertanyaan "bagaimana jika?".
- `src/scoring.ts`: Indeks Negara, ending, dan skor akhir.
- `src/content/`: draf kartu kebijakan (40), kartu krisis (12), dan agenda (16). Teks final ditulis tim konten.
- `print/`: generator kit cetak (kartu, papan, lembar peran, buku fasilitator) langsung dari data engine.
- `sim/`: bot Kooperatif, Egois, Acak, dan Oknum, serta simulator balancing.

```sh
npm test                          # unit test engine
npm run sim                       # 2.000 game per campuran bot
npm run sim -- --games 20000 --check   # keluar dengan kode 1 jika target GDD meleset
npm run print-kit                 # kit cetak prototipe kertas -> engine/print/out/tei-kit-cetak.pdf
```

Keterbatasan bot v0: bot menganggap tim lain tidak berbuat apa-apa, tidak bernegosiasi atau membuat pakta, dan membaca seluruh state. Mogok, Tolak Cetak Uang, dan Suara Publik dipilih dengan aturan sederhana.
