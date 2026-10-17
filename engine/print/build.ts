// Builds the paper-prototype print kit from engine data, so the cards always match the
// tuned rules. Usage: npm run print-kit  ->  engine/print/out/tei-kit-cetak.pdf (+ .html)
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { AGENDAS } from '../src/content/agendas';
import { CRISIS_CARDS } from '../src/content/crises';
import { POLICY_CARDS } from '../src/content/policies';
import { GLOBAL_SHOCK_YEAR, HAND_SIZE, INITIAL_BUNGA, INITIAL_STATS, MAX_YEARS, RULES } from '../src/game';
import { PACT_TEMPLATES, PACT_TERMS } from '../src/pacts';
import { SCORE } from '../src/scoring';
import { ROLES, type CrisisCard, type PolicyCard, type Role, type Stat } from '../src/types';
import {
  arrows, CATEGORY_LABEL, effectEntries, escapeHtml as e, exactEffects, ROLE_CODE, ROLE_COLOR, ROLE_INK, ROLE_LABEL,
  STAT_LABEL, TAG_LABEL,
} from './labels';

const VERSION = 'v0.2';
const OUT_DIR = path.join(import.meta.dirname, 'out');
const CARDS_PER_PAGE = 9;

const cardCode = new Map<string, string>();
for (const role of ROLES) {
  POLICY_CARDS.filter(c => c.role === role).forEach((card, i) => cardCode.set(card.id, `${ROLE_CODE[role]}-${String(i + 1).padStart(2, '0')}`));
}
CRISIS_CARDS.forEach((card, i) => cardCode.set(card.id, `KRS-${String(i + 1).padStart(2, '0')}`));

const CARD_NOTES: Record<string, string> = {
  gov_cetak: 'Bisa ditolak Bank Sentral. Jika ditolak, kartu batal.',
  ent_lobi: 'Berhasil: Modal naik, Kas negara turun. Terbongkar jika dadu = 1, atau oleh Investigasi Warga tahun ini atau tahun depan.',
  cit_investigasi: 'Membongkar Lobi yang dimainkan tahun ini atau yang lolos tahun lalu.',
  ent_investasi: 'Modal kembali tahun depan, plus untung.',
  cit_pinjol: 'Tahun depan tagihannya datang.',
};

// ---------- building blocks ----------

const page = (content: string, cls = '') => `<section class="page ${cls}">${content}</section>`;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const cardSheet = (title: string, cards: string[]) =>
  chunk(cards, CARDS_PER_PAGE).map((group, i, all) =>
    page(`<div class="sheet-title">${e(title)} <span>· lembar ${i + 1}/${all.length} · potong di garis putus-putus</span></div><div class="grid">${group.join('')}</div>`),
  ).join('');

const roleMark = (role: Role) => `<span class="mark">${ROLE_CODE[role]}</span>`;

function effectList(effects: PolicyCard['effects']): string {
  return effectEntries(effects).map(([stat, n]) => `<li><span>${e(STAT_LABEL[stat])}</span><b class="${n > 0 ? 'up' : 'down'}">${arrows(n)}</b></li>`).join('');
}

// ---------- cards ----------

function policyCard(card: PolicyCard): string {
  const delayed = (card.delayed ?? []).map(d => `<div class="later">${d.inYears === 1 ? 'Tahun depan' : `${d.inYears} tahun lagi`}</div><ul class="fx">${effectList(d.effects)}</ul>`).join('');
  const requires = card.requires ? `<div class="req">Syarat: ${Object.entries(card.requires).map(([s, n]) => `${STAT_LABEL[s as Stat]} ≥ ${n}`).join(', ')}</div>` : '';
  const tags = card.tags.map(t => TAG_LABEL[t]).filter(Boolean).map(t => `<span class="tag">${e(t!)}</span>`).join('');
  const note = CARD_NOTES[card.id] ? `<div class="note">${e(CARD_NOTES[card.id]!)}</div>` : '';
  return `<div class="card" style="--c:${ROLE_COLOR[card.role]};--ci:${ROLE_INK[card.role]}">
    <div class="band">${roleMark(card.role)}${e(ROLE_LABEL[card.role])}<span class="code">${cardCode.get(card.id)}</span></div>
    <div class="body">
      <h3>${e(card.name)}</h3>
      <p class="desc">${e(card.description)}</p>
      <div class="now">Dampak</div><ul class="fx">${effectList(card.effects)}</ul>
      ${delayed}${requires}${note}
      <div class="tags">${tags}</div>
    </div>
  </div>`;
}

function crisisCard(card: CrisisCard): string {
  const fx = effectEntries(card.effects).map(([stat, n]) => `<li><span>${e(STAT_LABEL[stat])}</span><b>${n > 0 ? '+' : '−'}${Math.abs(n)}</b></li>`).join('');
  return `<div class="card crisis">
    <div class="band">KRISIS · ${e(CATEGORY_LABEL[card.category])}<span class="code">${cardCode.get(card.id)}</span></div>
    <div class="body">
      <h3>${e(card.title)}</h3>
      <div class="now">Saat dibuka</div><ul class="fx">${fx}</ul>
      <div class="esc">Tahun ${RULES.eskalasiKrisisMulaiTahun}–${MAX_YEARS}: angka di atas × 2</div>
      <div class="rule"><b>Aturan tahun ini</b>${e(card.ruleText)}</div>
      <div class="question"><b>Bahas di tim</b>${e(card.question)}</div>
      ${card.category === 'global' ? '<div class="note">Kartu Global: selalu dipakai di tahun 3.</div>' : ''}
    </div>
  </div>`;
}

