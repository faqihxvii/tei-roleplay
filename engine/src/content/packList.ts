// The crisis packs a host can choose, without their cards, so the setup screen can list them without
// shipping every card to the browser. crises.ts attaches the cards; the newest pack comes first and is
// the default for new rooms (docs/paket-krisis.md explains how to add next month's).

export interface PackChoice { id: string; title: string; blurb: string }

export const PACK_CHOICES: readonly PackChoice[] = [
  { id: '2026-10', title: 'Paket terbaru (Okt 2026)', blurb: 'Tujuh krisis dari berita sebulan terakhir: cabai mahal, antre BBM, bursa anjlok, dan lainnya.' },
  { id: 'klasik', title: 'Klasik', blurb: 'Dua belas krisis bawaan dari peristiwa ekonomi 2019–2024.' },
];

export const LATEST_PACK = PACK_CHOICES[0]!.id;
export const CLASSIC_PACK = 'klasik';
