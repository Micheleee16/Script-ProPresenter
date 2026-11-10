import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from './carica.mjs';

const E = loadEngine();

test('le misure della slide sono lette dal modello', () => {
  const g = E.verseGeometry();
  assert.equal(g.font, 'Neue Montreal');
  assert.equal(g.verse.size, 60);
  assert.equal(g.verse.numSize, 40);
  assert.equal(g.ref.size, 80);
  assert.ok(Math.abs(g.verse.w - 1696.71) < 0.1 && Math.abs(g.verse.h - 400.42) < 0.1);
  assert.ok(Math.abs(g.ref.y - 540) < 0.1);
});

test('un versetto breve sta in una riga, uno lunghissimo no', () => {
  const corto = E.fitVerseSlide([[16, 'Perché Dio ha tanto amato il mondo']]);
  assert.equal(corto.lines, 1);
  assert.ok(corto.fits && !corto.collides);
  const testo = 'parola '.repeat(120);
  const lungo = E.fitVerseSlide([[1, testo]]);
  assert.ok(lungo.lines > lungo.capacity);
  assert.ok(!lungo.fits);
});

test('il riquadro ha spazio per 5 righe e il riferimento è coperto da 7', () => {
  const g = E.verseGeometry();
  const r = E.fitVerseSlide([[1, 'ciao']]);
  assert.equal(r.capacity, 5);
  // misura fissa: ogni parola occupa mezza riga -> si controllano i confini
  const mezza = () => g.verse.w / 2 / 1.03 - 1;
  const w = (n) => E.fitVerseSlide([[1, Array(n).fill('x').join(' ')]], (t, s) => (t === ' ' ? 0 : t === '1' ? 0 : mezza()));
  assert.equal(w(10).lines, 5);
  assert.ok(w(10).fits);
  assert.ok(!w(12).fits && !w(12).collides);
  assert.ok(w(14).collides);
});

test('il numero del versetto e i due versetti si contano insieme', () => {
  const a = E.fitVerseSlide([[5, 'Testo uno'], [6, 'Testo due']]);
  assert.equal(a.lines, 1);
});

test('con una misura vera più larga le righe aumentano', () => {
  const t = [[1, 'Perché Dio ha tanto amato il mondo da dare il suo unico Figlio, affinché chiunque crede in lui non perisca ma abbia vita eterna']];
  const base = E.fitVerseSlide(t);
  const largo = E.fitVerseSlide(t, (x, s) => E.approxWidth(x, s) * 1.6);
  assert.ok(largo.lines > base.lines);
});
