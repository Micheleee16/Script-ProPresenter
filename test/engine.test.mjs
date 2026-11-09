import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from './carica.mjs';

const E = loadEngine();
const T = (n) => `Testo di prova del versetto ${n}`;       // testo finto, NON biblico
const read = (s) => E.readMessage(s);

test('un passo con versetti numerati', () => {
  const r = read(`Romani 6:5-7\n5 ${T('uno')}\n6 ${T('due')}\n7 ${T('tre')}`);
  assert.equal(r.errs.length, 0);
  assert.equal(r.passages.length, 1);
  assert.deepEqual(r.passages[0].verses.map((v) => v[0]), [5, 6, 7]);
  assert.equal(r.passages[0].label, 'Romani 6:5-7');
});

test('un numero fuori posto ("3 volte") non inizia un nuovo versetto', () => {
  const r = read(`Atti 2:1-2\n1 Disse per 3 volte la stessa cosa.\n2 ${T('due')}`);
  assert.equal(r.errs.length, 0);
  assert.deepEqual(r.passages[0].verses.map((v) => v[0]), [1, 2]);
  assert.match(r.passages[0].verses[0][1], /3 volte/);
});

test('i messaggi WhatsApp senza riferimento vengono scartati e segnalati', () => {
  const r = read(`[10:15, 01/11/2026] Pastore: Buongiorno a tutti!\n[10:16, 01/11/2026] Pastore: Romani 6:5-6\n5 ${T('a')}\n6 ${T('b')}`);
  assert.equal(r.passages.length, 1);
  assert.equal(r.ignored.length, 1);
  assert.match(r.ignored[0], /Buongiorno/);
});

test('mancano i numeri dei versetti: errore, passo escluso', () => {
  const r = read(`Romani 6:5-7\nSolo testo senza numeri`);
  assert.equal(r.passages.length, 0);
  assert.equal(r.errs.length, 1);
});

test('raggruppamento: 1 versetto per slide, 2 se corti, mai spezzati', () => {
  const v = (n, len) => [n, 'x'.repeat(len - String(n).length - 1)];
  // due corti (<120) che stanno in 200 -> insieme
  assert.deepEqual(E.group([v(1, 50), v(2, 60)], 120, 200).map((s) => s.length), [2]);
  // il primo non è corto -> da solo
  assert.deepEqual(E.group([v(1, 130), v(2, 40)], 120, 200).map((s) => s.length), [1, 1]);
  // la coppia supera 200 -> da soli
  assert.deepEqual(E.group([v(1, 110), v(2, 110)], 120, 200).map((s) => s.length), [1, 1]);
  // nessun versetto perso e ordine mantenuto
  const vs = [v(1, 50), v(2, 150), v(3, 30), v(4, 30), v(5, 90)];
  assert.deepEqual(E.group(vs, 120, 200).flat().map((x) => x[0]), [1, 2, 3, 4, 5]);
});

test('i caratteri non ASCII sono escapati in cp1252 / unicode', () => {
  assert.equal(E.esc('è'), "\\'e8");
  assert.equal(E.esc('“a”'), "\\'93a\\'94");
  assert.equal(E.esc('a{b}\\'), 'a\\{b\\}\\\\');
  assert.equal(E.esc('Ω'), '\\uc0\\u937 ');
});

function pres(passages, imgs) {
  return E.buildPresentation(passages, 'Prova', 120, 200, imgs);
}
const imgs = { bg: { name: 'Sfondo versi.png' }, sep: { name: 'Ascensione.png' } };

function cuesOf(bytes) {
  const top = E.parse(bytes);
  const grp = E.parse(top.find((x) => x.f === 12).v);
  const names = top.filter((x) => x.f === 13).map((x) => Buffer.from(E.parse(x.v)[1].v).toString());
  return { top, grp, names };
}

test('presentazione: separatore solo tra i passi, mai all\'inizio o alla fine', () => {
  const r = read(`Romani 6:5-6\n5 ${T('a')}\n6 ${T('b')}\n\nAtti 2:1-2\n1 ${T('c')}\n2 ${T('d')}\n\nEfesini 2:4-5\n4 ${T('e')}\n5 ${T('f')}`);
  const { names, grp } = cuesOf(pres(r.passages, imgs));
  const sep = names.map((n, i) => (n === 'Separatore' ? i : -1)).filter((i) => i >= 0);
  assert.equal(sep.length, 2);
  assert.ok(sep[0] > 0 && sep[1] < names.length - 1);
  assert.equal(grp.filter((x) => x.f === 2).length, names.length);   // ogni cue è nel gruppo
});

test('senza immagini: nessun separatore', () => {
  const r = read(`Romani 6:5-6\n5 ${T('a')}\n6 ${T('b')}\n\nAtti 2:1-2\n1 ${T('c')}\n2 ${T('d')}`);
  const { names } = cuesOf(pres(r.passages, { bg: null, sep: null }));
  assert.ok(!names.includes('Separatore'));
});

