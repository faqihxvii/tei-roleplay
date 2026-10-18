// The phone's first load must stay under 300 KB gzip (docs/art-audio.md): entry script and its static
// imports, the stylesheet, and the Latin fonts a phone actually fetches. Run after `npm run build`.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 300;
const dir = 'web/dist';
const html = readFileSync(`${dir}/index.html`, 'utf8');
const entries = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map(m => m[1]);

const seen = new Set();
const visit = file => {
  if (seen.has(file)) return;
  seen.add(file);
  if (!file.endsWith('.js')) return;
  const code = readFileSync(`${dir}/${file}`, 'utf8');
  // Static imports only: chunks behind import() (the host screen, Howler) load later or never on a phone.
  for (const m of code.matchAll(/(?:^|[;\s}])(?:import|export)\s*(?:[\w*{}\s,$]+from\s*)?["']\.\/([^"']+\.js)["']/g)) visit(`assets/${m[1]}`);
};
entries.forEach(visit);

const fonts = readdirSync(`${dir}/assets`).filter(f => /^(geist|geist-mono|gelasio)-latin-wght-normal-.*\.woff2$/.test(f)).map(f => `assets/${f}`);
const rows = [...seen, ...fonts].map(file => {
  const raw = readFileSync(`${dir}/${file}`);
  return { file, kb: (file.endsWith('.woff2') ? raw.length : gzipSync(raw).length) / 1024 };
});
const total = rows.reduce((a, r) => a + r.kb, 0);
for (const r of rows) console.log(`${r.kb.toFixed(1).padStart(7)} KB  ${r.file}`);
console.log(`${total.toFixed(1).padStart(7)} KB  muatan awal HP (anggaran ${BUDGET_KB} KB)`);
if (total > BUDGET_KB) {
  console.error(`Melebihi anggaran sebesar ${(total - BUDGET_KB).toFixed(1)} KB.`);
  process.exit(1);
}
