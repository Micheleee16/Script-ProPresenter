// ====================== com'è fatta la slide dei versetti ======================
// Misure lette dal modello "Messaggio Modena": dimensione della slide, posizione dei due riquadri di
// testo (versetto e riferimento), corpo dei caratteri. Il modello non ha adattamento automatico del testo
// e ha l'allineamento in alto (i campi relativi sono assenti = valori predefiniti di ProPresenter):
// un testo troppo lungo non si rimpicciolisce, scende oltre il riquadro.
const SLIDE_W = 1920, SLIDE_H = 1080;
const LINE_FACTOR = 1.2;      // altezza di una riga in rapporto al corpo (stima: dipende dal carattere)
const WIDTH_SAFETY = 1.03;    // margine: il carattere del modello (Neue Montreal) può essere un po' più largo
const DEFAULT_GEOMETRY = {
  slide: { w: SLIDE_W, h: SLIDE_H }, font: 'Neue Montreal',
  verse: { x: 111.64, y: 100.86, w: 1696.71, h: 400.42, size: 60, numSize: 40 },
  ref: { x: 111.64, y: 540, w: 1090.23, h: 130.05, size: 80 },
};

function f64At(b) { return new DataView(b.buffer, b.byteOffset, 8).getFloat64(0, true); }
function boxOf(cue, i) {
  const bounds = pick(cue, PEL(i).slice(0, 6).concat([[3, 0]]));
  const pos = pick(bounds, [[1, 0]]), size = pick(bounds, [[2, 0]]);
  return { x: f64At(pick(pos, [[1, 0]])), y: f64At(pick(pos, [[2, 0]])), w: f64At(pick(size, [[1, 0]])), h: f64At(pick(size, [[2, 0]])) };
}
function sizesOf(rtf) {   // corpo in punti: nell'RTF è espresso in mezzi punti (\fs120 = 60 pt)
  const m = [...rtf.matchAll(/\\fs(\d+)/g)].map((x) => +x[1] / 2);
  return m;
}
let geometryCache = null;
/** Misure della slide dei versetti, lette dal modello (con valori di riserva se il modello cambia). */
function verseGeometry() {
  if (geometryCache) return geometryCache;
  let g = JSON.parse(JSON.stringify(DEFAULT_GEOMETRY));
  try {
    const top = parse(b64ToBytes(TEMPLATE_B64));
    const grp = top.find((x) => x.f === 12);
    const order = parse(grp.v).filter((x) => x.f === 2).map((x) => td.decode(parse(x.v)[0].v));
    let cue = null;
    top.forEach((x) => { if (x.f === 13 && td.decode(path(x.v, 1, 1)) === order[2]) cue = x.v; });
    const v = boxOf(cue, 0), r = boxOf(cue, 1);
    const vs = sizesOf(latin1Str(pick(cue, PEL(0).concat([[5, 0]]))));
    const rs = sizesOf(latin1Str(pick(cue, PEL(1).concat([[5, 0]]))));
    if (v.w > 0 && v.h > 0 && r.w > 0 && vs.length >= 2 && rs.length >= 1) {
      g.verse = { x: v.x, y: v.y, w: v.w, h: v.h, numSize: vs[0], size: vs[1] };
      g.ref = { x: r.x, y: r.y, w: r.w, h: r.h, size: rs[0] };
      const fam = latin1Str(pick(cue, PEL(0).concat([[5, 0]]))).match(/\\fonttbl\\f0\\fnil\\fcharset0 ([^;]+);/);
      if (fam) g.font = fam[1].replace(/-Regular$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
    }
  } catch (e) { /* si usano le misure di riserva */ }
  return (geometryCache = g);
}

/** Larghezza approssimata di un testo (corpo `size`), per quando non c'è un browser che lo misuri. */
function approxWidth(text, size) {
  let w = 0;
  for (const c of text) {
    if ('iljtfI.,;:\'!|’‘ '.includes(c)) w += 0.28;
    else if ('mwMW@—'.includes(c)) w += 0.82;
    else if (c >= 'A' && c <= 'Z') w += 0.66;
    else if (c >= '0' && c <= '9') w += 0.56;
    else w += 0.52;
  }
  return w * size;
}

/**
 * Quante righe occupa il testo di una slide nel riquadro del modello, e se ci sta.
 * `sl` = versetti della slide ([numero, testo]); `measure(testo, corpo)` = larghezza in punti.
 * Restituisce { lines, fits, collides, capacity }:
 *  - capacity: quante righe stanno nel riquadro;
 *  - fits: false se il testo scende oltre il riquadro;
 *  - collides: true se arriva a coprire il riferimento sotto.
 */
function fitVerseSlide(sl, measure) {
  const g = verseGeometry(), vs = finalVerses(sl);
  measure = measure || approxWidth;
  const sp = measure(' ', g.verse.size) * WIDTH_SAFETY;
  const width = g.verse.w;
  let lines = 1, x = 0;
  const place = (w) => {
    if (w > width) {                      // parola più larga della riga: va spezzata dal programma
      if (x > 0) lines++;
      lines += Math.floor(w / width); x = w % width; return;
    }
    if (x > 0 && x + w > width) { lines++; x = 0; }
    x += w + sp;
  };
  vs.forEach((v, i) => {
    place(measure(String(v[0]), g.verse.numSize) * WIDTH_SAFETY);
    v[1].split(/\s+/).filter(Boolean).forEach((word) => place(measure(word, g.verse.size) * WIDTH_SAFETY));
    if (i < vs.length - 1) x += sp;
  });
  const lineH = g.verse.size * LINE_FACTOR;
  const capacity = Math.floor(g.verse.h / lineH + 1e-9);
  const room = Math.floor((g.ref.y - g.verse.y) / lineH + 1e-9);    // righe prima di toccare il riferimento
  return { lines, capacity, fits: lines <= capacity, collides: lines > room };
}