function agendaCard(agenda: (typeof AGENDAS)[number]): string {
  const role = agenda.role;
  const color = role ? ROLE_COLOR[role] : '#000';
  const ink = role ? ROLE_INK[role] : '#fff';
  const footer = role
    ? 'Rahasiakan. Jika negara kolaps, semua tim kalah.'
    : 'Rahasiakan. Kamu menang jika negara kolaps dan identitasmu tidak tertebak oleh mayoritas tim.';
  return `<div class="card agenda" style="--c:${color};--ci:${ink}">
    <div class="band">${role ? roleMark(role) : ''}AGENDA RAHASIA · ${e(role ? ROLE_LABEL[role] : 'Oknum')}</div>
    <div class="body">
      <div class="seal">${role ? '?' : '!'}</div>
      <h3>${e(agenda.name)}</h3>
      <p class="goal">${e(agenda.description)}</p>
      <p class="foot">${e(footer)}</p>
    </div>
  </div>`;
}

// ---------- sheets ----------

function track(stat: string, label: string, start: number, min: number, max: number, danger: (v: number) => boolean, collapse: (v: number) => boolean, note: string): string {
  const cells = Array.from({ length: max - min + 1 }, (_, i) => {
    const v = min + i;
    const cls = [collapse(v) ? 'collapse' : '', danger(v) ? 'danger' : '', v === start ? 'start' : ''].join(' ');
    return `<td class="${cls}">${v}${collapse(v) ? '<small>KOLAPS</small>' : ''}${v === start ? '<small>awal</small>' : ''}</td>`;
  }).join('');
  return `<tr data-stat="${stat}"><th>${e(label)}<small>${e(note)}</small></th>${cells}</tr>`;
}

function boardPage(): string {
  const s = INITIAL_STATS;
  const z = RULES.zonaResah;
  const rows = [
    track('harga', 'Harga', s.harga, 0, 10, v => v >= z.harga, v => v >= 10, `≥ ${z.harga}: Keresahan +1`),
    track('kerja', 'Lapangan Kerja', s.kerja, 0, 10, v => v <= z.kerja, () => false, `≤ ${z.kerja}: Keresahan +1`),
    track('kas', 'Kas Negara', s.kas, 0, 10, v => v <= 2, v => v <= 0, '≤ 2: belanja setengah'),
    track('kepercayaan', 'Kepercayaan Publik', s.kepercayaan, 0, 10, v => v <= z.kepercayaan, v => v <= 0, `≤ ${z.kepercayaan}: Keresahan +1`),
    track('keresahan', 'Keresahan', s.keresahan, 0, 10, v => v >= 7, v => v >= 10, 'tidak turun sendiri'),
  ].join('');
  const bunga = [1, 2, 3, 4, 5].map(v => `<td class="${v === INITIAL_BUNGA ? 'start' : ''} ${v < RULES.inflasiBawaanDiBawahBunga ? 'danger' : ''}">${v}${v === INITIAL_BUNGA ? '<small>awal</small>' : ''}</td>`).join('');
  const years = Array.from({ length: MAX_YEARS }, (_, i) => i + 1).map(y => `<div class="year ${y >= RULES.eskalasiKrisisMulaiTahun ? 'esc' : ''}"><b>Tahun ${y}</b><span>${y === GLOBAL_SHOCK_YEAR ? 'Krisis Global' : 'Kartu krisis'}</span>${y >= RULES.eskalasiKrisisMulaiTahun ? '<em>krisis × 2</em>' : ''}</div>`).join('');
  const pipeline = [2, 3, 4, 5].map(y => `<div class="slot"><b>Jatuh tempo tahun ${y}</b><span>Taruh kartu atau token efek tertunda di sini</span></div>`).join('');
  return page(`
    <div class="board-head"><h1>Papan Negara</h1><span>The Economic Influence · prototipe kertas ${VERSION}</span></div>
    <table class="tracks">${rows}</table>
    <div class="board-row">
      <table class="tracks small"><tr><th>Suku Bunga<small>di bawah ${RULES.inflasiBawaanDiBawahBunga}: Harga +1 tiap akhir tahun</small></th>${bunga}</tr></table>
      <div class="legend"><span class="sw danger"></span>zona bahaya <span class="sw collapse"></span>kolaps (dicek sekali, di akhir tahun)</div>
    </div>
    <div class="years">${years}</div>
    <h2 class="pipe-title">Jalur Kebijakan · efek yang akan datang</h2>
    <div class="pipeline">${pipeline}</div>`, 'landscape');
}

interface RoleSheet {
  focus: string;
  lever: { name: string; options: [string, string][] };
  power: { name: string; text: string };
  resource?: { stat: Stat; max: number; income?: string };
  allies: string;
}

