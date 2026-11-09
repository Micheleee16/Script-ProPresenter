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

// ---------------- Word, zip e WhatsApp ----------------
test('WhatsApp: i tre formati (computer, iPhone, Android) danno gli stessi passi', () => {
  const sig = (raw) => { const r = E.readMessage(raw); return JSON.stringify([r.passages.map((p) => [p.label, p.verses]), r.ignored, r.errs.length]); };
  const base = sig(txt('messaggio-2026-11-07.txt'));
  assert.equal(sig(txt('messaggio-ios.txt')), base);
  assert.equal(sig(txt('messaggio-android.txt')), base);
  const r = E.readMessage(txt('messaggio-ios.txt'));
  assert.equal(r.passages.length, 9);
  assert.equal(r.ignored.length, 3);
});

test('WhatsApp: ora con AM/PM e data con punti', () => {
  const r = E.readMessage('[1:05:07 PM, 7.11.2026] Ester: Romani 6:5-6\n5 Testo uno\n6 Testo due\n7/11/26, 1:06 PM - Ester: ciao a tutti');
  assert.equal(r.passages.length, 1);
  assert.equal(r.passages[0].verses.length, 2);
  assert.equal(r.ignored.length, 1);
});

test('Word: il testo di un .docx, una riga per paragrafo', async () => {
  const r = await E.fileToText('Taste and See - ITA.docx', new Uint8Array(FX('taste-it.docx')));
  assert.deepEqual(r.unknown, []);
  assert.match(r.text, /^Taste and See – VIVE WORSHIP/);
  assert.match(r.text, /\nLibero\n/);                                 // due "run" nello stesso paragrafo = una parola
  const lib = (raw) => Object.fromEntries(Object.entries(E.parseSongText(raw, 'Italiano').lib).map(([k, s]) => [k, s.lines]));
  assert.deepEqual(lib(r.text), lib(txt('taste-it.txt')));
});

test('zip di WhatsApp: si legge _chat.txt, con segni invisibili e BOM', async () => {
  const r = await E.fileToText('WhatsApp Chat.zip', new Uint8Array(FX('whatsapp-esportazione.zip')));
  assert.ok(!r.text.startsWith('﻿'));
  const m = E.readMessage(r.text);
  assert.equal(m.passages.length, 9);
  assert.equal(m.ignored.length, 3);
});

test('zip senza testo e file non zip: errori chiari', async () => {
  await assert.rejects(E.zipTextFile(new Uint8Array(FX('taste-it.docx'))), /Nello zip non trovo un file di testo/);
  await assert.rejects(E.docxToText(new Uint8Array(FX('whatsapp-esportazione.zip'))), /Non è un documento Word/);
  assert.throws(() => E.zipList(new Uint8Array([1, 2, 3, 4])), /non sembra un file zip/);
});

test('fileToText: PDF, testo e codifiche passano dallo stesso ingresso', async () => {
  assert.match((await E.fileToText('x.pdf', new Uint8Array(FX('taste-en.pdf')))).text, /Sure as the sun/);
  assert.equal((await E.fileToText('x.txt', new TextEncoder().encode('ciao è'))).text, 'ciao è');
});

// ---------------- video e colori delle canzoni ----------------
const songBl = () => E.songBlocks(E.makeSong(E.parseSongText(txt('taste-it.txt'), 'Italiano'), E.parseSongText(txt('taste-en.txt'), 'Inglese')));
const videoCue = (bytes) => {
  const top = E.parse(bytes), cues = {}; top.filter((x) => x.f === 13).forEach((x) => { cues[Buffer.from(E.path(x.v, 1, 1)).toString()] = x.v; });
  const g = E.parse(top.filter((x) => x.f === 12)[0].v);
  return cues[Buffer.from(E.parse(g.filter((y) => y.f === 2)[0].v)[0].v).toString()];
};
const num = (c, p) => Buffer.from(E.pick(c, p)).readDoubleLE(0);
const str = (c, p) => Buffer.from(E.pick(c, p)).toString();
const A = [[10, 1], [20, 0], [5, 0]];

