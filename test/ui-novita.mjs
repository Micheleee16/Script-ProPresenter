// Prova nel browser delle novità: bozza, anteprima, annulla, video e colori, Word e zip di WhatsApp.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { loadEngine } from './carica.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const E = loadEngine();
const url = 'file://' + fileURLToPath(new URL('../dist/Versi.html', import.meta.url));
const FX = (n) => fileURLToPath(new URL('./fixtures/' + n, import.meta.url));
const fx = (n) => readFileSync(FX(n), 'utf8');

const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const pg = await ctx.newPage();
const errori = []; const fail = (m) => errori.push(m);
pg.on('pageerror', (e) => fail('pageerror: ' + e.message)); pg.on('console', (m) => m.type() === 'error' && fail('console: ' + m.text()));
await pg.goto(url);
const attesa = (ms) => pg.waitForTimeout(ms);
const nCard = () => pg.locator('#c-list .pc').count();
const scarica = async () => {
  if ((await pg.locator('#ackwrap').isVisible()) && !(await pg.isChecked('#ack'))) await pg.click('#ackwrap');
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#dlbtn')]);
  const p = await dl.path(); return new Uint8Array(readFileSync(p));
};

// versione
const versione = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')).version;
if (!(await pg.locator('.foot').innerText()).includes('versione ' + versione)) fail('manca il numero di versione');

// ---- file nei versetti: zip di WhatsApp e Word
await pg.setInputFiles('#bf-msg', FX('whatsapp-esportazione.zip'));
await pg.waitForSelector('.pc');
if ((await pg.locator('#plist .pc').count()) !== 9) fail('dal zip di WhatsApp dovrebbero uscire 9 passi');
await pg.setInputFiles('#bf-msg', { name: 'messaggio-ios.txt', mimeType: 'text/plain', buffer: readFileSync(FX('messaggio-ios.txt')) });
await pg.waitForFunction(() => document.querySelectorAll('#plist .pc').length === 9);

// ---- bozza dei versetti: si ricarica la pagina e il lavoro c'è ancora
await attesa(800);
await pg.reload();
await pg.waitForSelector('#resume:not([hidden])');
if (!/Ho ripreso il lavoro/.test(await pg.locator('#resume-t').innerText())) fail('manca il testo del banner della bozza');
if (!(await pg.inputValue('#msg')).includes('Romani 6:5-11')) fail('la bozza dei versetti non è tornata');
await pg.waitForFunction(() => document.querySelectorAll('#plist .pc').length === 9);
await pg.click('#resume-no');
if ((await pg.inputValue('#msg')) !== '' || !(await pg.locator('#resume').isHidden())) fail('"Ricomincia da zero" non ha svuotato');
await attesa(800); await pg.reload(); await attesa(300);
if (await pg.locator('#resume').isVisible()) fail('dopo "Ricomincia da zero" non dovrebbe esserci più la bozza');

// ---- canzoni
await pg.click('#tab-canzoni');
await pg.fill('#c-it', fx('taste-it.txt')); await pg.fill('#c-en', fx('taste-en.txt'));
await pg.waitForSelector('#c-list .pc');
if ((await nCard()) !== 19) fail('19 sezioni attese, ' + (await nCard()));

// anteprima delle slide
await pg.click('#c-views [data-v="preview"]');
await pg.waitForSelector('#c-list .sprev');
const nSl = await pg.locator('#c-list .sprev .sl').count();
if (nSl !== 28) fail('l\'anteprima dovrebbe mostrare le 28 slide delle sezioni uniche, ne mostra ' + nSl);
if (!/SONGS/.test(await pg.locator('#c-list .sl-lb >> nth=0').innerText())) fail('manca SONGS nell\'anteprima');
if (!(await pg.locator('#c-list .sprev figcaption').first().innerText()).includes('Sure as the sun')) fail('mancano le note nell\'anteprima');
if (await pg.locator('#c-list button.ln').count()) fail('nell\'anteprima non si modificano le righe');
// riga molto lunga: si segnala con la misura vera
await pg.click('#c-views [data-v="table"]');
const lunga = 'Questa è una riga italiana davvero troppo lunga per entrare tutta nella casella della slide di ProPresenter senza andare a capo più volte';
await pg.fill('#c-it', fx('taste-it.txt').replace('Libero\n', lunga + '\n')); await pg.waitForFunction(() => document.body.innerText.includes('QUESTA È UNA RIGA ITALIANA'));
await pg.click('#c-views [data-v="preview"]');
await pg.waitForSelector('#c-list .sp.long');
if (!/righe: non entra/.test(await pg.locator('#c-list .sl-tag').first().innerText())) fail('manca l\'etichetta della riga che non entra');
await pg.click('#c-views [data-v="table"]');
await pg.fill('#c-it', fx('taste-it.txt')); await pg.waitForFunction(() => !document.body.innerText.includes('QUESTA È UNA RIGA ITALIANA'));