const ROLE_SHEETS: Record<Role, RoleSheet> = {
  pemerintah: {
    focus: 'Mengelola APBN. Hanya kamu yang bisa membelanjakan Kas Negara.',
    lever: { name: 'Pajak', options: [['Naik', 'Kas ▲▲, Kepercayaan ▼, Modal Pengusaha ▼'], ['Tetap', 'Tidak ada efek'], ['Turun', 'Kas ▼▼, Kepercayaan ▲, Modal Pengusaha ▲']] },
    power: { name: 'Hak Anggaran', text: `Kartu bertanda "Belanja negara" hanya bisa dimainkan olehmu. Jika Kas berakhir di 2 atau kurang, semua kartu belanja tahun berikutnya hanya berefek setengah. Negara membayar beban rutin Kas −${RULES.bebanRutinKas} setiap akhir tahun.` },
    allies: 'Butuh Bank Sentral untuk Cetak Uang, dan Masyarakat untuk Kepercayaan.',
  },
  bankSentral: {
    focus: 'Menjaga harga tetap stabil, walau sering tidak populer.',
    lever: { name: 'Suku bunga (geser di papan)', options: [['Naik 1', 'Kredibilitas ▲ sekarang. Tahun depan: Harga ▼, Lapangan Kerja ▼'], ['Tahan', 'Tidak ada efek'], ['Turun 1', 'Tahun depan: Lapangan Kerja ▲, Harga ▲']] },
    power: { name: 'Independen: Tolak Cetak Uang', text: `Putuskan bersama pilihan rahasiamu. Jika Pemerintah memainkan Cetak Uang dan kamu menolak, kartunya batal dan Kredibilitas ▲. Selama bunga di bawah level ${RULES.inflasiBawaanDiBawahBunga}, Harga naik sendiri setiap akhir tahun.` },
    resource: { stat: 'kredibilitas', max: 5 },
    allies: 'Butuh Pemerintah agar tidak belanja berlebihan dan tidak meminta Cetak Uang.',
  },
  pengusaha: {
    focus: 'Mengumpulkan Modal untuk bisnis. Untung jangka pendek, atau investasi untuk tahun depan?',
    lever: { name: 'Harga jual', options: [['Naikkan', 'Modal ▲▲, Harga ▲, Kepercayaan ▼. Kenaikan upah tahun ini dibebankan ke harga, bukan ke Modal.'], ['Tahan', 'Kenaikan upah dibayar dari Modal.']] },
    power: { name: 'Lobi', text: 'Mainkan kartu Lobi Insentif untuk memindahkan uang negara ke kantongmu. Lempar dadu: angka 1 berarti media membongkarnya. Masyarakat juga bisa membongkarnya lewat Investigasi Warga, tahun ini atau tahun depan.' },
    resource: { stat: 'modal', max: 20, income: `Laba usaha: setiap akhir tahun, Modal + (Lapangan Kerja ÷ ${RULES.labaUsahaPembagi}, dibulatkan ke bawah). Bisnismu butuh ekonomi yang hidup.` },
    allies: 'Butuh Serikat Buruh agar tidak mogok, dan Pemerintah untuk keringanan.',
  },
  buruh: {
    focus: 'Memperjuangkan upah dan pekerjaan anggota.',
    lever: { name: 'Tuntutan upah', options: [['Tidak menuntut', 'Solidaritas ▼ (anggota kecewa)'], ['Moderat', 'Kepercayaan ▲, Modal Pengusaha ▼ (atau Harga ▲ jika Pengusaha menaikkan harga)'], ['Tinggi', 'Efek moderat × 2, ditambah Lapangan Kerja ▼ dan Solidaritas ▲']] },
    power: { name: 'Mogok', text: 'Bayar 2 Solidaritas untuk membatalkan kartu Pengusaha tahun ini. Akibatnya: Kas ▼, Keresahan ▲, Modal Pengusaha ▼▼. Ancaman mogok saat Lobi boleh hanya gertakan.' },
    resource: { stat: 'solidaritas', max: 5 },
    allies: 'Butuh Masyarakat untuk dukungan publik saat mogok.',
  },
  masyarakat: {
    focus: 'Menjaga dapur tetap ngebul dan suara warga didengar.',
    lever: { name: 'Konsumsi', options: [['Belanja', 'Lapangan Kerja ▲, Harga ▲, Tabungan ▼ (butuh Tabungan ≥ 1)'], ['Biasa', 'Tidak ada efek'], ['Hemat', 'Harga ▼, Lapangan Kerja ▼, Tabungan ▲']] },
    power: { name: 'Suara Publik', text: 'Pilih satu tim lain. Efek Kepercayaan dari kartu tim itu tahun ini menjadi dua kali lipat, baik naik maupun turun.' },
    resource: { stat: 'tabungan', max: 10, income: `Gaji: Tabungan +1 setiap akhir tahun selama Lapangan Kerja ≥ ${RULES.gajiMinKerja}. Harga ≥ 8 menggerus Tabungan −1.` },
    allies: 'Bisa membongkar Lobi Pengusaha lewat kartu Investigasi Warga.',
  },
};

function roleSheet(role: Role): string {
  const sheet = ROLE_SHEETS[role];
  const options = sheet.lever.options.map(([name, fx]) => `<tr><th>${e(name)}</th><td>${e(fx)}</td></tr>`).join('');
  const resource = sheet.resource
    ? (() => {
        const { stat, max, income } = sheet.resource!;
        const start = INITIAL_STATS[stat];
        const cells = Array.from({ length: max + 1 }, (_, v) => `<td class="${v === start ? 'start' : ''}">${v}</td>`).join('');
        return `<h2>${e(STAT_LABEL[stat])} <small>rahasia · geser token di sini · awal ${start}</small></h2><table class="res"><tr>${cells}</tr></table>${income ? `<p>${e(income)}</p>` : ''}`;
      })()
    : '';
  return page(`
    <div class="role-band" style="--c:${ROLE_COLOR[role]};--ci:${ROLE_INK[role]}">${roleMark(role)}<h1>${e(ROLE_LABEL[role])}</h1></div>
    <p class="focus">${e(sheet.focus)}</p>
    <h2>Tuas: ${e(sheet.lever.name)} <small>pilih satu setiap tahun</small></h2>
    <table class="lever">${options}</table>
    <h2>Kekuatan: ${e(sheet.power.name)}</h2>
    <p>${e(sheet.power.text)}</p>
    ${resource}
    <h2>Setiap tahun</h2>
    <ol class="steps">
      <li>Pegang ${HAND_SIZE} kartu kebijakan peranmu.</li>
      <li>Diskusikan dengan tim, lalu ikut Lobi dengan tim lain.</li>
      <li>Tulis di lembar keputusan: satu kartu (atau tidak memainkan kartu), satu pilihan tuas, dan kekuatan jika dipakai.</li>
      <li>Juru Bicara menyerahkan lembar keputusan tertutup ke fasilitator.</li>
    </ol>
    <div class="ally"><b>Kawan dan lawan</b> ${e(sheet.allies)}</div>
    <div class="agenda-slot">Taruh kartu agenda rahasia di sini, tertutup.</div>`);
}

