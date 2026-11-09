// Prova nel browser (richiede Playwright, già presente nell'ambiente): node test/ui-fumo.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');

const url = 'file://' + fileURLToPath(new URL('../dist/Versi.html', import.meta.url));
const b = await chromium.launch(); const pg = await b.newPage();
const errori = [];
pg.on('pageerror', (e) => errori.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errori.push(m.text()));
await pg.goto(url);
await pg.fill('#msg', 'Romani 6:5-6\n5 Testo di prova uno\n6 Testo di prova due\n\nAtti 2:1-2\n1 Testo di prova tre\n2 Testo di prova quattro');
await pg.waitForSelector('.slide');
const slide = await pg.locator('button.slide').count();
const passi = await pg.locator('.passage').count();
const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#dlbtn')]);
console.log({ slide, passi, file: dl.suggestedFilename(), errori });
await b.close();
if (errori.length || passi !== 2 || slide < 2) process.exit(1);
