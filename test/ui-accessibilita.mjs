// Prova nel browser: tastiera e struttura (ruoli, nomi, punti di riferimento).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = 'file://' + fileURLToPath(new URL('../dist/Script-Pro.html', import.meta.url));
const b = await chromium.launch(); const pg = await (await b.newContext({ reducedMotion: 'reduce' })).newPage();
const errori = []; const fail = (m) => errori.push(m);
pg.on('pageerror', (e) => fail('pageerror: ' + e.message));
await pg.goto(url);

// la pagina ha un solo titolo principale dentro il punto di riferimento principale
if (await pg.locator('main h1').count() !== 1) fail('il titolo principale deve stare dentro <main>');
if (await pg.locator('header, [role=banner]').count() < 1) fail('manca l\'intestazione');

// tutti i pulsanti e i campi hanno un nome
const senzaNome = await pg.evaluate(() => [...document.querySelectorAll('button, input:not([type=hidden]), textarea, select')]
  .filter((el) => !el.closest('[hidden]') && !(el.getAttribute('aria-label') || el.labels?.length || el.textContent.trim() || el.getAttribute('aria-labelledby') || el.title))
  .map((el) => el.id || el.className));
if (senzaNome.length) fail('senza nome: ' + senzaNome.join(', '));

// i due modi si cambiano con le frecce
await pg.focus('#tab-bibbia');
await pg.keyboard.press('ArrowRight');
if (await pg.locator('#tab-canzoni').getAttribute('aria-selected') !== 'true') fail('la freccia destra non passa a Canzoni');
await pg.keyboard.press('ArrowLeft');
if (await pg.locator('#tab-bibbia').getAttribute('aria-selected') !== 'true') fail('la freccia sinistra non torna a Versetti');

// slide: raggiungibili e apribili con la tastiera, l'ingrandimento si chiude con Esc e il fuoco torna sulla slide
await pg.fill('#msg', 'Romani 6:5\n5 Testo breve');
await pg.waitForSelector('button.slide');
await pg.focus('button.slide');
await pg.keyboard.press('Enter');
await pg.waitForSelector('dialog.show');
if (!(await pg.evaluate(() => document.getElementById('viewer').contains(document.activeElement)))) fail('il fuoco non è dentro l\'ingrandimento');
await pg.keyboard.press('Escape');
await pg.waitForFunction(() => !document.getElementById('viewer').open);
if (!(await pg.evaluate(() => document.activeElement?.classList.contains('slide')))) fail('dopo Esc il fuoco non torna sulla slide');

// l'anello del fuoco si vede (contorno pieno, non trasparente)
await pg.keyboard.press('Tab'); await pg.keyboard.press('Shift+Tab');
const anello = await pg.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle + ' ' + s.outlineWidth; });
if (!/solid 3px/.test(anello)) fail('anello del fuoco inatteso: ' + anello);
await b.close();
console.log({ errori });
if (errori.length) process.exit(1);