function rulesPages(): string {
  return page(`
    <h1>Aturan Main</h1>
    <p class="lead">Lima tim menjalankan satu negara selama ${MAX_YEARS} tahun. Negara harus selamat, tetapi setiap tim diam-diam membawa agenda sendiri.</p>
    <div class="cols">
    <div>
      <h2>Persiapan</h2>
      <ol>
        <li>Bagi peserta menjadi lima tim; setiap tim memegang satu Lembar Peran.</li>
        <li>Setiap tim mengambil acak satu dari tiga kartu agenda perannya, tertutup. Mode Oknum: fasilitator menukar satu agenda acak dengan kartu Oknum.</li>
        <li>Pasang token di nilai awal Papan Negara dan Lembar Peran.</li>
        <li>Fasilitator menyusun 5 kartu krisis: 4 acak, ditambah 1 kartu Global di posisi tahun 3.</li>
      </ol>
      <h2>Satu tahun</h2>
      <ol>
        <li><b>Krisis.</b> Buka kartu krisis tahun ini; terapkan angkanya (tahun ${RULES.eskalasiKrisisMulaiTahun}–${MAX_YEARS} dua kali lipat). Setiap tim mengambil ${HAND_SIZE} kartu kebijakan acak dari dek perannya.</li>
        <li><b>Rapat Tim</b> (90 detik). Bahas pilihan di dalam tim.</li>
        <li><b>Lobi Terbuka</b> (90 detik). Bebas bernegosiasi dan membuat pakta. Pakta tidak mengikat; tulis di papan tulis.</li>
        <li><b>Keputusan Rahasia</b> (60 detik). Isi lembar keputusan, serahkan tertutup.</li>
        <li><b>Pengungkapan.</b> Fasilitator membuka semua keputusan dan menjalankan resolusi.</li>
        <li><b>Halaman Depan.</b> Fasilitator membacakan apa yang terjadi. Kembalikan kartu kebijakan ke dek dan kocok.</li>
      </ol>
    </div>
    <div>
      <h2>Membaca kartu</h2>
      <p>Kartu menunjukkan arah dan besarnya dampak: ▲ kecil, ▲▲ sedang, ▲▲▲ besar. Angka pastinya ada di Buku Fasilitator, karena hasil akhirnya bergantung pada keputusan tim lain.</p>
      <h2>Contoh pakta</h2>
      <ul class="pacts">${PACT_TEMPLATES.slice(0, 3).map(p => `<li>${e(PACT_TERMS[p.a].text)}, asalkan ${e(PACT_TERMS[p.b].text.charAt(0).toLowerCase() + PACT_TERMS[p.b].text.slice(1))}.</li>`).join('')}</ul>
      <p class="small">Pakta boleh apa saja yang bisa dicek dari keputusan yang dibuka. Fasilitator mencatat dan menilainya.</p>
      <h2>Kolaps</h2>
      <p>Diperiksa sekali, di akhir tahun. Negara kolaps jika Kas 0 (Bangkrut), Kepercayaan 0 (Lengser), Keresahan 10 (Anarki), atau Harga 10 (Hiperinflasi). Jika negara kolaps, <b>semua tim kalah</b>, kecuali Oknum.</p>
      <h2>Akhir permainan</h2>
      <p>Jika negara selamat sampai akhir tahun ${MAX_YEARS}, setiap tim membuka agendanya. Sebelumnya, setiap tim menebak agenda tim lain.</p>
      <table class="score">
        <tr><th>Agenda tercapai</th><td>+${SCORE.agenda}</td></tr>
        <tr><th>Negara Sejahtera / Bertahan / Tertatih</th><td>+${SCORE.bonus.sejahtera} / +${SCORE.bonus.bertahan} / +${SCORE.bonus.tertatih} untuk semua</td></tr>
        <tr><th>Pakta ditepati / dilanggar</th><td>+1 / −1</td></tr>
        <tr><th>Tebakan agenda yang benar</th><td>+${SCORE.correctGuess} per tebakan</td></tr>
      </table>
      <p class="small">Indeks Negara = rata-rata Lapangan Kerja, Kepercayaan, (10 − Harga), dan (10 − Keresahan). Sejahtera ≥ 7, Bertahan 4–6, Tertatih ≤ 3.</p>
    </div>
    </div>`);
}

