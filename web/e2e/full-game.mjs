// One host and four phones play a whole game in Chromium: join, teams, five years (votes, a pact,
// SAH, a team played from the console, reveal, front page), guesses and results.
// Needs the server running: `npm run room` with `npm run room:web`, or a production build
// (`npm run build && npm start`, then TEI_BASE=http://127.0.0.1:8787). CI runs it this way. Usage:
//   TEI_BASE=http://<lan-ip>:5173 node web/e2e/full-game.mjs [screenshot-dir]
// Open the host through a LAN address, not localhost, as a facilitator would.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const OUT = process.argv[2];
const BASE = process.env.TEI_BASE ?? 'http://127.0.0.1:5173';
if (OUT) mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-proxy-server'] });
const errors = [];
// Settle finite animations (paper, stamp, ink) first so the picture shows the resting layout.
const settle = page => page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => null))));
const shot = async (page, name, fullPage = false) => { if (!OUT) return; await settle(page); await page.screenshot({ path: `${OUT}/${name}`, fullPage }); };
const host = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })).newPage();
host.on('pageerror', e => errors.push('host: ' + e.message));
host.on('console', m => { if (m.type() === 'error') errors.push('host console: ' + m.text()); });
await host.goto(BASE + '/host');
await host.getByLabel(/Mode Oknum/).check();
await host.getByLabel(/Tahun 0 latihan/).check();
await host.getByLabel(/Kuis pra\/pasca/).check();
await host.getByRole('button', { name: 'Buka ruangan' }).click();
await host.waitForSelector('.room-code');
const code = (await host.textContent('.room-code')).trim();

const names = ['Ani', 'Budi', 'Citra', 'Dodi'];
const phones = {};
for (const name of names) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(name + ': ' + e.message));
  await p.goto(`${BASE}/?r=${code}`);
  await p.getByLabel('Nama panggilan').fill(name);
  await p.getByRole('button', { name: 'Masuk' }).click();
  await p.getByText(`Halo, ${name}.`).waitFor();
  phones[name] = p;
}
// Pre quiz on every phone: first option everywhere, except one player who doesn't know.
for (const [i, p] of Object.values(phones).entries()) {
  await p.locator('.quiz').waitFor();
  for (const fs of await p.locator('.quiz fieldset').all()) await fs.locator('.guess').nth(i === 0 ? 4 : 0).click();
  if (i === 1) await shot(p, 'phone-kuis-pra.png', true);
  await p.getByRole('button', { name: 'Kirim jawaban' }).click();
  await p.getByText('Kuis awal terkirim').waitFor();
}
await host.getByText('dari 4 pemain selesai').waitFor();
await host.getByRole('button', { name: 'Bagi seimbang' }).click();
await host.getByRole('button', { name: 'Mulai briefing peran' }).click();
await host.getByRole('button', { name: 'Mulai Tahun 0 (latihan)' }).click();
await host.locator('.practice-tag').waitFor();

// who plays what
const roleOf = {};
for (const p of Object.values(phones)) roleOf[(await p.textContent('.phone-head strong')).trim()] = p;
console.log('teams', Object.keys(roleOf));
const next = async () => {
  await host.keyboard.press('k');
  await host.getByRole('button', { name: 'Lewati fase →' }).click();
  await host.keyboard.press('k');
};

// Year 0: a guided practice on a throwaway country.
await shot(host, 'y0-krisis.png');
await next(); // rapat
await roleOf['Pemerintah'].locator('.coach').waitFor();
await roleOf['Pemerintah'].locator('.policy:not(.off)').first().click();
await shot(roleOf['Pemerintah'], 'y0-phone-rapat.png', true);
await shot(host, 'y0-rapat.png');
for (let i = 0; i < 4; i++) await next(); // lobi, pengesahan, pengungkapan, koran
await host.locator('.frontpage').waitFor();
await shot(host, 'y0-koran.png', true);
await next(); // practice over
await host.locator('.crisis-title').waitFor();
if (await host.locator('.practice-tag').count()) errors.push('practice did not end');
if (!(await host.locator('.topbar-title').textContent()).includes('Tahun 1')) errors.push('year 1 did not start');
await shot(host, 'y1-krisis.png');

