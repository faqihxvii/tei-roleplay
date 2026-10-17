// Balance simulator. Usage: npm run sim -- [--games 2000] [--seed 1] [--check]
import { getCard } from '../src/content/policies';
import { checkTargets, MIXES, simulateMix, type MixReport } from './simulate';

const args = process.argv.slice(2);
const flag = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const games = flag('games', 2000);
const seed = flag('seed', 1);
const strict = args.includes('--check');

const pct = (x: number) => `${(x * 100).toFixed(1)}%`.padStart(6);
const started = Date.now();
const reports: MixReport[] = MIXES.map(mix => simulateMix(mix, games, seed));

console.log(`\nTEI balance simulator — ${games} game per campuran bot, seed ${seed}, ${((Date.now() - started) / 1000).toFixed(1)} dtk\n`);

console.log('Campuran     Kolaps  Bangkrut Lengser Anarki Hiperinf  Sejahtera Bertahan Tertatih  Thn kolaps');
for (const r of reports) {
  const share = (n: number) => pct(n / r.games);
  console.log(
    `${r.mix.padEnd(11)} ${pct(r.collapseRate)}  ${share(r.collapses.bangkrut)}  ${share(r.collapses.lengser)} ${share(r.collapses.anarki)}  ${share(r.collapses.hiperinflasi)}    ${share(r.endings.sejahtera)}   ${share(r.endings.bertahan)}   ${share(r.endings.tertatih)}      ${r.meanCollapseYear?.toFixed(1) ?? '–'}`,
  );
}

console.log('\nRata-rata indikator akhir');
console.log('Campuran     Harga Kerja   Kas Kepercayaan Keresahan');
for (const r of reports) {
  const m = r.finalMeans;
  console.log(`${r.mix.padEnd(11)} ${m.harga.toFixed(1).padStart(5)} ${m.kerja.toFixed(1).padStart(5)} ${m.kas.toFixed(1).padStart(5)} ${m.kepercayaan.toFixed(1).padStart(11)} ${m.keresahan.toFixed(1).padStart(9)}`);
}

const egois = reports.find(r => r.mix === 'egois')!;
console.log('\nAgenda tercapai saat dikejar bot Egois');
for (const [id, { held, achieved }] of Object.entries(egois.agendas).sort()) {
  console.log(`  ${id.padEnd(15)} ${pct(achieved / held)}  (n=${held})`);
}

const totals: Record<string, { available: number; picked: number }> = {};
for (const r of reports.filter(r => r.mix !== 'acak')) {
  for (const [id, c] of Object.entries(r.cards)) {
    const t = (totals[id] ??= { available: 0, picked: 0 });
    t.available += c.available;
    t.picked += c.picked;
  }
}
console.log('\nKartu: dipilih saat ada di tangan (bot Kooperatif/Egois/Oknum)');
for (const [id, { available, picked }] of Object.entries(totals).sort((a, b) => b[1].picked / b[1].available - a[1].picked / a[1].available)) {
  console.log(`  ${pct(picked / available)}  ${getCard(id).role.padEnd(12)} ${getCard(id).name}`);
}

const checks = checkTargets(reports);
const failed = checks.filter(c => !c.pass);
console.log(`\nTarget GDD: ${checks.length - failed.length}/${checks.length} lolos`);
for (const c of failed) console.log(`  GAGAL  ${c.name}: ${c.value} (target ${c.target})`);

if (strict && failed.length > 0) process.exit(1);