test('video di sfondo diverso: nome, percorsi, durata e dimensioni', () => {
  const bl = songBl().blocks, info = { name: 'Mio video.mp4', duration: 12.5, w: 1920, h: 1080 };
  const bytes = E.buildSongFile(bl, 'P', { video: true, videoInfo: info });
  assert.deepEqual(E.verifySongFile(bytes, bl, { video: true }), []);
  const c = videoCue(bytes);
  assert.equal(str(c, [[2, 0]]), 'Mio video.mp4');
  assert.equal(str(c, [[10, 0], [3, 0], [2, 0]]), 'Mio video.mp4');
  assert.equal(str(c, A.concat([[2, 0], [1, 0]])), 'file:///Users/michele/Documents/ProPresenter/Media/Assets/Mio%20video.mp4');
  assert.equal(str(c, A.concat([[2, 0], [4, 0], [2, 0]])), 'Media/Assets/Mio video.mp4');
  assert.equal(str(c, A.concat([[6, 0], [5, 0], [1, 0], [1, 0]])), 'file:///Users/michele/Documents/ProPresenter/Media/Assets/Mio%20video.mp4');
  assert.equal(num(c, [[10, 1], [8, 0]]), 12.5);
  assert.equal(num(c, A.concat([[6, 0], [3, 0], [3, 0]])), 12.5);
  assert.equal(num(c, A.concat([[6, 0], [1, 0], [5, 0], [1, 0]])), 1920);
  assert.equal(num(c, A.concat([[6, 0], [1, 0], [5, 0], [2, 0]])), 1080);
});

test('video senza durata nota: si cambia il nome e il resto resta del modello', () => {
  const bl = songBl().blocks;
  const c = videoCue(E.buildSongFile(bl, 'P', { video: true, videoInfo: { name: 'Altro.mov' } }));
  assert.equal(str(c, [[2, 0]]), 'Altro.mov');
  assert.equal(num(c, [[10, 1], [8, 0]]), 23.58333396911621);
  assert.equal(num(c, A.concat([[6, 0], [1, 0], [5, 0], [1, 0]])), 6336);
});

test('il video del modello resta com\'era se non si sceglie altro', () => {
  const bl = songBl().blocks;
  const a = E.buildSongFile(bl, 'P', { video: true }), b = E.buildSongFile(bl, 'P', { video: true, videoInfo: { name: 'Sfondo 1.mov' } });
  assert.equal(str(videoCue(a), A.concat([[2, 0], [1, 0]])), 'file:///Users/michele/Documents/ProPresenter/Media/Assets/Sfondo%201.mov');
  assert.equal(str(videoCue(b), [[2, 0]]), 'Sfondo 1.mov');
});

test('colori scelti per Intro, Instrumental e Outro', () => {
  const bl = songBl().blocks;
  const bytes = E.buildSongFile(bl, 'P', { video: false, colors: { intro: [1, 0, 0, 1], inst: [0, 1, 0, 1], outro: [0, 0, 1, 1] } });
  const rgb = (name) => {
    const g = E.parse(bytes).filter((x) => x.f === 12).map((x) => E.parse(E.parse(x.v)[0].v)).find((h) => Buffer.from(h.find((x) => x.f === 2).v).toString() === name);
    return E.parse(g.find((x) => x.f === 3).v).map((x) => Buffer.from(x.v).readFloatLE(0));
  };
  assert.deepEqual(rgb('Intro'), [1, 0, 0, 1]);
  assert.deepEqual(rgb('Instrumental'), [0, 1, 0, 1]);
  assert.deepEqual(rgb('Outro'), [0, 0, 1, 1]);
  assert.deepEqual(E.verifySongFile(bytes, bl, { video: false }), []);
});