test('ogni UUID della presentazione è usato una volta sola per cue (nessun duplicato fra cue)', () => {
  const r = read(`Romani 6:5-6\n5 ${T('a')}\n6 ${T('b')}\n\nAtti 2:1-2\n1 ${T('c')}\n2 ${T('d')}`);
  const bytes = pres(r.passages, imgs);
  const ids = E.parse(bytes).filter((x) => x.f === 13).map((x) => Buffer.from(E.path(x.v, 1, 1)).toString());
  assert.equal(new Set(ids).size, ids.length);
});

test('il testo nelle slide è quello ricevuto (nessun testo aggiunto)', () => {
  const r = read(`Romani 6:5-6\n5 ${T('uno')}\n6 ${T('due')}`);
  const s = Buffer.from(pres(r.passages, imgs)).toString('latin1');
  assert.ok(s.includes(T('uno')) && s.includes(T('due')));
  assert.ok(s.includes('Romani 6:5-6'));
});

test('zip STORED valido: CRC e dimensioni corrispondono', () => {
  const files = [{ name: '/Users/michele/Documents/ProPresenter/Media/Assets/a.png', data: Uint8Array.from([1, 2, 3, 4, 5]) }, { name: 'x.pro', data: new TextEncoder().encode('ciao') }];
  const z = Buffer.from(E.makeZip(files));
  const eocd = z.length - 22;
  assert.equal(z.readUInt32LE(eocd), 0x06054b50);
  assert.equal(z.readUInt16LE(eocd + 10), 2);
  let off = z.readUInt32LE(eocd + 16);
  for (const f of files) {
    assert.equal(z.readUInt32LE(off), 0x02014b50);
    const crc = z.readUInt32LE(off + 16), size = z.readUInt32LE(off + 24), nl = z.readUInt16LE(off + 28), lho = z.readUInt32LE(off + 42);
    assert.equal(z.slice(off + 46, off + 46 + nl).toString(), f.name);
    const lnl = z.readUInt16LE(lho + 26);
    const data = z.slice(lho + 30 + lnl, lho + 30 + lnl + size);
    assert.deepEqual([...data], [...f.data]);
    assert.equal(E.crc32(data), crc);
    off += 46 + nl;
  }
});

test('avviso: un numero senza punteggiatura davanti potrebbe non essere un versetto', () => {
  const r = read('Atti 2:1-2\n1 Disse tre cose per 2 volte e basta');
  const w = r.warns.map((x) => x.msg).join(' | ');
  assert.match(w, /Il versetto 2 inizia dopo una parola senza punteggiatura/);
});

test('nessun avviso se i versetti sono a capo o dopo la punteggiatura', () => {
  const a = read(`Atti 2:1-2\n1 ${T('a')}\n2 ${T('b')}`);
  const b = read(`Atti 2:1-2\n1 ${T('a')}. 2 ${T('b')}`);
  assert.equal(a.warns.length, 0);
  assert.equal(b.warns.length, 0);
});

test('avviso: riferimento scritto dopo il testo', () => {
  const r = read(`1 Questo è un versetto abbastanza lungo.\n2 Anche questo lo è, direi.\nRomani 6:1-2`);
  assert.equal(r.passages.length, 1);
  assert.match(r.warns.map((x) => x.msg).join(' '), /riferimento è scritto dopo il testo/);
});

// ---- dimensioni dell'immagine nel template ----
function mediaSize(cueBytes) {
  const act = E.parse(cueBytes).filter((x) => x.f === 10)[1].v;           // la seconda azione della cue: lo sfondo
  const dim = E.path(act, 20, 5, 5, 1, 5);
  const o = E.parse(dim).map((x) => Buffer.from(x.v).readDoubleLE(0));
  return o;
}
function cuesBytes(bytes) { return E.parse(bytes).filter((x) => x.f === 13).map((x) => x.v); }

test('le dimensioni dell\'immagine nel template vengono aggiornate', () => {
  const r = read(`Romani 6:5-6\n5 ${T('a')}\n6 ${T('b')}\n\nAtti 2:1-2\n1 ${T('c')}\n2 ${T('d')}`);
  const cues = cuesBytes(pres(r.passages, { bg: { name: 'x.png', w: 1280, h: 720 }, sep: { name: 'y.png', w: 1000, h: 500 } }));
  const nomi = cues.map((c) => Buffer.from(E.parse(c)[1].v).toString());
  const sep = cues[nomi.indexOf('Separatore')], verso = cues[0];
  assert.deepEqual(mediaSize(verso), [1280, 720]);
  assert.deepEqual(mediaSize(sep), [1000, 500]);
});

test('senza dimensioni note il template resta com\'è', () => {
  const r = read(`Romani 6:5-6\n5 ${T('a')}\n6 ${T('b')}`);
  assert.deepEqual(mediaSize(cuesBytes(pres(r.passages, { bg: { name: 'x.png' }, sep: null }))[0]), [1920, 1080]);
});