function decisionSheet(): string {
  const rows = Array.from({ length: MAX_YEARS }, (_, i) => `<tr><th>Tahun ${i + 1}</th><td></td><td></td><td></td><td></td></tr>`).join('');
  const roles = ROLES.map(r => `<span class="box"></span>${e(ROLE_LABEL[r])}`).join(' ');
  return page(`
    <h1>Lembar Keputusan Tim</h1>
    <p class="roles">Tim: ${roles}</p>
    <table class="decide"><tr><th></th><th>Kartu (kode, atau "tidak ada")</th><th>Tuas</th><th>Kekuatan khusus</th><th>Paraf Juru Bicara</th></tr>${rows}</table>
    <div class="hint">
      <p><b>Tuas:</b> Pemerintah: pajak naik / tetap / turun · Bank Sentral: bunga naik / tahan / turun · Pengusaha: harga naik / tahan · Serikat Buruh: upah tidak / moderat / tinggi · Masyarakat: belanja / biasa / hemat.</p>
      <p><b>Kekuatan khusus:</b> Bank Sentral: tolak Cetak Uang (ya/tidak) · Serikat Buruh: mogok (ya/tidak) · Masyarakat: Suara Publik (nama tim, atau kosong).</p>
      <p>Cetak 5 lembar, satu per tim. Potong per baris jika ingin diserahkan tiap tahun.</p>
    </div>`);
}

// ---------- facilitator book ----------

function facilitatorPages(): string {
  const steps = `
    <h1>Buku Fasilitator</h1>
    <p class="lead">Resolusi satu tahun, dijalankan setelah semua lembar keputusan dibuka. Terapkan efek dalam urutan ini; batasi nilai papan ke 0–10 setelah langkah 4 dan 5.</p>
    <ol class="resolve">
      <li><b>Pembatalan.</b> Jika Pemerintah memainkan Cetak Uang dan Bank Sentral menolak: kartu batal, Kredibilitas +1. Jika Buruh mogok: Solidaritas −2, Kas −1, Keresahan +1, Modal −2, dan kartu Pengusaha batal.</li>
      <li><b>Kartu.</b> Terapkan semua kartu bersamaan (tabel di halaman berikut). Kartu dengan tag yang disebut kartu krisis bernilai ×2. Jika tahun lalu Kas berakhir ≤ 2, kartu Belanja negara bernilai setengah (dibulatkan ke nol). Suara Publik menggandakan efek Kepercayaan kartu tim yang dipilih. Taruh efek "tahun depan" di Jalur Kebijakan.</li>
      <li><b>Lobi.</b> Jika Masyarakat memainkan Investigasi: Lobi tahun ini terbongkar, begitu pula Lobi yang lolos tahun lalu (Modal −3, Kepercayaan −2, Keresahan +1). Jika tidak, lempar dadu: 1 = terbongkar media (Modal −2, Kepercayaan −2, Keresahan +1). Selain itu berhasil: Modal +3, Kas −2.</li>
      <li><b>Tuas.</b> Pajak naik: Kas +2, Kepercayaan −1, Modal −1 (turun: kebalikannya). Bunga naik: Kredibilitas +1; tahun depan Harga −1, Kerja −1. Bunga turun: tahun depan Kerja +1, Harga +1. Harga naik: Modal +2, Harga +1, Kepercayaan −1. Upah tidak naik: Solidaritas −1. Upah moderat/tinggi (n = 1/2): Kepercayaan +n dan Modal −n, atau Harga +n jika Pengusaha menaikkan harga; upah tinggi juga Kerja −1, Solidaritas +1. Belanja: Kerja +1, Harga +1, Tabungan −1. Hemat: Harga −1, Kerja −1, Tabungan +1. Tuas yang dibekukan kartu krisis tidak berefek.</li>
      <li><b>Jalur Kebijakan.</b> Terapkan semua efek yang jatuh tempo tahun ini, lalu buang.</li>
      <li><b>Aturan sistem.</b> Efek akhir tahun kartu krisis. Kas −${RULES.bebanRutinKas}. Harga +1 jika bunga di bawah ${RULES.inflasiBawaanDiBawahBunga}. Modal + ⌊Kerja ÷ ${RULES.labaUsahaPembagi}⌋. Tabungan +1 jika Kerja ≥ ${RULES.gajiMinKerja}. Keresahan +1 untuk setiap kondisi: Harga ≥ ${RULES.zonaResah.harga}, Kerja ≤ ${RULES.zonaResah.kerja}, Kepercayaan ≤ ${RULES.zonaResah.kepercayaan}. Tabungan −1 jika Harga ≥ 8.</li>
      <li><b>Cek kolaps</b> sekali: Kas 0, Kepercayaan 0, Keresahan 10, atau Harga 10. Catat semua yang terjadi; jika ada, permainan berakhir.</li>
    </ol>
    <p class="small">Batas sumber daya pribadi: Solidaritas dan Kredibilitas 0–5, Tabungan 0–10, Modal minimal 0. Sumber data: engine TEI ${VERSION}.</p>`;

  const cardRows = POLICY_CARDS.map(card => `<tr><td class="code">${cardCode.get(card.id)}</td><td>${e(card.name)}</td><td>${e(exactEffects(card.effects))}</td><td>${e((card.delayed ?? []).map(d => exactEffects(d.effects)).join('; ') || '—')}</td><td>${e(card.requires ? exactEffects(card.requires).replace(/\+/g, '≥ ') : '—')}</td><td>${e(card.tags.map(t => TAG_LABEL[t]).filter(Boolean).join(', ') || '—')}</td></tr>`).join('');
  const crisisRows = CRISIS_CARDS.map(card => `<tr><td class="code">${cardCode.get(card.id)}</td><td><b>${e(card.title)}</b><br><span class="narrative">${e(card.narrative)}</span></td><td>${e(exactEffects(card.effects))}</td><td>${e(card.ruleText)}</td></tr>`).join('');
  const agendaRows = AGENDAS.map(a => `<tr><td>${e(a.role ? ROLE_LABEL[a.role] : 'Oknum')}</td><td>${e(a.name)}</td><td>${e(a.description)}</td></tr>`).join('');
  const logRows = Array.from({ length: MAX_YEARS + 1 }, (_, y) => `<tr><th>${y === 0 ? 'Awal' : `Tahun ${y}`}</th>${'<td></td>'.repeat(11)}</tr>`).join('');
  const s = INITIAL_STATS;

  return page(steps) +
    page(`<h1>Angka Pasti Kartu Kebijakan</h1><table class="ref"><tr><th>Kode</th><th>Kartu</th><th>Efek sekarang</th><th>Tahun depan</th><th>Syarat</th><th>Tag</th></tr>${cardRows}</table>`) +
    page(`<h1>Kartu Krisis</h1><table class="ref"><tr><th>Kode</th><th>Krisis dan narasi (bacakan saat kartu dibuka)</th><th>Efek saat dibuka (×2 mulai tahun ${RULES.eskalasiKrisisMulaiTahun})</th><th>Aturan tahun ini</th></tr>${crisisRows}</table>
      <h1>Agenda</h1><table class="ref"><tr><th>Peran</th><th>Agenda</th><th>Syarat tercapai</th></tr>${agendaRows}</table>`) +
    page(`<h1>Catatan Sesi</h1>
      <p class="small">Nilai awal: Harga ${s.harga}, Kerja ${s.kerja}, Kas ${s.kas}, Kepercayaan ${s.kepercayaan}, Keresahan ${s.keresahan}, Bunga ${INITIAL_BUNGA}, Modal ${s.modal}, Solidaritas ${s.solidaritas}, Kredibilitas ${s.kredibilitas}, Tabungan ${s.tabungan}.</p>
      <table class="log"><tr><th></th><th>Harga</th><th>Kerja</th><th>Kas</th><th>Keperc.</th><th>Keresahan</th><th>Bunga</th><th>Modal</th><th>Solid.</th><th>Kredib.</th><th>Tabungan</th><th>Catatan (pakta, momen penting)</th></tr>${logRows}</table>
      <h2>Untuk playtest: catat setelah sesi</h2>
      <ol class="playtest">
        <li>Berapa menit fase Lobi benar-benar dipakai? Apakah tim saling mendatangi?</li>
        <li>Pakta apa yang dibuat, dan mana yang dilanggar?</li>
        <li>Kartu apa yang tidak pernah dipilih, dan kenapa?</li>
        <li>Di mana peserta bingung dengan aturan?</li>
        <li>Skor keseruan dari peserta (1–5), dan satu kalimat yang paling sering diucapkan saat debrief.</li>
      </ol>`);
}

