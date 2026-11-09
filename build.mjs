#!/usr/bin/env node
// Assembla dist/Versi.html partendo dai sorgenti in src/ e dal template in template/.
// Uso:  node build.mjs        (nessuna dipendenza, serve solo Node 18 o più recente)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const rd = (p) => readFileSync(join(ROOT, p), 'utf8');

// L'ordine conta: ogni file usa le funzioni di quelli che lo precedono.
export const ENGINE = [
  'protobuf', 'bytes', 'rtf', 'bibbia', 'parser',
  'raggruppamento', 'presentazione', 'verifica', 'canzoni', 'canzone', 'pdf', 'office', 'zip',
].map((n) => `src/engine/${n}.js`);

export const UI = [
  'base', 'anteprima', 'controllo', 'canzoni', 'scarica', 'immagini', 'ingrandimento', 'avvio',
].map((n) => `src/ui/${n}.js`);

export const TEMPLATE_FILE = 'template/Messaggio_Modena.pro';
export const SONG_TEMPLATE_FILE = 'template/Canzone_ITA-ENG.pro';

export function templateLine() {
  const b64 = readFileSync(join(ROOT, TEMPLATE_FILE)).toString('base64');
  const song = readFileSync(join(ROOT, SONG_TEMPLATE_FILE)).toString('base64');
  return `var TEMPLATE_B64 = "${b64}";\nvar SONG_TEMPLATE_B64 = "${song}";\n`;
}

// Codice dell'engine (formato ProPresenter, lettura del messaggio, zip) con il template incorporato.
export function engineSource() {
  return templateLine() + '\n' + ENGINE.map(rd).join('');
}

export function buildHtml() {
  const script = "<script>\n(function(){\n'use strict';\n" + engineSource() + UI.map(rd).join('') + '})();\n</script>';
  // si usano funzioni, non stringhe, per evitare che "$&" nel codice sia interpretato da replace()
  const version = JSON.parse(rd('package.json')).version;
  return rd('src/index.html')
    .replace('@@VERSIONE@@', () => version)
    .replace('@@STILE@@\n', () => '')
    .replace('<style>\n', () => '<style>\n' + rd('src/ui/stile.css'))
    .replace('<script>\n@@SCRIPT@@\n', () => script + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = join(ROOT, 'dist', 'Versi.html');
  mkdirSync(dirname(out), { recursive: true });
  const html = buildHtml();
  writeFileSync(out, html);
  console.log(`dist/Versi.html scritto (${(html.length / 1024).toFixed(0)} KB)`);
}
