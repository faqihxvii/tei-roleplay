import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// The design system stays closed. web/src/styles/tokens.css (a Tailwind theme) is the only place raw
// type, colour and spacing values live; base.css and components.css use them through var(), and the
// components use them through Tailwind utilities, never arbitrary values like `p-[13px]`.

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const read = (...p: string[]) => readFileSync(path.join(SRC, ...p), 'utf8');
const tokens = read('styles', 'tokens.css');
const sheets = { 'base.css': read('styles', 'base.css'), 'components.css': read('styles', 'components.css') };
const styles = Object.values(sheets).join('\n');
const components = readdirSync(SRC).filter(f => f.endsWith('.tsx')).map(f => [f, read(f)] as const);

/** Declarations as [selector, property, value], skipping comments and unwrapping @layer/@media. */
function declarations(css: string): [string, string, string][] {
  const out: [string, string, string][] = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1]!.trim();
    for (const decl of m[2]!.split(/;(?![^(]*\))/)) {
      const i = decl.indexOf(':');
      if (i > 0 && !decl.trim().startsWith('--')) out.push([selector, decl.slice(0, i).trim(), decl.slice(i + 1).trim()]);
    }
  }
  return out;
}

const decls = declarations(styles);
// The logo lockup is drawn in em so it scales as one piece; its proportions are part of the mark.
const isLogo = (selector: string) => /\.tei-/.test(selector);
const important = '( !important)?';

test('font sizes, weights, tracking, line heights and families all come from tokens', () => {
  const bad = decls.filter(([selector, prop, value]) => {
    if (isLogo(selector) || value === 'inherit') return false;
    if (prop === 'font-size') return !new RegExp(`^var\\(--(text|svg-text)-[a-z0-9-]+\\)${important}$`).test(value) && value !== 'var(--unit-size)';
    if (prop === 'font-weight') return !new RegExp(`^var\\(--font-weight-[a-z]+\\)${important}$`).test(value);
    if (prop === 'letter-spacing') return !/^var\(--tracking-[a-z]+\)$/.test(value);
    if (prop === 'line-height') return !/^var\(--leading-[a-z]+\)$/.test(value);
    if (prop === 'font-family') return !/^var\(--font-(sans|serif|mono)\)$/.test(value);
    return false;
  });
  assert.deepEqual(bad, [], 'raw typography values outside the tokens');
});

test('colours are tokens, apart from the role pattern overlays', () => {
  const bad = decls.filter(([selector, , value]) => /#[0-9a-f]{3,8}\b/i.test(value) || (/rgba?\(/.test(value) && !selector.startsWith('[data-role')));
  assert.deepEqual(bad, [], 'literal colours outside the tokens');
});

test('padding, margin, gap and offsets use the spacing scale', () => {
  const spacing = /^(padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left)(-[a-z-]+)?$/;
  const bad = decls.filter(([selector, prop, value]) => {
    if (!spacing.test(prop) || isLogo(selector)) return false;
    const rest = value.replace(/var\(--[a-z0-9_-]+\)/g, '').replace(/env\([^)]*\)/g, '');
    return /\d(\.\d+)?(px|rem|em|vh|vw|ch)\b/.test(rest);
  });
  assert.deepEqual(bad, [], 'raw lengths in spacing: use var(--spacing-*)');
});

test('components use theme utilities, never Tailwind arbitrary values', () => {
  const bad = components.flatMap(([file, src]) =>
    [...src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)]
      .flatMap(m => (m[1] ?? m[2] ?? '').split(/\s+/))
      .filter(c => /-\[[^\]]*\]/.test(c) || /^\[[^\]]*\]$/.test(c))
      .map(c => `${file}: ${c}`));
  assert.deepEqual(bad, []);
});

test('the scale stays small', () => {
  const count = (prefix: string) => [...tokens.matchAll(new RegExp(`^\\s*--${prefix}-[a-z0-9-]+:`, 'gm'))].filter(m => !m[0].includes('--line-height')).length;
  assert.ok(count('text') <= 11, 'type sizes');
  assert.equal(count('font-weight'), 4, 'weights');
  assert.equal(count('font') - count('font-weight'), 3, 'families');
  assert.ok(count('spacing') <= 20, 'spacing steps');
});

test('every token the stylesheets use is defined', () => {
  const defined = new Set([...tokens.matchAll(/(--[a-z0-9_-]+):/g)].map(m => m[1]));
  // Set per element from the engine's role palette or by components at runtime.
  for (const runtime of ['--role', '--role-ink', '--role-pattern', '--hold-ms']) defined.add(runtime);
  const used = new Set([...styles.matchAll(/var\((--[a-z0-9_-]+)/g)].map(m => m[1]!));
  assert.deepEqual([...used].filter(u => !defined.has(u)), []);
});
