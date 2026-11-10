// Messaggio vero del 07/11/2026 (copiato da WhatsApp, con messaggi da scartare e formati diversi).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadEngine } from './carica.mjs';

const E = loadEngine();
const r = E.readMessage(readFileSync(new URL('./fixtures/messaggio-2026-11-07.txt', import.meta.url), 'utf8'));
const slide = (p) => E.group(p.verses, 120, 200).map((s) => s.map((v) => v[0]).join('+')).join(' | ');

test('riconosce i 9 passi, senza errori', () => {
  assert.equal(r.errs.length, 0);
  assert.deepEqual(r.passages.map((p) => p.label), [
    '1 Corinzi 15:1-11', 'Romani 6:5-11', 'Atti 5:27-32', '1 Corinzi 15:10', 'Efesini 3:1-7',
    'Colossesi 1:28-29', '2 Corinzi 8:1-5', 'Filippesi 3:12-14', '1 Corinzi 3:10-14']);
});

test('scarta e segnala i messaggi senza riferimento', () => {
  assert.deepEqual(r.ignored, ['Test versi', 'ciao guysssss ecco i versi per domani', 'anche questooo']);
});

test('versetti e slide come nella presentazione fatta a mano', () => {
  const att = (l) => r.passages.find((p) => p.label === l);
  assert.equal(slide(att('1 Corinzi 15:1-11')), '1 | 2 | 3 | 4+5 | 6 | 7+8 | 9 | 10 | 11');
  assert.equal(slide(att('Atti 5:27-32')), '27 | 28 | 29+30 | 31 | 32');
  assert.equal(slide(att('Efesini 3:1-7')), '1+2 | 3+4 | 5 | 6 | 7');
  assert.equal(slide(att('Filippesi 3:12-14')), '12 | 13 | 14');
  assert.equal(slide(att('1 Corinzi 3:10-14')), '10 | 11 | 12 | 13 | 14');
});

test('"2Corinzi", "1Corinzi" e "1 corinzi" (senza spazio o minuscolo) sono riconosciuti', () => {
  assert.ok(r.passages.some((p) => p.label.startsWith('2 Corinzi')));
  assert.ok(r.passages.filter((p) => p.book === '1 Corinzi').length === 3);
});

test('gli avvisi riguardano il versetto 8 senza punteggiatura e il riferimento senza fine', () => {
  const msgs = r.warns.map((w) => w.msg);
  assert.equal(r.warns.length, 2);
  assert.ok(msgs.some((m) => /Il versetto 8 inizia dopo una parola senza punteggiatura/.test(m)));
  assert.ok(msgs.some((m) => /non indica l'ultimo versetto/.test(m)));
  assert.ok(r.warns.every((w) => w.ref === '1 Corinzi 15:1-11'));
});

test('nessun testo perso: tutte le parole dei versetti compaiono nel messaggio', () => {
  const raw = readFileSync(new URL('./fixtures/messaggio-2026-11-07.txt', import.meta.url), 'utf8').replace(/\s+/g, ' ');
  for (const p of r.passages) for (const v of p.verses) assert.ok(raw.includes(v[1].replace(/^[«» ]+|[«» ]+$/g, '')), `${p.label} ${v[0]}`);
});
