// Controllo del testo perso, divisione corretta a mano, rilettura finale del file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadEngine } from './carica.mjs';

const E = loadEngine();
const read = (s) => E.readMessage(s);
const T = (n) => `Testo di prova del versetto ${n}`;       // testo finto, NON biblico
const IMGS = { bg: { name: 'Sfondo versi.png' }, sep: { name: 'Ascensione.png' } };

// ---------------- testo perso ----------------
test('testo perso: un messaggio pulito non ha avvisi e conta 0 parole fuori', () => {
  const r = read(`Romani 6:5-6\n5 ${T('uno')}\n6 ${T('due')}`);
  assert.equal(r.warns.length, 0);
  assert.equal(r.check.left, 0);
  assert.ok(r.check.words > 0);
});

test('testo perso: il testo dopo una riga vuota viene segnalato con le parole giuste', () => {
  const r = read(`Romani 6:5-6\n5 ${T('uno')}\n6 ${T('due')}\n\nBuona domenica a tutti!`);
  assert.equal(r.passages.length, 1);
  assert.equal(r.check.left, 4);
  const w = r.warns.map((x) => x.msg).join(' ');
  assert.match(w, /4 parole/);
  assert.match(w, /Buona domenica a tutti/);
  assert.ok(!r.passages[0].verses[1][1].includes('Buona'));      // e infatti non è nella slide
});

test('testo perso: le virgolette e la punteggiatura tolte non contano come parole perse', () => {
  const r = read(`Atti 5:28-29\n28 «dicendo: “Non vi abbiamo”,\n29 Ma Pietro rispose,`);
  assert.equal(r.check.left, 0);
});

test('testo perso: il testo in mezzo a due passi non è del primo', () => {
  const r = read(`Romani 6:5-6\n5 ${T('a')}\n6 ${T('b')}\n\nAtti 2:1-2\n1 ${T('c')}\n2 ${T('d')}`);
  assert.equal(r.check.left, 0);
  assert.equal(r.warns.length, 0);
});

test('testo perso: i passi con errore non contano', () => {
  const r = read(`Romani 6:5-8\n5 solo un versetto senza numeri`);
  assert.equal(r.passages.length, 0);
  assert.equal(r.check.words, 0);
});

test('testo perso: sul messaggio vero non ci sono parole perse', () => {
  const raw = readFileSync(new URL('./fixtures/messaggio-2026-11-07.txt', import.meta.url), 'utf8');
  const r = read(raw);
  assert.equal(r.check.left, 0);
  assert.ok(r.check.words > 800);
});

// ---------------- divisione a mano ----------------
const V = (n, len) => [n, 'x'.repeat(len - String(n).length - 1)];
const nums = (g) => g.map((s) => s.map((v) => v[0]).join('+')).join(' | ');

test('groupWith senza correzioni è identico a group', () => {
  const casi = [[V(1, 50), V(2, 60), V(3, 150), V(4, 30), V(5, 30), V(6, 90)], [V(1, 130), V(2, 40)], [V(7, 10)]];
  for (const vs of casi) assert.deepEqual(E.groupWith(vs, 120, 200, undefined), E.group(vs, 120, 200));
  assert.deepEqual(E.groupWith(casi[0], 120, 200, {}), E.group(casi[0], 120, 200));
});

test('autoJoins dice quali versetti sono uniti', () => {
  const vs = [V(1, 50), V(2, 60), V(3, 150), V(4, 30)];
  assert.deepEqual(E.autoJoins(vs, 120, 200), { 1: true });
});

test('correzioni a mano: unire e separare', () => {
  const vs = [V(5, 50), V(6, 60), V(7, 150), V(8, 30)];
  assert.equal(nums(E.group(vs, 120, 200)), '5+6 | 7 | 8');
  assert.equal(nums(E.groupWith(vs, 120, 200, { 5: false })), '5 | 6 | 7 | 8');         // separa
  assert.equal(nums(E.groupWith(vs, 120, 200, { 6: true })), '5+6+7 | 8');               // unisce con la successiva
  assert.equal(nums(E.groupWith(vs, 120, 200, { 7: true })), '5+6 | 7+8');
  assert.equal(nums(E.groupWith(vs, 120, 200, { 5: false, 6: true, 7: true })), '5 | 6+7+8');
});

