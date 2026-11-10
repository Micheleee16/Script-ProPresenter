// Controllo automatico di accessibilità (axe-core) su vuota, versetti, ingrandimento e canzoni, in chiaro e scuro.
// Serve axe-core (npm install --no-save axe-core@4); se manca, la prova viene saltata.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
let axeSrc;
try { axeSrc = readFileSync(process.env.AXE_PATH || require.resolve('axe-core/axe.min.js'), 'utf8'); }
catch { console.log('axe-core non installato: prova saltata'); process.exit(0); }
const url = 'file://' + fileURLToPath(new URL('../dist/Script-Pro.html', import.meta.url));
const msg = 'Romani 6:5\n5 Testo breve\n\nGiovanni 3:16\n16 ' + 'parola lunga '.repeat(50);
const b = await chromium.launch(); const problemi = [];
async function run(nome, scheme, prep) {
  const pg = await (await b.newContext({ colorScheme: scheme, reducedMotion: 'reduce', viewport: { width: 1000, height: 900 } })).newPage();
  await pg.goto(url); await prep(pg);
  await pg.addScriptTag({ content: axeSrc });
  const r = await pg.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }));
  for (const v of r.violations) for (const n of v.nodes) problemi.push(`${nome} (${scheme}): ${v.id} ${n.target.join(' ')}: ${(n.any[0] || n.all[0] || {}).message || v.help}`);
  await pg.close();
}
for (const scheme of ['light', 'dark']) {
  await run('vuota', scheme, async () => {});
  await run('versetti', scheme, async (pg) => { await pg.fill('#msg', msg); await pg.waitForSelector('button.slide'); await pg.click('#checks-s'); });
  await run('ingrandimento', scheme, async (pg) => { await pg.fill('#msg', msg); await pg.waitForSelector('button.slide'); await pg.click('button.slide >> nth=1'); await pg.waitForSelector('dialog.show'); });
  await run('canzoni', scheme, async (pg) => {
    await pg.click('#tab-canzoni');
    await pg.fill('#c-it', 'Verse 1\nCome il sole che sorge\nLa tua bontà\n\nChorus\nBuono sei\nBuono sei');
    await pg.fill('#c-en', 'Verse 1\nSure as the sun\nYour goodness\n\nChorus\nYou are good\nYou are good');
    await pg.waitForSelector('#c-list .pc');
  });
}
await b.close();
console.log({ problemi });
if (problemi.length) process.exit(1);
