import { getCard } from '../../engine/src/content/policies';
import { INITIAL_STATS } from '../../engine/src/game';
import { ROLE_LABEL } from '../../engine/src/content/roles';
import { Rng } from '../../engine/src/rng';
import { INDICATORS, type GameState, type Indicator, type Stats, type YearLog } from '../../engine/src/types';
import { ADS, COMBO_HEADLINES, HEADLINES, TAG_WEIGHT, VOICES, type Archetype, type HeadlineTag, type Zone } from './content/koran';
import { ACCOUNTS, BUZZER, GOSIP, HASHTAGS, SPIN, VOICE_HANDLES, type Account } from './content/linimasa';
import type { PactRecord, PactResult } from './room';

// The "Harian TEI" front page that closes every year, assembled from what teams actually did
// (GDD, "Media & narasi"). Stored with the year so a refresh never reprints a different paper.

export interface FrontPage {
  year: number;
  /** The year's crisis card, for the front-page illustration (absent in older snapshots). */
  crisisId?: string;
  headline: string;
  subheadline: string;
  voices: { who: string; text: string }[];
  /** Public indicators at the start of the year (before the crisis) and at its end. */
  indicators: { stat: Indicator; from: number; to: number }[];
  ad: string;
  tags: HeadlineTag[];
  variantIds: string[];
  /** Linimasa TEI: the same year as a feed of posts (absent in snapshots from before the feed). */
  posts?: Post[];
  /** Hashtags trending this year, heaviest first, without "#". */
  trending?: string[];
}

export interface Post {
  id: string;
  account: Pick<Account, 'handle' | 'name' | 'role' | 'kind'>;
  text: string;
  /** The post this one replies to. */
  replyTo?: string;
  /** Carries the year's crisis photo. */
  photo?: boolean;
  promoted?: boolean;
  likes: number;
  reposts: number;
}

export interface FrontPageInput {
  state: GameState;
  log: YearLog;
  pacts: PactRecord[];
  pactResults: PactResult[];
  seed: number;
  used: Set<string>;
}

/** Event tags for the year, heaviest first (GDD, "Cara headline disusun"). */
export function yearTags(input: FrontPageInput): HeadlineTag[] {
  const { state, log } = input;
  const d = log.decisions;
  const after = log.statsAfter;
  const before = statsBefore(state, log);
  const tags = new Set<HeadlineTag>();

  for (const collapse of state.log.at(-1) === log ? state.collapses : []) tags.add(`kolaps_${collapse}`);
  if (input.pactResults.some(r => !r.keptFrom || !r.keptTo)) tags.add('pakta_dilanggar');
  if (d.buruh.mogok) tags.add('mogok');
  if (log.events.some(e => e.includes('Lobi') && e.includes('bongkar'))) tags.add('lobi_terbongkar');
  else if (log.deltas.some(x => x.cause === 'lobi:berhasil')) tags.add('lobi_lolos');
  if (log.events.includes('Bank Sentral menolak Cetak Uang')) tags.add('tolak_cetak_uang');
  else if (d.pemerintah.cardId && getCard(d.pemerintah.cardId).tags.includes('cetakUang')) tags.add('cetak_uang');

  const played = Object.values(d).map(x => x.cardId).filter((id): id is string => !!id && !log.cancelled.includes(id)).map(getCard);
  const playedTag = (tag: string) => played.some(card => (card.tags as string[]).includes(tag));
  if (playedTag('phk')) tags.add('phk');
  if (playedTag('investigasi')) tags.add('investigasi');
  if (playedTag('investasi')) tags.add('investasi');
  if (playedTag('infrastruktur')) tags.add('infrastruktur');
  if (playedTag('bansos')) tags.add('bansos');
  if (playedTag('subsidi')) tags.add('subsidi');

  if (after.harga >= 7) tags.add('harga_bahaya');
  if (after.keresahan >= 7) tags.add('keresahan_tinggi');
  if (after.kas <= 2) tags.add('kas_kritis');
  if (d.bankSentral.bunga === 1 && log.deltas.some(x => x.cause === 'tuas:bungaNaik')) tags.add('bunga_naik');
  if (d.bankSentral.bunga === -1 && log.bungaAfter < (state.log.at(-2)?.bungaAfter ?? 3)) tags.add('bunga_turun');
  if (log.deltas.some(x => x.cause === 'tuas:hargaNaik')) tags.add('harga_naik_pengusaha');
  if (log.deltas.some(x => x.cause === 'tuas:upahTinggi')) tags.add('upah_tinggi');
  if (log.deltas.some(x => x.cause === 'tuas:pajakNaik')) tags.add('pajak_naik');
  if (log.deltas.some(x => x.cause === 'tuas:pajakTurun')) tags.add('pajak_turun');
  if (log.deltas.some(x => x.cause === 'tuas:konsumsiHemat')) tags.add('konsumsi_hemat');
  if (log.deltas.some(x => x.cause === 'tuas:konsumsiBelanja')) tags.add('konsumsi_belanja');
  if (d.masyarakat.viral) tags.add('viral');
  if (after.kerja - before.kerja >= 2) tags.add('kerja_naik');
  if (after.kerja - before.kerja <= -2) tags.add('kerja_turun');
  if (after.kepercayaan - before.kepercayaan >= 2) tags.add('kepercayaan_naik');
  if (after.kepercayaan - before.kepercayaan <= -2) tags.add('kepercayaan_turun');
  if (!tags.size) tags.add('tenang');

  return [...tags].sort((a, b) => TAG_WEIGHT[b] - TAG_WEIGHT[a]);
}