function coverPage(): string {
  const policyPages = Math.ceil(POLICY_CARDS.length / CARDS_PER_PAGE);
  const crisisPages = Math.ceil(CRISIS_CARDS.length / CARDS_PER_PAGE);
  const agendaPages = Math.ceil(AGENDAS.length / CARDS_PER_PAGE);
  return page(`
    <div class="cover">
      <div class="kicker">PROTOTIPE KERTAS ${VERSION}</div>
      <h1 class="title">The Economic Influence</h1>
      <p class="sub">Kit cetak untuk playtest: lima tim, satu negara, lima tahun.</p>
      <table class="contents">
        <tr><th>Komponen</th><th>Isi</th><th>Cetak</th></tr>
        <tr><td>Aturan Main</td><td>1 halaman</td><td>1 per tim</td></tr>
        <tr><td>Papan Negara</td><td>1 halaman, lanskap</td><td>1 (perbesar ke A3 jika bisa)</td></tr>
        <tr><td>Lembar Peran</td><td>5 halaman</td><td>1 set</td></tr>
        <tr><td>Kartu Kebijakan</td><td>${POLICY_CARDS.length} kartu, ${policyPages} halaman</td><td>1 set, potong</td></tr>
        <tr><td>Kartu Krisis</td><td>${CRISIS_CARDS.length} kartu, ${crisisPages} halaman</td><td>1 set, potong</td></tr>
        <tr><td>Kartu Agenda</td><td>${AGENDAS.length} kartu, ${agendaPages} halaman</td><td>1 set, potong</td></tr>
        <tr><td>Lembar Keputusan Tim</td><td>1 halaman</td><td>5 (satu per tim)</td></tr>
        <tr><td>Buku Fasilitator</td><td>6 halaman</td><td>1, jangan dibagikan</td></tr>
      </table>
      <h2>Bahan tambahan</h2>
      <p>1 dadu enam sisi · ±40 token kecil (koin, kancing, atau kertas) · 5 amplop untuk agenda · papan tulis atau kertas plano untuk mencatat pakta · timer.</p>
      <h2>Menyiapkan</h2>
      <ol>
        <li>Cetak di A4, tanpa skala ("actual size"). Kartu berukuran 63 × 88 mm; cetak di kertas 160 gsm atau tempel ke karton.</li>
        <li>Potong kartu di garis putus-putus. Pisahkan dek kebijakan per peran (lihat kode dan warna di pita atas).</li>
        <li>Masukkan agenda per peran ke amplop. Simpan kartu Oknum terpisah untuk Mode Oknum.</li>
      </ol>
      <p class="small">Dibuat otomatis dari data engine, jadi angka di kartu selalu sama dengan aturan hasil tuning. Teks kartu masih draf; teks final ditulis tim konten.</p>
    </div>`);
}

