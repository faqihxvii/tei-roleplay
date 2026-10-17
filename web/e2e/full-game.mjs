// One host and four phones play a whole game in Chromium: join, teams, five years (votes, a pact,
// SAH, a team played from the console, reveal, front page), guesses and results.
// Needs `npm run room` and `npm run room:web` running. Usage:
//   TEI_BASE=http://<lan-ip>:5173 node web/e2e/full-game.mjs [screenshot-dir]
// Open the host through a LAN address, not localhost, as a facilitator would.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const OUT = process.argv[2];
const BASE = process.env.TEI_BASE ?? 'http://127.0.0.1:5173';
if (OUT) mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-proxy-server'] });
const errors = [];
const shot = (page, name, fullPage = false) => (OUT ? page.screenshot({ path: `${OUT}/${name}`, fullPage }) : null);
const host = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
host.on('pageerror', e => errors.push('host: ' + e.message));
host.on('console', m => { if (m.type() === 'error') errors.push('host console: ' + m.text()); });
await host.goto(BASE + '/host');
await host.getByLabel(/Mode Oknum/).check();
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
await host.getByRole('button', { name: 'Bagi seimbang' }).click();
await host.getByRole('button', { name: 'Mulai briefing peran' }).click();
await host.getByRole('button', { name: 'Mulai Tahun 1' }).click();
await host.locator('.crisis-title').waitFor();
await shot(host, 'y1-krisis.png');

// who plays what
const roleOf = {};
for (const [name, p] of Object.entries(phones)) roleOf[(await p.textContent('.phone-head strong')).trim()] = p;
console.log('teams', Object.keys(roleOf));
const next = async () => {
  await host.keyboard.press('k');
  await host.getByRole('button', { name: 'Lewati fase →' }).click();
  await host.keyboard.press('k');
};
await next(); // rapat
await host.getByText('Rapat Tim', { exact: false }).first().waitFor();
for (const [label, p] of Object.entries(roleOf)) {
  await p.locator('.policy:not(.off)').first().click();
  await p.locator('.seg:not(.off)').last().click();
}
await shot(roleOf['Pemerintah'], 'y1-phone-rapat.png', true);
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
for (const [label, p] of Object.entries(roleOf)) {
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
await shot(host, 'hasil.png', true);
await shot(roleOf['Pemerintah'], 'phone-hasil.png', true);
await browser.close();
// The only expected console error is the missing favicon.
const real = errors.filter(e => !e.includes('404'));
if (real.length) {
  console.error('Errors:', real);
  process.exit(1);
}
console.log('Permainan penuh selesai tanpa error.');
