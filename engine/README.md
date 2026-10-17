# TEI engine v0

Aturan permainan The Economic Influence versi rebuild, sesuai GDD. Ditulis sebagai TypeScript murni tanpa dependensi UI, deterministik dari seed, dan dipakai bersama oleh server, klien, dan simulator.

- `src/game.ts`: `createGame`, `resolveYear` (urutan resolusi 1–6 di GDD), dan mode preview untuk pertanyaan "bagaimana jika?".
- `src/scoring.ts`: Indeks Negara, ending, skor akhir, dan voting Oknum.
- `src/pacts.ts`: syarat pakta, pengecekan pakta setelah pengungkapan, dan templat pakta.
- `src/content/`: draf kartu kebijakan (40), kartu krisis (12), dan agenda (16). Teks final ditulis tim konten.
- `print/`: generator kit cetak (kartu, papan, lembar peran, buku fasilitator) langsung dari data engine.
- `sim/`: bot Kooperatif, Egois, Acak, dan Oknum, serta simulator balancing.

```sh
npm test                          # unit test engine
npm run sim                       # 2.000 game per campuran bot
npm run sim -- --games 20000 --check   # keluar dengan kode 1 jika target GDD meleset
npm run print-kit                 # kit cetak prototipe kertas -> engine/print/out/tei-kit-cetak.pdf
```

Cara bot berpikir (v0.3): menebak langkah tim lain dua tingkat (termasuk ancaman mogok dan hemat), menawarkan pakta dari daftar di `src/pacts.ts` saat fase Lobi, lalu menepati atau melanggarnya sesuai wataknya. Di Mode Oknum, setiap tim memvoting tim yang keputusannya paling merugikan negara. Keterbatasan: bot membaca seluruh state termasuk sumber daya rahasia, hanya bernegosiasi dengan pakta templat, dan menilai kerugian dengan sempurna saat voting (batas atas kemampuan menebak Oknum).
