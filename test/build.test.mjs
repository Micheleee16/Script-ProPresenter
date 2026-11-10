import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHtml } from '../build.mjs';

test('la pagina si assembla e contiene versione, stile e script', () => {
  const html = buildHtml();
  assert.match(html, /<title>Script Pro<\/title>/);
  assert.doesNotMatch(html, /@@[A-Z]+@@/, 'segnaposto non sostituiti');
  assert.ok(html.length > 100000);
});

test('la pagina non ha dipendenze esterne', () => {
  const html = buildHtml();
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:/i);
  assert.doesNotMatch(html, /@import|url\(["']?https?:/i);
});
