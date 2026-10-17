import { getCrisis } from '../../engine/src/content/crises';
import { getCard } from '../../engine/src/content/policies';
import { ROLE_LABEL } from '../../engine/src/content/roles';
import { INDICATORS, type Decision, type Delta, type Indicator, type Role, type Stat, type YearDecisions } from '../../engine/src/types';

// Plain-language names for everything the reveal and the front page talk about.

export const STAT_NAME: Record<Stat, string> = {
  harga: 'Harga',
  kerja: 'Lapangan Kerja',
  kas: 'Kas Negara',
  kepercayaan: 'Kepercayaan',
  keresahan: 'Keresahan',
  modal: 'Modal',
  solidaritas: 'Solidaritas',
  kredibilitas: 'Kredibilitas',
  tabungan: 'Tabungan',
};

/** The private resource each team sees on its own phone, if any. */
export const OWN_RESOURCE: Record<Role, Stat | null> = {
  pemerintah: null,
  bankSentral: 'kredibilitas',
  pengusaha: 'modal',
  buruh: 'solidaritas',
  masyarakat: 'tabungan',
};

export const isIndicator = (stat: Stat): stat is Indicator => (INDICATORS as readonly string[]).includes(stat);

const SYSTEM: Record<string, string> = {
  bebanRutin: 'Gaji pegawai dan cicilan utang negara',
  inflasiBawaan: 'Bunga rendah membuat harga merayap naik',
  labaUsaha: 'Laba usaha dari ekonomi yang berjalan',
  gaji: 'Gaji masuk, warga menabung',
  hargaTinggi: 'Harga tinggi membuat warga resah',
  pengangguran: 'Pengangguran membuat warga resah',
  tidakPercaya: 'Warga tidak percaya pemerintah',
  aman: 'Keadaan tenang',
  inflasiTabungan: 'Inflasi menggerus tabungan',
};

/** Which team a cause belongs to, for the reveal's per-team grouping. */
export function causeRole(cause: string): Role | null {
  const [kind, id = ''] = cause.replace(/^jalur:/, '').split(':');
  if (kind === 'kartu') return getCard(id).role;
  if (kind === 'lobi') return 'pengusaha';
  if (kind === 'kekuatan') return id === 'mogok' ? 'buruh' : 'bankSentral';
  if (kind === 'tuas') {
    if (id.startsWith('pajak')) return 'pemerintah';
    if (id.startsWith('bunga')) return 'bankSentral';
    if (id.startsWith('harga')) return 'pengusaha';
    if (id.startsWith('upah')) return 'buruh';
    if (id.startsWith('konsumsi')) return 'masyarakat';
  }
  return null;
}

export function causeLabel(cause: string, decisions?: YearDecisions): string {
  if (cause.startsWith('jalur:')) return `Efek tertunda: ${causeLabel(cause.slice(6), decisions)}`;
  const [kind, id = ''] = cause.split(':');
  switch (kind) {
    case 'krisis': return `Krisis: ${getCrisis(id).title}`;
    case 'kartu': {
      const card = getCard(id);
      return `${ROLE_LABEL[card.role]}: ${card.name}`;
    }
    case 'kekuatan': return id === 'mogok' ? 'Serikat Buruh mogok' : 'Bank Sentral menolak Cetak Uang';
    case 'lobi':
      if (id === 'berhasil') return 'Lobi Pengusaha lolos';
      if (id === 'terbongkar') return 'Lobi Pengusaha terbongkar';
      return 'Lobi tahun lalu terbongkar investigasi warga';
    case 'tuas':
      switch (id) {
        case 'pajakNaik': return 'Pemerintah menaikkan pajak';
        case 'pajakTurun': return 'Pemerintah menurunkan pajak';
        case 'bungaNaik': return 'Bank Sentral menaikkan bunga';
        case 'bungaTurun': return 'Bank Sentral menurunkan bunga';
        case 'hargaNaik': return 'Pengusaha menaikkan harga';
        case 'upahTetap': return 'Upah tidak naik';
        case 'upahNaik': return decisions?.pengusaha.hargaNaik ? 'Upah naik, Pengusaha menaikkan harga' : 'Upah naik, ditanggung Pengusaha';
        case 'upahTinggi': return 'Tuntutan upah tinggi';
        case 'konsumsiBelanja': return 'Warga belanja';
        case 'konsumsiHemat': return 'Warga berhemat';
      }
      return id;
    case 'sistem': return SYSTEM[id] ?? id;
    default: return cause;
  }
}

/** One line per choice, as the class sees it during the reveal. */
export function describeDecision(decision: Decision, bunga: number): string[] {
  const lines: string[] = [decision.cardId ? `Kartu: ${getCard(decision.cardId).name}` : 'Tidak memainkan kartu'];
  switch (decision.role) {
    case 'pemerintah':
      lines.push(decision.pajak === 1 ? 'Pajak naik' : decision.pajak === -1 ? 'Pajak turun' : 'Pajak tetap');
      break;
    case 'bankSentral':
      lines.push(`${decision.bunga === 1 ? 'Bunga naik' : decision.bunga === -1 ? 'Bunga turun' : 'Bunga ditahan'} (level ${bunga})`);
      if (decision.tolakCetakUang) lines.push('Menolak Cetak Uang');
      break;
    case 'pengusaha':
      lines.push(decision.hargaNaik ? 'Harga naik' : 'Harga ditahan');
      break;
    case 'buruh':
      lines.push(['Tidak menuntut upah', 'Tuntutan upah moderat', 'Tuntutan upah tinggi'][decision.upah]!);
      if (decision.mogok) lines.push('MOGOK');
      break;
    case 'masyarakat':
      lines.push({ hemat: 'Konsumsi hemat', biasa: 'Konsumsi biasa', belanja: 'Konsumsi belanja' }[decision.konsumsi]);
      if (decision.viral) lines.push(`Memviralkan ${ROLE_LABEL[decision.viral]}`);
      break;
  }
  return lines;
}

export interface CauseGroup {
  cause: string;
  label: string;
  role: Role | null;
  changes: { stat: Stat; amount: number }[];
}

/** Groups deltas by cause in resolution order, merging repeats and dropping zero sums. */
export function groupDeltas(deltas: Delta[], decisions: YearDecisions | undefined, keep: (stat: Stat) => boolean): CauseGroup[] {
  const groups: CauseGroup[] = [];
  for (const delta of deltas) {
    if (!keep(delta.stat)) continue;
    let group = groups.find(g => g.cause === delta.cause);
    if (!group) {
      group = { cause: delta.cause, label: causeLabel(delta.cause, decisions), role: causeRole(delta.cause), changes: [] };
      groups.push(group);
    }
    const change = group.changes.find(c => c.stat === delta.stat);
    if (change) change.amount += delta.amount;
    else group.changes.push({ stat: delta.stat, amount: delta.amount });
  }
  for (const group of groups) group.changes = group.changes.filter(c => c.amount !== 0);
  return groups.filter(g => g.changes.length);
}
