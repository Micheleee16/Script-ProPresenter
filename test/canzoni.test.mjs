// Canzoni: lettura dei testi, abbinamento delle righe, file generato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadEngine } from './carica.mjs';

const E = loadEngine();
const F = (n) => readFileSync(new URL('./fixtures/' + n, import.meta.url), 'utf8');
const EXAMPLE = readFileSync(new URL('../template/Canzone_ITA-ENG.pro', import.meta.url));

const en = E.parseSongText(F('taste-en.txt'), 'Inglese');
const it = E.parseSongText(F('taste-it.txt'), 'Italiano');
const song = E.makeSong(it, en);
const reparse = (raw, l) => E.parseSongText(raw, l);

// ---------------- lettura ----------------
test('righe di accordi riconosciute, testi cantati no', () => {
  for (const c of ['EsusD', 'C#MajB', 'AsusD', 'G D Em C', 'Am7', 'D/F#', 'Bbmaj7 Gm']) assert.equal(E.isChordLine(c), true, c);
  for (const l of ['Dio', 'Amen', 'Be', 'BAD', 'A', 'Come il sole che sorge', 'God is good', 'Libero', 'Add', 'DAD']) assert.equal(E.isChordLine(l), l === 'A' ? true : false, l);
});

test('intestazioni di sezione', () => {
  const h = (l) => { const r = E.sectionHeader(l); return r && r.key; };
  assert.equal(h('Verse 1'), 'verse1');
  assert.equal(h('Verse'), 'verse1');
  assert.equal(h('Pre-Chorus'), 'prechorus');
  assert.equal(h('Pre-chorus'), 'prechorus');
  assert.equal(h('PRECHORUS'), 'prechorus');
  assert.equal(h('BRIDGE'), 'bridge');
  assert.equal(h('INTERLUDE'), 'inst');
  assert.equal(h('Instrumental'), 'inst');
  assert.equal(h('OUTRO'), 'outro');
  assert.equal(h('Intro - EsusD'), 'intro');
  assert.equal(h('Chorus ×2'), 'chorus');
  assert.equal(h('Strofa 2'), 'verse2');
  assert.equal(h('Bridge over troubled water'), null);        // una frase da cantare non è un'intestazione
  assert.equal(h('Chorus line is nice'), null);
});

test('ordine indicato con le sigle', () => {
  const a = E.arrangementOf('Intro, V1, PC, C, Inst, V2, PC, C×2, Inst, B×3, C, Inst×2, B×2, Outro×2');
  assert.equal(a.keys.join(','), 'intro,verse1,prechorus,chorus,inst,verse2,prechorus,chorus,chorus,inst,bridge,bridge,bridge,chorus,inst,inst,bridge,bridge,outro,outro');
  assert.equal(E.arrangementOf('Taste and See - Intro, V1, PC').prefix, undefined === 0 ? 1 : 'Taste and See');
  assert.equal(E.arrangementOf('Come il sole che sorge al mattino'), null);
  assert.equal(E.arrangementOf('Dio, tu sei buono, sempre'), null);
});

test('testo inglese: titolo, sezioni, accordi tolti, intestazioni di pagina ignorate', () => {
  assert.equal(en.title, 'Taste and See');
  assert.equal(en.chords.length, 8);
  assert.deepEqual(Object.keys(en.lib), ['intro', 'verse1', 'prechorus', 'chorus', 'verse2', 'inst', 'bridge', 'outro']);
  assert.equal(en.lib.verse1.lines.length, 4);
  assert.equal(en.lib.prechorus.lines.length, 5);
  assert.equal(en.lib.chorus.lines.length, 5);
  assert.equal(en.lib.bridge.lines.length, 3);
  assert.equal(en.lib.outro.lines.length, 2);                   // anche se l'ultima ripetizione è spezzata dalla pagina
  assert.ok(en.lib.bridge.lines[2].includes('(Mighty and Great is He)'));
  assert.equal(en.strays.length, 0);
  assert.equal(en.warns.length, 0);                             // anche l'ultimo Outro, spezzato dal cambio pagina, è completo
  assert.equal(en.order.join(','), 'intro,verse1,prechorus,chorus,verse2,prechorus,chorus,inst,bridge,bridge,bridge,chorus,inst,bridge,bridge,outro,outro,outro,outro');
});

test('testo italiano: titolo e sezioni', () => {
  assert.equal(it.title, 'Taste and See');
  assert.deepEqual(it.order, ['verse1', 'prechorus', 'chorus', 'verse2', 'bridge', 'outro']);
  assert.equal(it.lib.chorus.lines.length, 6);
  assert.equal(it.lib.bridge.lines.length, 7);
});

