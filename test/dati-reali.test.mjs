// Confronto con la tua presentazione fatta a mano (template/Messaggio_Modena.pro):
// dalle slide ricostruisco il messaggio, lo rileggo con l'engine e confronto i raggruppamenti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadEngine } from './carica.mjs';

const E = loadEngine();
const tpl = readFileSync(new URL('../template/Messaggio_Modena.pro', import.meta.url));

const dec = (s) => s.replace(/\\'([0-9a-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\uc0\\u(-?\d+) ?/g, (m, n) => String.fromCharCode(+n < 0 ? +n + 65536 : +n));

function passiFattiAMano() {
  const top = E.parse(tpl);
  const order = E.parse(top.find((x) => x.f === 12).v).filter((x) => x.f === 2).map((x) => Buffer.from(E.parse(x.v)[0].v).toString());
  const cues = {};
  top.filter((x) => x.f === 13).forEach((x) => { cues[Buffer.from(E.path(x.v, 1, 1)).toString()] = x.v; });
  const out = []; let cur = null;
  order.forEach((u) => {
    const s = Buffer.from(cues[u]).toString('latin1');
    const ref = s.match(/\\fs160 \\cf2 ([^}]*)\}/), body = s.match(/\\fs80 \\cf2 ([^}]*)\}/);
    if (!ref || !body) return;                       // separatori e slide senza versetti
    const r = dec(ref[1]);
    const verses = ('\\fs80 \\cf2 ' + body[1]).split(/\\fs80 (?:\\cf2 |\\up0 )/).slice(1).map((p) => {
      const m = p.match(/^(\d+)\s*\n\\fs120 (?:\\up0 )?([\s\S]*)$/);
      return [parseInt(m[1], 10), dec(m[2]).replace(/^\s* ?\s*/, '').replace(/\s+/g, ' ').trim()];
    });
    if (!cur || cur.ref !== r) { cur = { ref: r, slides: [] }; out.push(cur); }
    cur.slides.push(verses);
  });
  return out;
}

// Passi in cui la tua scelta a mano è diversa dalla regola scritta (primo versetto < 120 caratteri):
// in Romani 6:5-11 hai unito 6+7 anche se il versetto 6 è lungo 134 caratteri.
const DIVERSI_DA_REGOLA = new Set(['Romani 6:5-11']);

const passi = passiFattiAMano();

test('il template contiene i passi attesi', () => {
  assert.equal(passi.length, 11);
});

for (const p of passi) {
  test(`dati reali: ${p.ref}`, () => {
    const tutti = p.slides.flat();
    const r = E.readMessage(p.ref + '\n' + tutti.map((v) => v[0] + ' ' + v[1]).join('\n'));
    assert.equal(r.errs.length, 0, JSON.stringify(r.errs));
    assert.equal(r.passages.length, 1);
    // stessi versetti, stesso testo
    assert.deepEqual(r.passages[0].verses, tutti);
    // stesso raggruppamento (tranne le eccezioni note)
    const mano = p.slides.map((s) => s.map((v) => v[0]).join('+')).join(' | ');
    const auto = E.group(r.passages[0].verses, 120, 200).map((s) => s.map((v) => v[0]).join('+')).join(' | ');
    if (DIVERSI_DA_REGOLA.has(p.ref)) assert.notEqual(auto, mano);
    else assert.equal(auto, mano);
  });
}

test('regressione: la presentazione generata è sempre la stessa (impronta)', () => {
  const msg = passi.slice(0, 3).map((p) => p.ref + '\n' + p.slides.flat().map((v) => v[0] + ' ' + v[1]).join('\n')).join('\n\n');
  const r = E.readMessage(msg);
  const bytes = loadEngine().buildPresentation(r.passages, 'Prova', 120, 200, { bg: { name: 'Sfondo versi.png' }, sep: { name: 'Ascensione.png' } });
  const h = createHash('sha256').update(bytes).digest('hex');
  assert.equal(h, '17de7d428be1ba4c3b08b8b5533d7ee1b646407d5e5e16c59b45d8900b811397');
});