await next(); // rapat
await host.getByText('Rapat Tim', { exact: false }).first().waitFor();
for (const p of Object.values(roleOf)) {
  await p.locator('.policy:not(.off)').first().click();
  // A crisis can freeze a lever for the year (its fieldset is disabled), so pick from the open ones.
  // Pemerintah has only Pajak: when that is frozen there is nothing to set.
  const open = p.locator('fieldset.choice:not([disabled]) .seg:not(.off)');
  if (await open.count()) await open.last().click();
}
await shot(roleOf['Pemerintah'], 'y1-phone-rapat.png', true);
// The bottom tabs: the team's own cards and the country, then back to the task.
{
  const p = roleOf['Pemerintah'];
  await p.getByRole('navigation', { name: 'Bagian layar' }).getByRole('button', { name: 'Timku' }).click();
  await p.locator('.agenda').waitFor();
  await shot(p, 'y1-phone-timku.png', true);
  await p.getByRole('navigation', { name: 'Bagian layar' }).getByRole('button', { name: 'Negara' }).click();
  await p.locator('.board').waitFor();
  await shot(p, 'y1-phone-negara.png', true);
  await p.getByRole('navigation', { name: 'Bagian layar' }).getByRole('button', { name: 'Sekarang' }).click();
  await p.locator('.policy').first().waitFor();
}
await shot(host, 'y1-rapat.png');
await next(); // lobi
const usaha = roleOf['Pengusaha'], buruh = roleOf['Serikat Buruh'];
await usaha.getByRole('tab', { name: 'Pakta' }).click();
await usaha.getByLabel('Dengan tim').selectOption('buruh');
await usaha.getByLabel('Timmu berjanji').selectOption('usahaTidakPhk');
await usaha.getByLabel(/Asalkan Serikat Buruh berjanji/).selectOption('buruhTidakMogok');
await usaha.getByRole('button', { name: 'Ajukan' }).click();
await buruh.getByRole('tab', { name: 'Pakta' }).click();
await buruh.getByRole('button', { name: 'Sepakat' }).click();
await host.locator('.pact-card').waitFor();
await shot(host, 'y1-lobi.png');
await shot(buruh, 'y1-phone-pakta.png', true);
await next(); // pengesahan
for (const p of Object.values(roleOf)) {
  const hold = p.locator('button.hold');
  await hold.scrollIntoViewIfNeeded();
  const box = await hold.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down(); await p.waitForTimeout(1200); await p.mouse.up();
  await p.locator('.stamp').waitFor();
}
await shot(roleOf['Pemerintah'], 'y1-phone-sah.png');
await shot(host, 'y1-pengesahan.png');
// offline team via console
await host.keyboard.press('k');
await host.getByRole('button', { name: 'Isi keputusan' }).click();
await shot(host, 'y1-console.png');
await host.getByRole('button', { name: /Sahkan untuk/ }).click();
await host.keyboard.press('Escape');
await host.locator('.reveal').waitFor();
await host.waitForTimeout(9000);
  await shot(host, 'y1-pengungkapan-mid.png');
  await host.waitForTimeout(20000);
await shot(host, 'y1-pengungkapan.png', true);
await shot(roleOf['Serikat Buruh'], 'y1-phone-reveal.png', true);
await next(); // koran
await host.locator('.frontpage').waitFor();
await shot(host, 'y1-koran.png', true);
// rest of the game
for (let i = 0; i < 40; i++) {
  if (await host.getByText('Tebak agenda').count()) break;
  await next();
  await host.waitForTimeout(150);
}
await shot(host, 'tebak.png');
for (const [label, p] of Object.entries(roleOf)) {
  if (await p.getByRole('button', { name: 'Kirim tebakan' }).count()) {
    await p.locator('.guess').first().click();
    if (label === 'Pemerintah') await shot(p, 'phone-tebak.png', true);
    await p.getByRole('button', { name: 'Kirim tebakan' }).click();
  }
}
await host.locator('.results').waitFor({ timeout: 10000 });
await shot(host, 'debrief-1-hasil.png', true);
await shot(roleOf['Pemerintah'], 'phone-hasil.png', true);

// Guided debrief: every section, driven from the main screen.
await host.getByRole('button', { name: 'Garis waktu' }).click();
await host.locator('.multiples').waitFor();
await host.locator('.panel').first().locator('.hit').first().hover();
await host.locator('.tip').waitFor();
await shot(host, 'debrief-2-garis-waktu.png', true);
await host.locator('.panel').nth(3).locator('.hit').last().click(); // Kepercayaan, last year
await host.locator('.chain-title').waitFor();
await shot(host, 'debrief-3-sebab.png', true);
await shot(roleOf['Serikat Buruh'], 'phone-sebab.png', true);
await host.keyboard.press('ArrowRight');
await host.getByRole('button', { name: 'Buka agenda berikutnya' }).click();
await host.getByRole('button', { name: 'Buka agenda berikutnya' }).click();
await host.locator('.agenda-card.open').nth(1).waitFor();
await shot(host, 'debrief-4-agenda.png', true);
await host.keyboard.press('ArrowRight');
await host.getByRole('tab', { name: /2\. Mengapa/ }).click();
await host.locator('.question').getByText('Mengapa terjadi?').waitFor();
await shot(host, 'debrief-5-diskusi.png', true);
await roleOf['Pengusaha'].locator('.question-mini').waitFor();
await shot(roleOf['Pengusaha'], 'phone-diskusi.png', true);
await host.keyboard.press('ArrowRight');
await host.locator('.topbar-title').getByText('Di Dunia Nyata').waitFor();
await shot(host, 'debrief-6-dunia-nyata.png', true);