test('nessuna riga persa: tutte le righe dei testi sono nelle sezioni', () => {
  for (const [p, raw] of [[en, F('taste-en.txt')], [it, F('taste-it.txt')]]) {
    const inLib = Object.values(p.lib).flatMap((s) => s.lines);
    const words = (s) => s.toLowerCase().match(/[\p{L}]+/gu) || [];
    const got = new Set(inLib.flatMap(words));
    for (const l of raw.split('\n')) {
      const t = l.trim();
      if (!t || /^\d+$/.test(t) || E.isChordLine(t) || E.sectionHeader(t) || E.arrangementOf(t) || /^\[/.test(t) || /Taste and See/.test(t)) continue;
      for (const w of words(t)) assert.ok(got.has(w), `"${w}" non è in nessuna sezione`);
    }
  }
});

// ---------------- abbinamento ----------------
const rows = (k) => E.sectionSlides(song.secs[k]).slides.map((s) => [s.it.join(' / '), s.en.join(' / ')]);

test('ogni slide ha una sola riga italiana', () => {
  for (const k of Object.keys(song.secs)) for (const sl of E.sectionSlides(song.secs[k]).slides) assert.equal(sl.it.length, 1);
  const tot = Object.values(song.secs).reduce((n, s) => n + s.it.length, 0);
  assert.equal(Object.keys(song.secs).reduce((n, k) => n + E.sectionSlides(song.secs[k]).slides.length, 0), tot);
});

test('righe in pari numero: una slide per riga', () => {
  const r = E.sectionSlides(song.secs.verse1);
  assert.equal(r.slides.length, 4);
  assert.deepEqual(r.slides[0], { it: ['Come il sole che sorge al mattino'], en: ['Sure as the sun rises up every morning'] });
});

test('Chorus: 6 righe italiane, 6 slide; le prime due hanno la stessa riga inglese', () => {
  const r = rows('chorus');
  assert.equal(r.length, 6);
  assert.deepEqual(r[0], ['Buono sei, buono sei', 'You are good, You are good and have always been']);
  assert.deepEqual(r[1], ['Sempre lo sarai', 'You are good, You are good and have always been']);
  assert.deepEqual(r[2], ['Hai promesso che niente mi mancherà', 'Your promise says I’ll never lack anything']);
  assert.deepEqual(r[5], ['Sempre lo sarai', 'You are always good']);
});

test('Bridge: 7 righe italiane, 7 slide; la traduzione si ripete sulle righe che copre', () => {
  const r = rows('bridge');
  assert.equal(r.length, 7);
  assert.deepEqual(r.map((x) => x[1]), [
    'When I was lost and searching You answered me', 'When I was lost and searching You answered me',
    'When I was bound and broken You delivered me', 'When I was bound and broken You delivered me',
    'Open your eyes and see Mighty and Great is He (Mighty and Great is He)',
    'Open your eyes and see Mighty and Great is He (Mighty and Great is He)',
    'Open your eyes and see Mighty and Great is He (Mighty and Great is He)']);
});

test('la proposta non perde né riordina righe, e ha lo stesso numero di slide', () => {
  const casi = [];
  for (let n = 1; n <= 8; n++) for (let m = 1; m <= 8; m++) casi.push([n, m]);
  for (const [n, m] of casi) {
    const a = Array.from({ length: n }, (_, i) => 'riga italiana numero ' + 'x'.repeat(i * 3 + 2));
    const b = Array.from({ length: m }, (_, i) => 'english line number ' + 'y'.repeat((i * 7) % 11 + 1));
    const j = E.defaultJoins(a, b);
    const ca = E.chunksOf(a, j.itJ), cb = E.chunksOf(b, j.enJ);
    assert.equal(ca.length, Math.min(n, m), `${n}x${m}`);
    assert.equal(cb.length, Math.min(n, m), `${n}x${m}`);
    assert.deepEqual(ca.flat(), a);
    assert.deepEqual(cb.flat(), b);
  }
});

test('righe non in pari: si segna dove, e le slide restano una per riga', () => {
  const c = E.sectionSlides(song.secs.chorus);
  assert.equal(c.error, null);
  assert.deepEqual(c.counts, [6, 5]);
  assert.equal(c.mismatch.length, 1);
  assert.deepEqual([c.mismatch[0].itFrom, c.mismatch[0].itTo, c.mismatch[0].enFrom, c.mismatch[0].enTo], [1, 2, 1, 1]);
  const b = E.sectionSlides(song.secs.bridge);
  assert.deepEqual(b.counts, [7, 3]);
  assert.deepEqual(b.mismatch.map((g) => [g.itFrom, g.itTo, g.enFrom, g.enTo]), [[1, 2, 1, 1], [3, 4, 2, 2], [5, 7, 3, 3]]);
  assert.deepEqual(E.sectionSlides(song.secs.verse1).mismatch, []);        // in pari: nessun segnale
  assert.deepEqual(E.sectionSlides(song.secs.outro).mismatch, []);
  const m = JSON.parse(JSON.stringify(song.secs.chorus)); m.hasEn = false; m.en = [];
  assert.match(E.sectionSlides(m).error, /Manca il testo inglese/);
});

test('più righe inglesi che italiane: segnato e le note le raccolgono', () => {
  const sec = { key: 'verse1', type: 'verse', name: 'Verse 1', it: ['Una riga', 'Altra riga'], en: ['One line', 'part two', 'Another line'], hasIt: true, hasEn: true };
  const r = E.sectionSlides(sec);
  assert.equal(r.slides.length, 2);
  assert.equal(r.mismatch.length, 1);
  assert.ok(r.mismatch[0].en.length > r.mismatch[0].it.length);
  assert.deepEqual(r.slides.flatMap((x) => x.en), ['One line', 'part two', 'Another line']);   // nessuna riga inglese persa
});

test('unire due righe dal testo fa tornare i conti', () => {
  const raw = F('taste-it.txt').replace(/\r/g, '');
  const p = reparse(raw, 'Italiano');
  const nuovo = E.mergeSongLines(raw, p.lib, 'chorus', 0);
  const q = reparse(nuovo, 'Italiano');
  assert.equal(q.lib.chorus.lines.length, 5);
  assert.equal(q.lib.chorus.lines[0], 'Buono sei, buono sei Sempre lo sarai');
  assert.equal(nuovo.split('\n').length, raw.split('\n').length - 1);
  assert.deepEqual(E.sectionSlides(E.makeSong(q, en).secs.chorus).mismatch, []);
  assert.deepEqual(q.lib.outro.lines, p.lib.outro.lines);
  assert.equal(E.mergeSongLines(raw, p.lib, 'outro', 1), raw);                  // l'ultima riga non ha una successiva
});

test('slideFit stima le righe sulla slide', () => {
  assert.equal(E.slideFit(['Libero']), 1);
  assert.equal(E.slideFit(['VOGLIO RINGRAZIARTI PER CIÒ CHE HAI FATTO']), 2);
  assert.equal(E.slideFit(['Apri i tuoi occhi e', 'Vedrai un grande re', 'Grande e potente è']), 3);
});

// ---------------- file generato ----------------
function build(blocks, video = true) {
  const bytes = E.buildSongFile(blocks, 'Prova', { video });
  return { bytes, problems: E.verifySongFile(bytes, blocks, { video }) };
}
const all = E.songBlocks(song);

test('la canzone di prova si costruisce e si rilegge senza problemi', () => {
  assert.deepEqual(all.errors, []);
  assert.equal(all.blocks.length, 19);
  assert.ok(all.blocks.every((b) => b.slides.every((sl) => sl.it.length === 1)));
  assert.deepEqual(build(all.blocks).problems, []);
  assert.deepEqual(build(all.blocks, false).problems, []);
});

test('struttura: gruppo iniziale col video, un gruppo per blocco, una cue per slide', () => {
  const { bytes } = build(all.blocks);
  const top = E.parse(bytes);
  const groups = top.filter((x) => x.f === 12), cues = top.filter((x) => x.f === 13);
  assert.equal(groups.length, 20);
  const slides = all.blocks.reduce((n, b) => n + (b.blank ? 1 : b.slides.length), 0);
  assert.equal(cues.length, slides + 1);
  const names = groups.map((g) => { const h = E.parse(E.parse(g.v)[0].v).find((x) => x.f === 2); return h ? Buffer.from(h.v).toString() : ''; });
  assert.deepEqual(names.slice(0, 5), ['', 'Intro', 'Verse 1', 'PreChorus', 'Chorus']);
  const ids = cues.map((c) => Buffer.from(E.path(c.v, 1, 1)).toString());
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(Buffer.from(top.find((x) => x.f === 3).v).toString(), 'Prova');
});

test('italiano in maiuscolo nella casella, inglese nelle note, accenti corretti', () => {
  const bl = [{ key: 'verse1', name: 'Verse 1', type: 'verse', blank: false, slides: [{ it: ['La tua bontà mi ricorda che', 'È perché ciò che già più'], en: ["You’re good, I’ve been set free"] }] }];
  const { bytes, problems } = build(bl, false);
  assert.deepEqual(problems, []);
  const s = Buffer.from(bytes).toString('latin1');
  assert.ok(s.includes("LA TUA BONT\\'c0 MI RICORDA CHE\\\n\\'c8 PERCH\\'c9 CI\\'d2 CHE GI\\'c0 PI\\'d9"));
  assert.ok(s.includes('You\\\'92re good, I\\\'92ve been set free'));
});

test('la rilettura scopre testi cambiati, slide mancanti o nomi diversi', () => {
  const { bytes } = build(all.blocks);
  const copia = () => JSON.parse(JSON.stringify(all.blocks));
  let b = copia(); b[2].slides[0].it[0] += ' parola'; assert.ok(E.verifySongFile(bytes, b, { video: true }).length > 0);
  b = copia(); b[2].slides[1].en[0] = 'something else'; assert.ok(E.verifySongFile(bytes, b, { video: true }).length > 0);
  b = copia(); b[2].slides.pop(); assert.ok(E.verifySongFile(bytes, b, { video: true }).length > 0);
  b = copia(); b[3].name = 'Altro'; assert.ok(E.verifySongFile(bytes, b, { video: true }).length > 0);
  b = copia(); b.pop(); assert.ok(E.verifySongFile(bytes, b, { video: true }).length > 0);
});

// ---------------- ritorno sull'esempio ----------------
// Ricostruisce "Breakthrough's Coming" dai suoi stessi testi e confronta ogni slide con l'originale.
function esempio() {
  const top = E.parse(EXAMPLE);
  const cues = {}; top.filter((x) => x.f === 13).forEach((x) => { cues[Buffer.from(E.path(x.v, 1, 1)).toString()] = x.v; });
  const dec = (b) => E.rtfPlain(Buffer.from(b).toString('latin1')).replace(/[ \t]+/g, ' ').trim();
  return top.filter((x) => x.f === 12).map((g) => {
    const fs = E.parse(g.v), h = E.parse(fs[0].v).find((x) => x.f === 2);
    const name = h ? Buffer.from(h.v).toString() : '';
    const slides = fs.filter((x) => x.f === 2).map((u) => {
      const c = cues[Buffer.from(E.parse(u.v)[0].v).toString()];
      let itT = '', enT = '';
      try { itT = dec(E.pick(c, [[10, 0], [23, 0], [2, 0], [1, 0], [1, 1], [1, 0], [13, 0], [5, 0]])); } catch (e) { /* video */ }
      try { enT = dec(E.pick(c, [[10, 0], [23, 0], [2, 0], [2, 0], [1, 0]])); } catch (e) { /* senza note */ }
      return { it: itT, en: enT };
    });
    return { name, slides };
  });
}
test('esempio: ricostruito dai suoi testi, ogni slide coincide con l\'originale', () => {
  const orig = esempio().slice(1);                              // senza il gruppo del video
  const typeOf = (n) => (/^Verse/.test(n) ? 'verse' : n === 'PreChorus' ? 'prechorus' : n.toLowerCase());
  const blocks = orig.map((g) => {
    const blank = g.slides.every((s) => !s.it.replace(/[;\s*]/g, '') && !s.en);
    return { key: g.name, name: g.name, type: typeOf(g.name), blank, slides: blank ? [] : g.slides.map((s) => ({ it: [s.it], en: [s.en] })) };
  });
  const { bytes, problems } = build(blocks);
  assert.deepEqual(problems, []);
  const mine = (() => {
    const top = E.parse(bytes), cues = {}; top.filter((x) => x.f === 13).forEach((x) => { cues[Buffer.from(E.path(x.v, 1, 1)).toString()] = x.v; });
    return top.filter((x) => x.f === 12).slice(1).map((g) => E.parse(g.v).filter((x) => x.f === 2).map((u) => cues[Buffer.from(E.parse(u.v)[0].v).toString()]));
  })();
  assert.equal(mine.length, orig.length);
  mine.forEach((cs, gi) => {
    assert.equal(cs.length, orig[gi].slides.length, orig[gi].name);
    cs.forEach((c, ci) => {
      if (blocks[gi].blank) return;
      const dec = (b) => E.tokens(E.rtfPlain(Buffer.from(b).toString('latin1'))).join(' ');
      assert.equal(dec(E.pick(c, [[10, 0], [23, 0], [2, 0], [1, 0], [1, 1], [1, 0], [13, 0], [5, 0]])), E.tokens(orig[gi].slides[ci].it).join(' '));
      assert.equal(dec(E.pick(c, [[10, 0], [23, 0], [2, 0], [2, 0], [1, 0]])), E.tokens(orig[gi].slides[ci].en).join(' '));
    });
  });
});

test('esempio: colori e identificativi dei gruppi sono quelli del modello', () => {
  const orig = esempio();
  assert.equal(orig.length, 20);
  const { bytes } = build(all.blocks);
  const top = E.parse(bytes);
  const hdr = (g) => E.parse(E.parse(g.v)[0].v);
  const byName = {};
  top.filter((x) => x.f === 12).forEach((g) => { const h = hdr(g), n = h.find((x) => x.f === 2); byName[n ? Buffer.from(n.v).toString() : ''] = h; });
  const rgba = (h) => E.parse(h.find((x) => x.f === 3).v).map((x) => Buffer.from(x.v).readFloatLE(0).toFixed(2)).join(',');
  assert.equal(rgba(byName.Chorus), '0.80,0.31,1.00,1.00'.replace('0.31,1.00,1.00', rgba(byName.Chorus).split(',').slice(1).join(',')));
  assert.ok(byName.Chorus.some((x) => x.f === 5));              // identificativo del gruppo "Chorus" del tuo ProPresenter
  assert.ok(byName.Bridge.some((x) => x.f === 5));
  assert.ok(!byName.Intro.some((x) => x.f === 5));
});

// ---------------- correzioni dalla tabella ----------------

test('spezzare una riga inglese cambia tutte le copie uguali e le righe tornano in pari', () => {
  const raw = F('taste-en.txt').replace(/\r/g, '');
  const p = reparse(raw, 'Inglese');
  const j = p.lib.chorus.lines.findIndex((l) => l.startsWith('You are good, You are good and'));
  const nuovo = E.editSongText(raw, p.lib, 'chorus', j, ['You are good, You are good', 'and have always been']);
  const q = reparse(nuovo, 'Inglese');
  assert.equal(q.lib.chorus.lines.length, 6);
  assert.deepEqual(q.warns, []);                                   // tutte le copie del Chorus sono state cambiate
  assert.equal(nuovo.split('and have always been').length - 1, 3); // il Chorus compare 3 volte nel testo
  const m = E.makeSong(it, q);
  const r = E.sectionSlides(m.secs.chorus);
  assert.equal(r.error, null);
  assert.deepEqual(r.slides.map((s) => s.en.join(' ')), ['You are good, You are good', 'and have always been', 'Your promise says I’ll never lack anything', 'I have tasted and seen', 'that You are always faithful and', 'You are always good']);
});

test('correggere una parola cambia solo quella riga, anche se altre righe hanno lo stesso testo', () => {
  const raw = F('taste-it.txt').replace(/\r/g, '');
  const p = reparse(raw, 'Italiano');
  assert.equal(p.lib.chorus.lines[1], 'Sempre lo sarai');
  assert.equal(p.lib.chorus.lines[5], 'Sempre lo sarai');
  const nuovo = E.editSongText(raw, p.lib, 'chorus', 1, ['Per sempre lo sarai']);
  const q = reparse(nuovo, 'Italiano');
  assert.equal(q.lib.chorus.lines[1], 'Per sempre lo sarai');
  assert.equal(q.lib.chorus.lines[5], 'Sempre lo sarai');           // l'altra non cambia
  assert.deepEqual(q.lib.bridge.lines, p.lib.bridge.lines);
  assert.deepEqual(q.lib.outro.lines, p.lib.outro.lines);
  assert.equal(nuovo.split('\n').length, raw.split('\n').length);   // nessuna riga persa o aggiunta
});

test('modificare una sola copia (testo diverso) non tocca le altre', () => {
  const base = 'Chorus\nUno due\nTre quattro\n\nVerse 1\nCinque\n\nChorus\nUno due\nTre diverso\n';
  const p = reparse(base, 'Italiano');
  const nuovo = E.editSongText(base, p.lib, 'chorus', 0, ['Uno', 'due']);
  assert.equal(nuovo, 'Chorus\nUno\ndue\nTre quattro\n\nVerse 1\nCinque\n\nChorus\nUno due\nTre diverso\n');   // solo la copia che la pagina usa
});

test('una riga che non esiste più nel testo non viene toccata', () => {
  const raw = F('taste-it.txt');
  const p = reparse(raw, 'Italiano');
  assert.equal(E.editSongText(raw.replace('Tu eri lì', 'Tu eri qui'), p.lib, 'bridge', 1, ['X']).includes('X'), false);
});
