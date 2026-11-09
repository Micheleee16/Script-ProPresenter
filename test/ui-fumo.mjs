// Prova nel browser (richiede Playwright, già presente nell'ambiente): node test/ui-fumo.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');

const url = 'file://' + fileURLToPath(new URL('../dist/Versi.html', import.meta.url));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const msg = 'Romani 6:5-6\n5 Testo di prova uno\n6 Testo di prova due\n\nAtti 2:1-2\n1 Testo di prova tre\n2 Testo di prova quattro';

const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const pg = await ctx.newPage();
const errori = []; const fail = (m) => errori.push(m);
pg.on('pageerror', (e) => fail('pageerror: ' + e.message)); pg.on('console', (m) => m.type() === 'error' && fail('console: ' + m.text()));
await pg.goto(url);

// stato iniziale: vuoto e scaricare non si può
if (!(await pg.locator('#empty').isVisible())) fail('manca lo stato vuoto');
if (!(await pg.locator('#dlbtn').isDisabled())) fail('il pulsante dovrebbe essere disabilitato');

// messaggio -> 2 passi, 2 slide
await pg.fill('#msg', msg);
await pg.waitForSelector('button.slide');
const passi = await pg.locator('.pc').count(), slide = await pg.locator('button.slide').count();
if (passi !== 2 || slide !== 2) fail(`attesi 2 passi e 2 slide, trovati ${passi} e ${slide}`);

// riepilogo: una riga sola, niente avvisi per un messaggio pulito
if (!/2 passi, 2 slide/.test(await pg.locator('#sum-t').innerText())) fail('riepilogo inatteso: ' + await pg.locator('#sum-t').innerText());
if (await pg.locator('#sum').getAttribute('data-state') !== 'ok') fail('il riepilogo dovrebbe essere verde');

// ingrandimento: apre, scorre con la tastiera, chiude con Esc
await pg.click('button.slide >> nth=0');
await pg.waitForSelector('dialog.show');
await pg.keyboard.press('ArrowRight');
if (!/Slide 2 di 2/.test(await pg.locator('#vinfo').innerText())) fail('la freccia destra non ha cambiato slide');
await pg.keyboard.press('Escape');
await pg.waitForFunction(() => !document.getElementById('viewer').open);

// immagini: si caricano, compaiono i riquadri, si tolgono
await pg.setInputFiles('#f-bg', { name: 'Sfondo prova.png', mimeType: 'image/png', buffer: PNG });
await pg.waitForSelector('#slot-bg.filled');
if (!(await pg.locator('#plist.bg-on').count())) fail('lo sfondo non è applicato all\'anteprima');
await pg.click('#rm-bg');
if (await pg.locator('#slot-bg.filled').count()) fail('lo sfondo non è stato tolto');

// scarica
const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#dlbtn')]);
await pg.waitForFunction(() => document.getElementById('dlbtn').dataset.state === 'done');
if (!/\.pro$/.test(dl.suggestedFilename())) fail('nome file inatteso: ' + dl.suggestedFilename());

// tema: cambia e resta valido
await pg.click('#theme');
if (!(await pg.locator('#theme').getAttribute('data-m'))) fail('il pulsante del tema non risponde');

// svuota: torna allo stato vuoto
await pg.click('#clear');
if (!(await pg.locator('#empty').isVisible())) fail('dopo "Svuota" dovrebbe tornare lo stato vuoto');

console.log({ passi, slide, file: dl.suggestedFilename(), errori });
await b.close();
if (errori.length) process.exit(1);
