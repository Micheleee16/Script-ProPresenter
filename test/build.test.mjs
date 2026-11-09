import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildHtml } from '../build.mjs';

test('dist/Versi.html è aggiornato rispetto ai sorgenti (esegui: node build.mjs)', () => {
  assert.equal(readFileSync(new URL('../dist/Versi.html', import.meta.url), 'utf8'), buildHtml());
});

test('la pagina non ha dipendenze esterne', () => {
  const html = buildHtml();
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:/i);
  assert.doesNotMatch(html, /@import|url\(["']?https?:/i);
});