// annulla
if (await pg.locator('#c-undo').isVisible()) fail('l\'annulla non dovrebbe esserci prima di una modifica');
await pg.click('#c-list .pc >> nth=2 >> button[data-act="dup"]');
if ((await nCard()) !== 20) fail('Duplica non ha funzionato');
if (!(await pg.locator('#c-undo').isVisible())) fail('manca il pulsante Annulla');
await pg.click('#c-undo');
if ((await nCard()) !== 19) fail('Annulla non ha tolto la copia');
await pg.click('#c-list .pc >> nth=3 >> button[data-act="del"]');
await pg.keyboard.press('Control+z');                       // anche con la tastiera
await pg.waitForFunction(() => document.querySelectorAll('#c-list .pc').length === 19);
// annullare anche una correzione del testo
const chorus = '#c-list .pc:has(h3:text-is("Chorus")) >> nth=0';
await pg.click(chorus + ' >> .cell.it >> button.ln >> nth=1');
await pg.fill('#c-list .ed-in', 'Una riga cambiata'); await pg.press('#c-list .ed-in', 'Enter');
await pg.waitForFunction(() => document.getElementById('c-it').value.includes('Una riga cambiata'));
await pg.click('#c-undo');
await pg.waitForFunction(() => !document.getElementById('c-it').value.includes('Una riga cambiata'));

// bozza delle canzoni: ordine cambiato e ricaricamento
await pg.click('#c-list .pc >> nth=2 >> button[data-act="dup"]');
await attesa(800); await pg.reload();
await pg.waitForSelector('#resume:not([hidden])');
await pg.waitForSelector('#c-list .pc');
if (!/la canzone «Taste and See»/.test(await pg.locator('#resume-t').innerText())) fail('il banner non nomina la canzone: ' + (await pg.locator('#resume-t').innerText()));
if ((await nCard()) !== 20) fail('la bozza non ha riportato l\'ordine modificato: ' + (await nCard()));

// video diverso e colori
await pg.click('#c-more summary');
await pg.fill('#c-vname', 'Mio sfondo.mov');
if (!/restano quelle del modello/.test(await pg.locator('#c-vinfo').innerText())) fail('manca la nota sul video senza durata');
await pg.fill('#c-col-intro', '#ff0000');
const bytes = await scarica();
const top = E.parse(bytes), cues = {}; top.filter((x) => x.f === 13).forEach((x) => { cues[Buffer.from(E.path(x.v, 1, 1)).toString()] = x.v; });
const g0 = E.parse(top.filter((x) => x.f === 12)[0].v);
const vc = cues[Buffer.from(E.parse(g0.filter((y) => y.f === 2)[0].v)[0].v).toString()];
if (Buffer.from(E.pick(vc, [[2, 0]])).toString() !== 'Mio sfondo.mov') fail('il nome del video non è nel file');
const hdr = top.filter((x) => x.f === 12).map((x) => E.parse(E.parse(x.v)[0].v)).find((h) => { const n = h.find((y) => y.f === 2); return n && Buffer.from(n.v).toString() === 'Intro'; });
const rgb = E.parse(hdr.find((y) => y.f === 3).v).map((x) => Math.round(Buffer.from(x.v).readFloatLE(0) * 255));
if (rgb[0] !== 255 || rgb[1] !== 0 || rgb[2] !== 0) fail('il colore dell\'Intro non è rosso: ' + rgb);
// le impostazioni restano dopo il ricaricamento
await attesa(300); await pg.reload(); await pg.waitForSelector('#c-list .pc');
if ((await pg.inputValue('#c-vname')) !== 'Mio sfondo.mov') fail('il video scelto non è stato ricordato');
if ((await pg.inputValue('#c-col-intro')) !== '#ff0000') fail('il colore scelto non è stato ricordato');
await pg.click('#c-more summary');
await pg.click('#c-col-reset');
if ((await pg.inputValue('#c-col-intro')) !== '#999999') fail('Ripristina i colori non funziona');
await pg.fill('#c-vname', 'Sfondo 1.mov');

// Word per l'italiano
await pg.click('#c-clear');
await pg.setInputFiles('#cf-it', FX('taste-it.docx'));
await pg.waitForFunction(() => document.getElementById('c-it').value.includes('Come il sole che sorge al mattino'));
if (!/taste-it\.docx/.test(await pg.locator('#src-it').innerText())) fail('manca il nome del file Word');

console.log({ errori });
await b.close();
if (errori.length) process.exit(1);
