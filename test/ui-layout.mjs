// Prova nel browser: l'anteprima avvisa quando il testo non entra nel riquadro del modello.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = 'file://' + fileURLToPath(new URL('../dist/Script-Pro.html', import.meta.url));
const lungo = 'Perché Dio ha tanto amato il mondo da dare il suo unico Figlio, affinché chiunque crede in lui non perisca, ma abbia vita eterna. '.repeat(4).trim();
const b = await chromium.launch(); const pg = await (await b.newContext()).newPage();
const errori = []; const fail = (m) => errori.push(m);
pg.on('pageerror', (e) => fail('pageerror: ' + e.message));
await pg.goto(url);
await pg.fill('#msg', 'Romani 6:5\n5 Testo breve\n\nGiovanni 3:16\n16 ' + lungo);
await pg.waitForSelector('button.slide');
const lunghe = await pg.locator('button.slide.long').count();
if (lunghe !== 1) fail('doveva esserci 1 slide segnalata, trovate ' + lunghe);
if (!/righe/.test(await pg.locator('.note').first().innerText())) fail('manca l\'avviso con le righe');
if (await pg.locator('#sum').getAttribute('data-state') !== 'warn') fail('il riepilogo dovrebbe essere giallo');
// la slide breve ha il riquadro e il riferimento nelle posizioni del modello
const box = await pg.locator('button.slide >> nth=0').evaluate((el) => {
  const r = el.getBoundingClientRect(), t = el.querySelector('.stext').getBoundingClientRect(), f = el.querySelector('.sref').getBoundingClientRect();
  return { x: (t.left - r.left) / r.width * 1920, y: (t.top - r.top) / r.width * 1920, w: t.width / r.width * 1920, ry: (f.top - r.top) / r.width * 1920 };
});
if (Math.abs(box.x - 111.6) > 2 || Math.abs(box.y - 100.9) > 2 || Math.abs(box.w - 1696.7) > 2 || Math.abs(box.ry - 540) > 3) fail('posizioni diverse dal modello: ' + JSON.stringify(box));
// controlli prima di scaricare
if (!(await pg.locator('#checks').isVisible())) fail('manca l\'elenco dei controlli');
if (!/1 punto da controllare/.test(await pg.locator('#checks-s').innerText())) fail('riepilogo controlli inatteso: ' + await pg.locator('#checks-s').innerText());
await pg.click('#checks-s');
const voci = await pg.locator('#checks-l li').allInnerTexts();
if (!voci.some((t) => /non entra/.test(t)) || !voci.some((t) => /2 slide/.test(t))) fail('voci dei controlli inattese: ' + voci.join(' | '));
// canzoni
await pg.click('#tab-canzoni');
await pg.fill('#c-it', 'Verse 1\nCome il sole che sorge\nLa tua bontà\n\nChorus\nBuono sei\nBuono sei');
await pg.fill('#c-en', 'Verse 1\nSure as the sun\nYour goodness\n\nChorus\nYou are good\nYou are good');
await pg.waitForFunction(() => /sezion/.test(document.getElementById('checks-l').innerText));
const vs = await pg.locator('#checks-l li').allInnerTexts();
if (!vs.some((t) => /2 sezioni/.test(t))) fail('controlli delle canzoni inattesi: ' + vs.join(' | '));
await b.close();
console.log({ lunghe, errori });
if (errori.length) process.exit(1);
