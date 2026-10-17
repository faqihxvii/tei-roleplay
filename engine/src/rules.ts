// Kept apart from game.ts so screens that only quote a rule (the phone's role card) do not pull in
// the whole engine.

/** Balancing knobs for the year-end system rules (GDD, "Aturan sistem akhir tahun"). */
export const RULES = {
  /** Routine spending (salaries, debt interest) taken from Kas every year. */
  bebanRutinKas: 1,
  /** Chance a successful lobby is exposed by the press in the same year: a 1 on a six-sided die. */
  lobiMediaChance: 1 / 6,
  /** Rakyat stays restless: Keresahan only falls through cards, never on its own. */
  keresahanTurunSaatAman: false,
  /** Prices creep up by 1 every year while the policy rate sits below this level. */
  inflasiBawaanDiBawahBunga: 3,
  /** Pengusaha earns floor(Lapangan Kerja / this) Modal a year: business needs a working economy. */
  labaUsahaPembagi: 3,
  /** Households save 1 Tabungan a year while Lapangan Kerja is at least this. */
  gajiMinKerja: 5,
  /** From this year on, a crisis hits twice as hard when it is revealed. */
  eskalasiKrisisMulaiTahun: 3,
  /** Each of these conditions adds 1 Keresahan at year end. */
  zonaResah: { harga: 6, kerja: 4, kepercayaan: 4 },
} as const;