export function buildFrontPage(input: FrontPageInput): FrontPage {
  const { state, log } = input;
  const rng = new Rng((input.seed ^ (log.year * 0x9e3779b1)) >>> 0);
  const tags = yearTags(input);
  const variantIds: string[] = [];
  const broken = input.pacts.flatMap(p => {
    const r = input.pactResults.find(x => x.pactId === p.id)!;
    return [...(r.keptFrom ? [] : [{ pelanggar: p.from, korban: p.to }]), ...(r.keptTo ? [] : [{ pelanggar: p.to, korban: p.from }])];
  });
  const fill = (text: string) => broken.length
    ? text.replace(/\{pelanggar\}/g, ROLE_LABEL[broken[0]!.pelanggar]).replace(/\{korban\}/g, ROLE_LABEL[broken[0]!.korban])
    : text;

  // Pick a variant not yet printed this session; fall back to any once a tag runs out.
  const pick = (tag: HeadlineTag): string => {
    const options = HEADLINES[tag].map((text, i) => ({ id: `${tag}:${i}`, text }));
    const fresh = options.filter(o => !input.used.has(o.id) && !variantIds.includes(o.id));
    const chosen = rng.pick(fresh.length ? fresh : options);
    variantIds.push(chosen.id);
    return fill(chosen.text);
  };

  const [first, second] = tags;
  const combo = second && COMBO_HEADLINES.find(c => c.tags.includes(first!) && c.tags.includes(second) && !input.used.has(`combo:${c.tags.join('+')}`));
  let headline: string;
  if (combo) {
    headline = combo.text;
    variantIds.push(`combo:${combo.tags.join('+')}`);
  } else {
    headline = pick(first!);
  }

  const kept = input.pactResults.filter(r => r.keptFrom && r.keptTo).length;
  let subheadline: string;
  if (broken.length) {
    subheadline = `${broken.length} kesepakatan tidak ditepati${kept ? `, ${kept} lainnya bertahan` : ''}.`;
  } else if (kept) {
    subheadline = `Semua ${kept} kesepakatan ditepati. Langka, tapi terjadi.`;
  } else {
    const next = tags.find(t => t !== first && !combo?.tags.includes(t));
    subheadline = next ? pick(next) : 'Tidak ada kesepakatan yang dibuat tahun ini.';
  }

  const collapsed = state.collapses.length > 0 && state.log.at(-1) === log;
  const archetypes = rng.shuffle(Object.keys(VOICES) as Archetype[]).slice(0, 3);
  const voices = archetypes.map(key => {
    const voice = VOICES[key];
    const zone: Zone = collapsed ? 'kolaps' : zoneOf(voice.watches, log.statsAfter);
    return { who: voice.who, text: rng.pick(voice.lines[zone]) };
  });

  const before = statsBefore(state, log);
  const ads = ADS.map((ad, i) => ({ ...ad, id: `iklan:${i}` })).filter(ad => !input.used.has(ad.id));
  const matching = ads.filter(ad => ad.tag !== null && tags.includes(ad.tag));
  const chosenAd = matching[0] ?? (ads.length ? rng.pick(ads) : null);
  if (chosenAd) variantIds.push(chosenAd.id);
  const ad = chosenAd?.text ?? ADS.at(-1)!.text;

  // ---- Linimasa ----
  const after = log.statsAfter;
  const zone: Zone = collapsed ? 'kolaps' : after.keresahan >= 7 || after.harga >= 7 || after.kas <= 2 || after.kepercayaan <= 3 ? 'bahaya' : 'aman';
  // Unrest makes everything louder: likes and reposts grow with Keresahan.
  const loud = (base: number) => Math.round(base * (1 + after.keresahan / 3) * (0.6 + rng.next() * 0.8));
  const post = (id: string, account: Account, text: string, extra: Partial<Post> = {}): Post =>
    ({ id: `${log.year}-${id}`, account: { handle: account.handle, name: account.name, role: account.role, kind: account.kind }, text, likes: loud(40), reposts: loud(8), ...extra });
  const spin = SPIN[first!];
  const official = spin ? post('pejabat', ACCOUNTS[spin.account], rng.pick(spin.lines), { likes: loud(25) }) : null;
  const moved = INDICATORS.filter(stat => after[stat] !== before[stat]);
  const arrow = (stat: Indicator) => (after[stat] > before[stat] ? '▲' : '▼');
  const data = moved.length
    ? `Rekap tahun ${log.year}: ${moved.map(stat => `${INDICATOR_NAME[stat]} ${before[stat]}→${after[stat]} ${arrow(stat)}`).join(' · ')}`
    : `Rekap tahun ${log.year}: semua angka sama persis seperti awal tahun. Mencurigakan.`;
  const lead = post('berita', ACCOUNTS.harianTei, `${headline}. ${subheadline}`, { photo: true, likes: loud(120), reposts: loud(30) });
  const posts: Post[] = [
    lead,
    ...(official ? [official] : []),
    ...(official && BUZZER[zone].length ? [post('buzzer', ACCOUNTS.buzzer, rng.pick(BUZZER[zone]), { replyTo: official.id, likes: loud(6), reposts: loud(1) })] : []),
    post('data', ACCOUNTS.dataWarga, data, { likes: loud(30), reposts: loud(12) }),
    ...voices.map((v, i) => post(`warga${i}`, { handle: VOICE_HANDLES[archetypes[i]!], name: v.who, role: null, kind: 'gosip' }, v.text, { replyTo: lead.id })),
    ...(GOSIP[zone].length ? [post('gosip', ACCOUNTS.gosip, rng.pick(GOSIP[zone]), { likes: loud(60), reposts: loud(20) })] : []),
    post('promosi', { handle: 'PromosiTerpercaya', name: 'Promosi', role: null, kind: 'gosip' }, ad, { promoted: true, likes: loud(2), reposts: 0 }),
  ];
  const trending = tags.slice(0, 4).map(tag => HASHTAGS[tag]).filter(Boolean);

  return {
    year: log.year,
    crisisId: log.crisisId,
    posts,
    trending,
    headline,
    subheadline,
    voices,
    indicators: INDICATORS.map(stat => ({ stat, from: before[stat], to: log.statsAfter[stat] })),
    ad,
    tags,
    variantIds,
  };
}

const INDICATOR_NAME: Record<Indicator, string> = { harga: 'Harga', kerja: 'Lapangan Kerja', kas: 'Kas', kepercayaan: 'Kepercayaan', keresahan: 'Keresahan' };

function zoneOf(stat: 'harga' | 'kerja' | 'kepercayaan' | 'keresahan', stats: Stats): Zone {
  switch (stat) {
    case 'harga': return stats.harga >= 6 ? 'bahaya' : 'aman';
    case 'kerja': return stats.kerja <= 4 ? 'bahaya' : 'aman';
    case 'kepercayaan': return stats.kepercayaan <= 4 ? 'bahaya' : 'aman';
    case 'keresahan': return stats.keresahan >= 7 ? 'bahaya' : 'aman';
  }
}

/** Stats at the start of the year, before its crisis hit. */
function statsBefore(state: GameState, log: YearLog): Stats {
  const index = state.log.indexOf(log);
  return index > 0 ? state.log[index - 1]!.statsAfter : INITIAL_STATS;
}