// Post quiz: the same five questions, answered by every phone.
await host.keyboard.press('ArrowRight');
await host.locator('.dumbbells').waitFor();
for (const p of Object.values(phones)) {
  await p.locator('.quiz').waitFor();
  for (const fs of await p.locator('.quiz fieldset').all()) await fs.locator('.guess').nth(1).click();
  await p.getByRole('button', { name: 'Kirim jawaban' }).click();
}
await host.locator('.quiz-head').getByText(/Kuis akhir: 4 dari 4/).waitFor();
await host.getByRole('button', { name: 'Tampilkan jawaban benar' }).click();
await host.locator('.db-answer').first().waitFor();
await shot(host, 'debrief-7-kuis.png', true);
await roleOf['Pemerintah'].locator('.review').waitFor();
await shot(roleOf['Pemerintah'], 'phone-kuis-hasil.png', true);

// Two quick arrow presses move two sections, even before the server has answered the first.
await host.keyboard.press('ArrowLeft');
await host.keyboard.press('ArrowLeft');
await host.locator('.topbar-title').getByText('Diskusi').waitFor();

// Penutup: the closing survey on every phone; the main screen shows only the count.
await host.getByRole('button', { name: 'Penutup', exact: true }).click();
await host.locator('.closing').waitFor();
let score = 3;
let commented = false;
for (const p of Object.values(phones)) {
  await p.locator('.survey').waitFor();
  for (const fs of await p.locator('.survey fieldset').all()) await fs.locator('.scale-pick').nth(score - 1).click();
  if (score === 5 && !commented) {
    await p.locator('.survey textarea').fill('Lobi paling seru, tapi waktunya kurang.');
    commented = true;
  }
  await p.getByRole('button', { name: 'Kirim' }).click();
  await p.getByText('Jawabanmu terkirim.').waitFor();
  score = Math.min(5, score + 1);
}
await host.locator('.closing .count').getByText(/4\s*dari 4/).waitFor();
await shot(host, 'debrief-8-penutup.png', true);
await shot(roleOf['Pengusaha'], 'phone-survei-terkirim.png', true);
if (await host.locator('.closing').getByText('Lobi paling seru').count()) errors.push('komentar survei tampil di layar utama');

// Export: CSV files, the session report and the printable Edisi Khusus.
await host.keyboard.press('k');
await host.locator('.survey-table').waitFor();
await shot(host, 'console-survei.png');
{
  const [download] = await Promise.all([host.waitForEvent('download'), host.getByRole('button', { name: 'Laporan sesi (JSON)' }).click()]);
  const { readFileSync } = await import('node:fs');
  const report = JSON.parse(readFileSync(await download.path(), 'utf8'));
  if (report.survey?.n !== 4) errors.push(`laporan: survei ${report.survey?.n}`);
  if (!report.timings?.length) errors.push('laporan: tanpa catatan waktu');
  if (!report.practicePlayed) errors.push('laporan: latihan tidak tercatat');
  if (report.comments?.length !== 1) errors.push('laporan: komentar fasilitator hilang');
  for (const name of ['Ani', 'Budi', 'Citra', 'Dodi', 'Eka', 'Fajar']) if (JSON.stringify(report).includes(`"${name}"`)) errors.push(`laporan memuat nama ${name}`);
}
for (const name of ['Garis waktu (CSV)', 'Keputusan per tim (CSV)', 'Log pakta (CSV)', 'Kuis pra/pasca (CSV)', 'Survei (CSV)']) {
  const [download] = await Promise.all([host.waitForEvent('download'), host.getByRole('button', { name }).click()]);
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  const text = readFileSync(path, 'utf8');
  if (!text.startsWith('\uFEFF') || text.split('\r\n').length < 2) errors.push(`CSV ${name} kosong`);
}
const [edisi] = await Promise.all([host.context().waitForEvent('page'), host.getByRole('link', { name: /Edisi Khusus/ }).click()]);
await edisi.locator('.edisi .frontpage').first().waitFor();
await shot(edisi, 'edisi-khusus.png', true);
// Every cue the main screen asked for, file or not. The print tab stays silent.
const heard = new Set((await host.evaluate(() => window.__teiAudio ?? [])).map(c => c.cue));
for (const cue of ['gabung', 'briefing', 'fase.krisis', 'fase.rapat', 'fase.lobi', 'fase.pengesahan', 'sah', 'fase.pengungkapan', 'kartu.buka', 'fase.koran', 'tebak', 'halaman', 'kuis.jawaban']) {
  if (!heard.has(cue)) errors.push(`cue ${cue} tidak terdengar`);
}
if (!heard.has('akhir.baik') && !heard.has('akhir.kolaps')) errors.push('cue akhir tidak terdengar');
// With the synthesized set installed, cues must actually reach Howler, not just be requested.
const played = new Set((await host.evaluate(() => window.__teiAudio ?? [])).filter(c => c.played).map(c => c.cue));
for (const cue of ['fase.krisis', 'sah', 'fase.koran']) if (!played.has(cue)) errors.push(`cue ${cue} tidak diputar`);
if ((await edisi.evaluate(() => window.__teiAudio ?? null)) !== null) errors.push('tab cetak memutar suara');
await browser.close();
// The only expected console error is the missing favicon.
const real = errors.filter(e => !e.includes('404'));
if (real.length) {
  console.error('Errors:', real);
  process.exit(1);
}
console.log('Permainan penuh selesai tanpa error.');