test('correzioni a mano: nessun versetto perso, ordine mantenuto, mai spezzati', () => {
  const vs = [V(1, 50), V(2, 60), V(3, 150), V(4, 30), V(5, 70)];
  for (let mask = 0; mask < 16; mask++) {
    const ov = {}; for (let i = 0; i < 4; i++) ov[i + 1] = !!(mask >> i & 1);
    assert.deepEqual(E.groupWith(vs, 120, 200, ov).flat().map((x) => x[0]), [1, 2, 3, 4, 5]);
  }
});

test('la presentazione segue le correzioni a mano', () => {
  const r = read(`Romani 6:5-7\n5 ${T('a')}\n6 ${T('b')}\n7 ${T('c')}`);
  const conta = (ov) => { r.passages[0].ov = ov; return E.parse(E.buildPresentation(r.passages, 'P', 120, 200, { bg: null, sep: null })).filter((x) => x.f === 13).length; };
  const auto = conta(undefined);
  assert.equal(conta({ 5: false, 6: false }), 3);
  assert.equal(conta({ 5: true, 6: true }), 1);
  assert.ok(auto >= 1);
});

// ---------------- rilettura finale ----------------
test('rtfPlain legge accenti, virgolette e caratteri speciali', () => {
  const s = '{\\rtf1 {\\fonttbl\\f0 X;}\\f0\\fs80 \\cf2 5\n\\fs120  ' + E.esc('Perché “così” è {bello} \\ Ω 😀') + '}';
  assert.equal(E.rtfPlain(s).replace(/\s+/g, ' ').trim(), '5 Perché “così” è {bello} \\ Ω 😀');
});

test('verifyPresentation: una presentazione corretta non ha problemi', () => {
  const r = read(`Romani 6:5-7\n5 Perché, “così” è così: è già più di così;\n6 ${T('b')}\n7 ${T('c')}\n\nAtti 2:1-2\n1 ${T('d')}\n2 Gesù è Ω 😀`);
  assert.deepEqual(E.verifyPresentation(E.buildPresentation(r.passages, 'P', 120, 200, IMGS), r.passages, 120, 200, IMGS), []);
});

test('verifyPresentation: con le correzioni a mano è ancora corretta', () => {
  const r = read(`Romani 6:5-7\n5 ${T('a')}\n6 ${T('b')}\n7 ${T('c')}`);
  r.passages[0].ov = { 5: false, 6: false };
  assert.deepEqual(E.verifyPresentation(E.buildPresentation(r.passages, 'P', 120, 200, IMGS), r.passages, 120, 200, IMGS), []);
});

test('verifyPresentation: scopre testo cambiato, versetto mancante o divisione diversa', () => {
  const r = read(`Romani 6:5-7\n5 ${T('a')}\n6 ${T('b')}\n7 ${T('c')}`);
  const bytes = E.buildPresentation(r.passages, 'P', 120, 200, IMGS);
  const cambiato = JSON.parse(JSON.stringify(r.passages)); cambiato[0].verses[1][1] += ' parola in più';
  assert.ok(E.verifyPresentation(bytes, cambiato, 120, 200, IMGS).length > 0);
  const meno = JSON.parse(JSON.stringify(r.passages)); meno[0].verses.pop();
  assert.ok(E.verifyPresentation(bytes, meno, 120, 200, IMGS).length > 0);
  const altra = JSON.parse(JSON.stringify(r.passages)); altra[0].ov = { 5: false, 6: false };
  assert.ok(E.verifyPresentation(bytes, altra, 120, 200, IMGS).length > 0);
});

test('verifyPresentation: scopre un numero di versetto sbagliato', () => {
  const r = read(`Romani 6:5-6\n5 ${T('a')}\n6 ${T('b')}`);
  const bytes = E.buildPresentation(r.passages, 'P', 120, 200, IMGS);
  const sbagliato = JSON.parse(JSON.stringify(r.passages)); sbagliato[0].verses[0][0] = 9;
  assert.ok(E.verifyPresentation(bytes, sbagliato, 120, 200, IMGS).length > 0);
});

test('verifyPresentation: tutti i passi della presentazione fatta a mano si rileggono bene', () => {
  const raw = readFileSync(new URL('./fixtures/messaggio-2026-11-07.txt', import.meta.url), 'utf8');
  const r = read(raw);
  const bytes = E.buildPresentation(r.passages, 'P', 120, 200, IMGS);
  assert.deepEqual(E.verifyPresentation(bytes, r.passages, 120, 200, IMGS), []);
  assert.deepEqual(E.verifyPresentation(E.buildPresentation(r.passages, 'P', 120, 200, { bg: null, sep: null }), r.passages, 120, 200, { bg: null, sep: null }), []);
});
