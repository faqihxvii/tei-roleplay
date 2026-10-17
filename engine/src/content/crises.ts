import type { CrisisCard } from '../types';

// Draft v0 crisis deck: 6 categories x 2 cards. Year 3 always draws from 'global'.

export const CRISIS_CARDS: CrisisCard[] = [
  { id: 'c_beras', category: 'pangan', title: 'Beras Mahal, Piring Makin Kecil', effects: { harga: 1, keresahan: 1 }, modifier: { kind: 'scaleTag', tag: 'subsidi', factor: 2 }, ruleText: 'Kartu Subsidi bernilai dua kali lipat, biayanya juga.' },
  { id: 'c_pupuk', category: 'pangan', title: 'Pupuk Subsidi Hilang di Jalan', effects: { harga: 1, kepercayaan: -1 }, modifier: { kind: 'endOfYear', effects: { kerja: -1 } }, ruleText: 'Petani mogok tanam: Lapangan Kerja -1 di akhir tahun.' },
  { id: 'c_minyak', category: 'energi', title: 'Harga Minyak Dunia Melambung', effects: { kas: -1, harga: 1 }, modifier: { kind: 'endOfYear', effects: { kas: -1 } }, ruleText: 'Subsidi energi menyedot Kas -1 di akhir tahun.' },
  { id: 'c_listrik', category: 'energi', title: 'Pemadaman Bergilir', effects: { kerja: -1, keresahan: 1 }, modifier: { kind: 'scaleTag', tag: 'infrastruktur', factor: 2 }, ruleText: 'Kartu Infrastruktur bernilai dua kali lipat, biayanya juga.' },
  { id: 'c_asuransi', category: 'keuangan', title: 'Asuransi Raksasa Gagal Bayar', effects: { kepercayaan: -1, tabungan: -1 }, modifier: { kind: 'freezeLever', lever: 'bunga' }, ruleText: 'Suku bunga dibekukan tahun ini.' },
  { id: 'c_pinjol', category: 'keuangan', title: 'Epidemi Pinjol Ilegal', effects: { keresahan: 1, tabungan: -1 }, modifier: { kind: 'scaleTag', tag: 'edukasi', factor: 2 }, ruleText: 'Kartu edukasi keuangan bernilai dua kali lipat.' },
  { id: 'c_phk', category: 'ketenagakerjaan', title: 'Gelombang PHK Tekstil', effects: { kerja: -2 }, modifier: { kind: 'scaleTag', tag: 'investasi', factor: 2 }, ruleText: 'Kartu Investasi bernilai dua kali lipat, biayanya juga.' },
  { id: 'c_ojol', category: 'ketenagakerjaan', title: 'Mogok Massal Pengemudi Daring', effects: { keresahan: 1, kerja: -1 }, modifier: { kind: 'scaleTag', tag: 'dialog', factor: 2 }, ruleText: 'Kartu dialog buruh bernilai dua kali lipat.' },
  { id: 'c_data', category: 'digital', title: 'Data Kependudukan Bocor', effects: { kepercayaan: -2 }, modifier: { kind: 'freezeLever', lever: 'pajak' }, ruleText: 'DPR membekukan perubahan pajak selama skandal.' },
  { id: 'c_judol', category: 'digital', title: 'Judi Online Menggerogoti Gaji', effects: { tabungan: -1, keresahan: 1 }, modifier: { kind: 'scaleTag', tag: 'bansos', factor: 2 }, ruleText: 'Kartu Bansos bernilai dua kali lipat, biayanya juga.' },
  { id: 'c_rupiah', category: 'global', title: 'Rupiah Anjlok, Impor Mahal', effects: { harga: 2 }, modifier: { kind: 'scaleTag', tag: 'rupiah', factor: 2 }, ruleText: 'Kartu Intervensi Rupiah bernilai dua kali lipat, biayanya juga.' },
  { id: 'c_resesi', category: 'global', title: 'Resesi di Negara Mitra Dagang', effects: { kerja: -1, kas: -1 }, modifier: { kind: 'freezeLever', lever: 'harga' }, ruleText: 'Permintaan lesu: Pengusaha tidak bisa menaikkan harga.' },
];

export const CRISES_BY_ID: ReadonlyMap<string, CrisisCard> = new Map(CRISIS_CARDS.map(card => [card.id, card]));

export function getCrisis(id: string): CrisisCard {
  const card = CRISES_BY_ID.get(id);
  if (!card) throw new Error(`Unknown crisis card: ${id}`);
  return card;
}
