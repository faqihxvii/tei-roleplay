import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// The design tokens (web/src/styles/tokens.css) are the only place raw type and colour values live.
// These checks keep the type scale closed: a new size, weight, tracking or colour goes into the tokens
// first, with a name that says what it is for.

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const tokens = readFileSync(path.join(SRC, 'styles', 'tokens.css'), 'utf8');
const styles = readFileSync(path.join(SRC, 'styles.css'), 'utf8');

/** Declarations as [selector, property, value], skipping comments. */
function declarations(css: string): [string, string, string][] {
  const out: [string, string, string][] = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1]!.trim();
    for (const decl of m[2]!.split(';')) {
      const i = decl.indexOf(':');
      if (i > 0) out.push([selector, decl.slice(0, i).trim(), decl.slice(i + 1).trim()]);
    }
  }
  return out;
}

const decls = declarations(styles);
// The logo lockup is drawn in em so it scales as one piece; its proportions are part of the mark.
const isLogo = (selector: string) => /\.tei-/.test(selector);

test('font sizes, weights, tracking and line heights all come from tokens', () => {
  const bad = decls.filter(([selector, prop, value]) => {
    if (isLogo(selector)) return false;
    if (prop === 'font-size') return !/^var\(--(text|display|svg-text)-[a-z0-9-]+\)( !important)?$/.test(value);
    if (prop === 'font-weight') return !/^var\(--weight-[a-z]+\)( !important)?$/.test(value);
    if (prop === 'letter-spacing') return !/^var\(--tracking-[a-z]+\)$/.test(value);
    if (prop === 'line-height') return !/^var\(--leading-[a-z]+\)$/.test(value);
    if (prop === 'font-family') return !/^var\(--font-(sans|serif|mono)\)$/.test(value);
    return false;
  });
  assert.deepEqual(bad, [], 'raw typography values outside the tokens');
});

test('colours in the stylesheet are tokens, apart from the role pattern overlays', () => {
  const bad = decls.filter(([selector, , value]) => /#[0-9a-f]{3,8}\b/i.test(value) || (/rgba?\(/.test(value) && !selector.startsWith('[data-role')));
  assert.deepEqual(bad, [], 'literal colours outside the tokens');
});

test('the type scale stays small', () => {
  const count = (prefix: string) => [...tokens.matchAll(new RegExp(`^\\s*--${prefix}-[a-z0-9-]+:`, 'gm'))].length;
  assert.ok(count('text') + count('display') <= 13, 'sizes');
  assert.equal(count('weight'), 4, 'weights');
  assert.equal(count('font'), 3, 'families');
});

test('every token the stylesheet uses is defined', () => {
  const defined = new Set([...tokens.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map(m => m[1]));
  // Set per element from the engine's role palette or by components at runtime.
  for (const runtime of ['--role', '--role-ink', '--role-pattern', '--hold-ms']) defined.add(runtime);
  for (const m of styles.matchAll(/^\s*(--[a-z0-9-]+):/gm)) defined.add(m[1]);
  const used = new Set([...styles.matchAll(/var\((--[a-z0-9-]+)/g)].map(m => m[1]!));
  assert.deepEqual([...used].filter(u => !defined.has(u)), []);
});
