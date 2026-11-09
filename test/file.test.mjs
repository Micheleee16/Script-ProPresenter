// Caricamento di file: testo (.txt, con codifiche diverse) e PDF.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadEngine } from './carica.mjs';

const E = loadEngine();
const FX = (n) => readFileSync(new URL('./fixtures/' + n, import.meta.url));
const txt = (n) => FX(n).toString('utf8');

const itPdf = await E.pdfToText(FX('taste-it.pdf'));
const enPdf = await E.pdfToText(FX('taste-en.pdf'));
const applica = (r) => r.unknown.reduce((t, u) => t.split(u.mark).join(u.suggest), r.text);

test('PDF inglese: testo, accenti curvi e nessuna lettera dubbia', () => {
  assert.deepEqual(enPdf.unknown, []);
  assert.match(enPdf.text, /Taste and See \[Lyrics, 128 bpm, 4\/4\]/);
  assert.match(enPdf.text, /All my life I have witnessed You’re good/);
  assert.match(enPdf.text, /Open your eyes and see Mighty and Great is He \(Mighty and Great is He\)/);
});

test('PDF italiano: lettere speciali segnate, con una proposta giusta', () => {
  assert.equal(itPdf.unknown.length, 2);
  const byCtx = Object.fromEntries(itPdf.unknown.map((u) => [u.ctx.join(','), u.suggest]));
  assert.equal(byCtx['ma{?1}no'], 'tti');
  assert.equal(byCtx['ba{?2}aglia,ro{?2}o'], 'tt');
  assert.match(itPdf.text, /Aﬀ|Afferrerò/);
  assert.ok(!itPdf.text.includes('ﬀ'));                         // le legature diventano lettere normali
  assert.match(itPdf.text, /Tu prepari una tavola/);            // nessuno spazio inventato
  assert.match(itPdf.text, /La tua bontà mi ricorda che/);
});

test('dal PDF alle sezioni: stesse righe dei testi scritti a mano', () => {
  const lib = (raw, l) => Object.fromEntries(Object.entries(E.parseSongText(raw, l).lib).map(([k, s]) => [k, s.lines]));
  assert.deepEqual(lib(enPdf.text, 'Inglese'), lib(txt('taste-en.txt'), 'Inglese'));
  assert.deepEqual(lib(applica(itPdf), 'Italiano'), lib(txt('taste-it.txt'), 'Italiano'));
});

test('dal PDF alla canzone completa: stesso risultato dei testi scritti a mano', () => {
  const daPdf = E.songBlocks(E.makeSong(E.parseSongText(applica(itPdf), 'Italiano'), E.parseSongText(enPdf.text, 'Inglese')));
  const daTxt = E.songBlocks(E.makeSong(E.parseSongText(txt('taste-it.txt'), 'Italiano'), E.parseSongText(txt('taste-en.txt'), 'Inglese')));
  assert.deepEqual(daPdf.errors, []);
  assert.deepEqual(daPdf.blocks, daTxt.blocks);
});

test('PDF non leggibili: errori chiari', async () => {
  await assert.rejects(E.pdfToText(new TextEncoder().encode('ciao, non sono un pdf')), /non sembra un PDF/);
  await assert.rejects(E.pdfToText(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 37, 69, 79, 70])), /pagine|testo/);
});

test('file di testo: UTF-8, con BOM, Windows-1252 e UTF-16', () => {
  const dec = (b) => E.decodeTextFile(Uint8Array.from(b));
  assert.equal(dec(Buffer.from('La tua bontà — “ciao”', 'utf8')), 'La tua bontà — “ciao”');
  assert.equal(dec([0xEF, 0xBB, 0xBF, ...Buffer.from('Verse 1', 'utf8')]), 'Verse 1');
  assert.equal(dec([...Buffer.from('La tua bont'), 0xE0, 0x20, 0x92]), 'La tua bontà ’');       // Windows-1252
  assert.equal(dec([0xFF, 0xFE, ...Buffer.from('Ciao è', 'utf16le')]), 'Ciao è');
});

test('lingua: dal contenuto e dal nome del file', () => {
  assert.equal(E.guessLang(txt('taste-it.txt'), ''), 'it');
  assert.equal(E.guessLang(txt('taste-en.txt'), ''), 'en');
  assert.equal(E.guessLang(itPdf.text, ''), 'it');
  assert.equal(E.guessLang(enPdf.text, ''), 'en');
  assert.equal(E.guessLang('xyz', 'Canzone - ITA.pdf'), 'it');
  assert.equal(E.guessLang('xyz', 'Taste And See - lyrics.pdf'), 'en');
  assert.equal(E.guessLang('Verse 1', 'canzone.txt'), null);
});