// ---------- assemble ----------

const CSS = `
@page { size: A4; margin: 10mm; }
@page landscape { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, sans-serif; color: #111; font-size: 9.5pt; line-height: 1.35; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { page-break-after: always; break-after: page; }
.page:last-child { page-break-after: auto; }
.landscape { page: landscape; }
h1, h2, h3, .title { font-family: 'Bitstream Charter', 'DejaVu Serif', serif; margin: 0; }
h1 { font-size: 20pt; margin-bottom: 4mm; }
h2 { font-size: 12pt; margin: 4mm 0 1.5mm; }
h2 small { font-family: Inter, sans-serif; font-weight: 400; font-size: 8pt; color: #555; margin-left: 2mm; }
p { margin: 0 0 2mm; }
ol, ul { margin: 0 0 2mm; padding-left: 5mm; }
li { margin-bottom: 1mm; }
.lead { font-size: 11pt; }
.small { font-size: 8pt; color: #444; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
table { border-collapse: collapse; width: 100%; }
.mark { display: inline-block; font: 700 6.5pt Inter, sans-serif; border: 1px solid currentColor; border-radius: 2px; padding: 0 1mm; margin-right: 1.5mm; letter-spacing: .04em; }

/* cover */
.cover .kicker { font: 700 9pt Inter; letter-spacing: .2em; color: #c91212; margin-top: 20mm; }
.cover .title { font-size: 40pt; line-height: 1; margin: 3mm 0; border-bottom: 3px solid #111; padding-bottom: 3mm; }
.cover .sub { font-size: 13pt; margin-bottom: 8mm; }
.contents th, .contents td { text-align: left; border-bottom: 1px solid #ccc; padding: 1.5mm 2mm; }
.contents th { font-size: 8pt; text-transform: uppercase; letter-spacing: .06em; color: #555; }

/* card grid */
.sheet-title { font: 700 9pt Inter; margin-bottom: 2mm; }
.sheet-title span { font-weight: 400; color: #666; }
.grid { display: grid; grid-template-columns: repeat(3, 63mm); grid-auto-rows: 88mm; gap: 0; }
.card { width: 63mm; height: 88mm; border: 0.3mm dashed #999; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
.card .band { background: var(--c, #111); color: var(--ci, #fff); font: 700 7.5pt Inter; letter-spacing: .03em; padding: 2mm 3mm; display: flex; align-items: center; text-transform: uppercase; }
.card .band .code { margin-left: auto; font-weight: 400; opacity: .85; }
.card .body { padding: 2.5mm 3mm; display: flex; flex-direction: column; flex: 1; }
.card h3 { font-size: 13pt; line-height: 1.1; margin-bottom: 1.5mm; }
.card .desc { font-style: italic; font-size: 8pt; color: #333; margin-bottom: 2mm; }
.card .now, .card .later { font: 700 6.5pt Inter; text-transform: uppercase; letter-spacing: .08em; color: #666; margin-top: 1mm; }
.card ul.fx { list-style: none; padding: 0; margin: 0.5mm 0 1mm; }
.card ul.fx li { display: flex; justify-content: space-between; border-bottom: 0.2mm solid #e5e5e5; padding: 0.6mm 0; margin: 0; font-size: 8.5pt; }
.card ul.fx b { font-size: 8pt; letter-spacing: .05em; }
.card .req { font-size: 7.5pt; font-weight: 700; margin-top: 1mm; }
.card .note { font-size: 7pt; color: #333; background: #f3f3f3; padding: 1mm 1.5mm; margin-top: 1.5mm; border-radius: 1mm; }
.card .tags { margin-top: auto; display: flex; flex-wrap: wrap; gap: 1mm; }
.card .tag { font: 600 6.5pt Inter; border: 0.2mm solid #999; border-radius: 1mm; padding: 0.2mm 1mm; color: #444; }
.card.crisis .band { background: #111; }
.card.crisis h3 { font-size: 14pt; }
.card .esc { font: 700 7pt Inter; color: #c91212; margin: 1mm 0; }
.card .rule { font-size: 8pt; border-top: 0.6mm solid #111; padding-top: 1.5mm; margin-top: auto; }
.card .question { font-size: 7.5pt; margin-top: 1.5mm; padding-top: 1.2mm; border-top: 0.3mm dashed #999; }
.card .question b { display: block; font-size: 6.5pt; text-transform: uppercase; letter-spacing: .08em; color: #666; }
.narrative { font-size: 8pt; color: #333; }
.card .rule b { display: block; font-size: 6.5pt; text-transform: uppercase; letter-spacing: .08em; color: #666; }
.card.agenda .body { align-items: center; text-align: center; justify-content: center; }
.card.agenda .seal { width: 14mm; height: 14mm; border-radius: 50%; border: 0.6mm solid #111; background: var(--c); color: var(--ci, #fff); font: 700 18pt 'Bitstream Charter', serif; display: flex; align-items: center; justify-content: center; margin-bottom: 3mm; }
.card.agenda h3 { font-size: 15pt; }
.card.agenda .goal { font-size: 10pt; margin: 2mm 0 4mm; }
.card.agenda .foot { font-size: 7pt; color: #555; margin-top: auto; }

/* board */
.board-head { display: flex; align-items: baseline; gap: 5mm; border-bottom: 2px solid #111; margin-bottom: 4mm; }
.board-head h1 { margin: 0; }
.board-head span { color: #666; }
.tracks th { text-align: left; width: 42mm; font: 700 10pt Inter; padding: 1mm 2mm; }
.tracks th small { display: block; font-weight: 400; font-size: 7pt; color: #555; }
.tracks td { border: 0.4mm solid #111; width: 18mm; height: 14mm; text-align: center; font: 700 12pt 'Bitstream Charter', serif; position: relative; }
.tracks td small { position: absolute; left: 0; right: 0; bottom: 0.6mm; font: 600 5.5pt Inter; letter-spacing: .05em; }
.tracks td.danger { background: repeating-linear-gradient(45deg, #fff, #fff 1.4mm, #e6e6e6 1.4mm, #e6e6e6 2.8mm); }
.tracks td.collapse { background: #111; color: #fff; }
.tracks td.start { box-shadow: inset 0 0 0 0.8mm #c91212; }
.tracks.small { width: auto; }
.board-row { display: flex; align-items: center; gap: 6mm; margin-top: 3mm; }
.legend { font-size: 8pt; display: flex; align-items: center; gap: 1.5mm; }
.sw { display: inline-block; width: 5mm; height: 4mm; border: 0.3mm solid #111; margin-left: 3mm; }
.sw.danger { background: repeating-linear-gradient(45deg, #fff, #fff 1mm, #ccc 1mm, #ccc 2mm); }
.sw.collapse { background: #111; }
.years { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3mm; margin-top: 4mm; }
.year { border: 0.4mm solid #111; height: 22mm; padding: 1.5mm 2mm; display: flex; flex-direction: column; }
.year span { font-size: 7.5pt; color: #555; }
.year em { margin-top: auto; font: 700 7.5pt Inter; color: #c91212; font-style: normal; }
.year.esc { border-color: #c91212; }
.pipe-title { margin-top: 4mm; }
.pipeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }
.slot { border: 0.4mm dashed #111; height: 24mm; padding: 1.5mm 2mm; }
.slot span { display: block; font-size: 7pt; color: #666; }

/* role sheet */
.role-band { background: var(--c); color: var(--ci, #fff); padding: 4mm 5mm; display: flex; align-items: center; margin-bottom: 3mm; }
.role-band h1 { color: var(--ci, #fff); margin: 0; font-size: 26pt; }
.role-band .mark { font-size: 9pt; }
.focus { font-size: 12pt; font-family: 'Bitstream Charter', serif; font-style: italic; }
.lever th { width: 30mm; text-align: left; vertical-align: top; padding: 1.5mm 2mm; border-bottom: 0.3mm solid #ccc; }
.lever td { padding: 1.5mm 2mm; border-bottom: 0.3mm solid #ccc; }
.res td { border: 0.4mm solid #111; height: 10mm; text-align: center; font-weight: 700; }
.res td.start { box-shadow: inset 0 0 0 0.8mm #c91212; }
.ally { margin-top: 3mm; padding: 2mm 3mm; background: #f3f3f3; }
.agenda-slot { margin-top: 5mm; border: 0.5mm dashed #999; height: 30mm; width: 63mm; display: flex; align-items: center; justify-content: center; text-align: center; color: #888; font-size: 8pt; padding: 3mm; }

/* forms and reference */
.roles .box, .box { display: inline-block; width: 3.5mm; height: 3.5mm; border: 0.3mm solid #111; margin: 0 1mm 0 3mm; vertical-align: middle; }
.decide th, .decide td { border: 0.4mm solid #111; padding: 2mm; text-align: left; vertical-align: top; }
.decide td { height: 30mm; }
.decide tr:first-child th { font-size: 8pt; background: #f0f0f0; }
.hint { margin-top: 4mm; font-size: 8.5pt; }
.score th, .score td { border-bottom: 0.3mm solid #ccc; padding: 1.2mm 1.5mm; text-align: left; }
.resolve li { margin-bottom: 2.2mm; }
.ref th, .ref td { border-bottom: 0.3mm solid #ccc; padding: 1mm 1.5mm; text-align: left; vertical-align: top; font-size: 8pt; }
.ref th { background: #f0f0f0; }
.ref td.code { font-weight: 700; white-space: nowrap; }
.log th, .log td { border: 0.4mm solid #111; padding: 1.5mm; font-size: 8pt; text-align: left; }
.log td { height: 16mm; }
.log td:last-child { width: 55mm; }
.playtest li { margin-bottom: 4mm; }
`;

async function main() {
  const byRole = (role: Role) => POLICY_CARDS.filter(c => c.role === role).map(policyCard);
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>TEI kit cetak ${VERSION}</title><style>${CSS}</style></head><body>
    ${coverPage()}
    ${rulesPages()}
    ${boardPage()}
    ${ROLES.map(roleSheet).join('')}
    ${cardSheet('Kartu Kebijakan', ROLES.flatMap(byRole))}
    ${cardSheet('Kartu Krisis', CRISIS_CARDS.map(crisisCard))}
    ${cardSheet('Kartu Agenda Rahasia', AGENDAS.map(agendaCard))}
    ${decisionSheet()}
    ${facilitatorPages()}
  </body></html>`;

  mkdirSync(OUT_DIR, { recursive: true });
  const htmlPath = path.join(OUT_DIR, 'tei-kit-cetak.html');
  const pdfPath = path.join(OUT_DIR, 'tei-kit-cetak.pdf');
  writeFileSync(htmlPath, html);

  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const tab = await browser.newPage();
  await tab.goto(`file://${htmlPath}`);
  await tab.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
  await browser.close();
  console.log(`Kit cetak: ${pdfPath}`);
}

void main();
