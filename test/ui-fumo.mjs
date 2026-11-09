// Prova nel browser (richiede Playwright, già presente nell'ambiente): node test/ui-fumo.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
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

// unire e separare i versetti dall'ingrandimento
await pg.click('button.slide >> nth=0');
await pg.waitForSelector('dialog.show');
await pg.click('#v-sp');                                   // separa 5 e 6
await pg.waitForFunction(() => document.querySelectorAll('button.slide').length === 3);
if (!/Slide 1 di 3/.test(await pg.locator('#vinfo').innerText())) fail('dopo "Separa" dovrebbe restare sulla slide 1 di 3');
if (!(await pg.locator('.pc-reset').count())) fail('manca "Ripristina la divisione automatica"');
await pg.click('#v-nj');                                   // riunisce 5 e 6: torna uguale all'automatico
await pg.waitForFunction(() => document.querySelectorAll('button.slide').length === 2);
if (await pg.locator('.pc-reset').count()) fail('tornata uguale all\'automatico, non dovrebbe risultare modificata');
await pg.click('#v-sp');                                   // separa di nuovo e ripristina dalla scheda
await pg.keyboard.press('Escape');
await pg.waitForFunction(() => !document.getElementById('viewer').open);
await pg.click('.pc-reset');
await pg.waitForFunction(() => document.querySelectorAll('button.slide').length === 2);
if (await pg.locator('.pc-reset').count()) fail('il ripristino non ha tolto la modifica');

// testo perso: una riga dopo la riga vuota viene segnalata
await pg.fill('#msg', msg + '\n\nBuona domenica a tutti!');
await pg.waitForSelector('.pc.has-warn');
if (!/non è finito nelle slide/.test(await pg.locator('.pc.has-warn .note').first().innerText())) fail('manca l\'avviso sul testo perso');
await pg.fill('#msg', msg);
await pg.waitForFunction(() => !document.querySelector('.pc.has-warn'));

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
if (!/riletto il file/.test(await pg.locator('#dlstatus').innerText())) fail('manca la conferma della rilettura del file');

// tema: cambia e resta valido
await pg.click('#theme');
if (!(await pg.locator('#theme').getAttribute('data-m'))) fail('il pulsante del tema non risponde');

// svuota: torna allo stato vuoto
await pg.click('#clear');
if (!(await pg.locator('#empty').isVisible())) fail('dopo "Svuota" dovrebbe tornare lo stato vuoto');

// ---------- canzoni ----------
const fx = (n) => readFileSync(fileURLToPath(new URL('./fixtures/' + n, import.meta.url)), 'utf8');
await pg.click('#tab-canzoni');
if (!(await pg.locator('#c-in').isVisible()) || (await pg.locator('#s-msg').isVisible())) fail('il cambio di modalità non mostra le sezioni giuste');
if (!(await pg.locator('#dlbtn').isDisabled())) fail('senza testi non si dovrebbe poter scaricare');
await pg.fill('#c-it', fx('taste-it.txt')); await pg.fill('#c-en', fx('taste-en.txt'));
await pg.waitForSelector('#c-list .pc');
const nCard = () => pg.locator('#c-list .pc').count();
const nomi = async () => pg.evaluate(() => [...document.querySelectorAll('#c-list .pc h3')].map((h) => h.textContent));
if ((await nCard()) !== 19) fail('attese 19 sezioni, trovate ' + (await nCard()));
if ((await pg.inputValue('#nome')) !== 'Taste and See - ITA + ENG') fail('nome inatteso: ' + (await pg.inputValue('#nome')));
if ((await nomi())[0] !== 'Intro') fail('la prima sezione dovrebbe essere Intro');
// duplicare, spostare, togliere
await pg.click('#c-list .pc >> nth=2 >> button[data-act="dup"]');
if ((await nCard()) !== 20) fail('Duplica non ha aggiunto una sezione');
await pg.click('#c-list .pc >> nth=3 >> button[data-act="del"]');
if ((await nCard()) !== 19) fail('Elimina non ha tolto la sezione');
await pg.click('#c-list .pc >> nth=0 >> button[data-act="down"]');
if ((await nomi())[0] !== 'Verse 1') fail('Sposta giù non ha spostato Intro');
await pg.click('#c-ord-en');                                   // torna all'ordine del testo
if ((await nomi())[0] !== 'Intro') fail('l\'ordine del testo non è tornato');
// righe che non tornano: separa una riga del Chorus -> errore, poi si rimette a posto
const chorus = '#c-list .pc:has(h3:text-is("Chorus")) >> nth=0';
await pg.click(chorus + ' >> button[data-act="split"][data-side="it"] >> nth=0');
await pg.waitForFunction(() => document.getElementById('c-sum').dataset.state === 'err');
if (!(await pg.locator('#dlbtn').isDisabled())) fail('con righe che non tornano non si deve poter scaricare');
await pg.click(chorus + ' >> button[data-act="merge"][data-side="it"] >> nth=0');
await pg.waitForFunction(() => document.getElementById('c-sum').dataset.state !== 'err');
// correggere dalla tabella: spezzare una riga inglese e correggere una parola italiana
const enBox = () => pg.inputValue('#c-en'), itBox = () => pg.inputValue('#c-it');
await pg.click(chorus + ' >> .cell.en >> button.ln >> nth=0');
await pg.waitForSelector('#c-list .ed-in');
await pg.evaluate(() => { const i = document.querySelector('#c-list .ed-in'); i.focus(); i.setSelectionRange('You are good, You are good'.length, 'You are good, You are good'.length); });
await pg.click('#c-list [data-act="ed-split"]');
await pg.waitForFunction(() => !document.querySelector('#c-list .ed-in'));
if (!(await enBox()).includes('You are good, You are good\nand have always been')) fail('"Spezza qui" non ha scritto le due righe nel testo inglese');
if (await pg.locator('#c-sum[data-state="err"]').count()) fail('dopo aver spezzato la riga il Chorus dovrebbe tornare in pari');
await pg.click(chorus + ' >> .cell.it >> button.ln >> nth=1');
await pg.fill('#c-list .ed-in', 'Per sempre lo sarai');
await pg.press('#c-list .ed-in', 'Enter');
await pg.waitForFunction(() => !document.querySelector('#c-list .ed-in'));
if (!(await itBox()).includes('Per sempre lo sarai')) fail('la correzione non è finita nel testo italiano');
await pg.click(chorus + ' >> .cell.it >> button.ln >> nth=0'); await pg.press('#c-list .ed-in', 'Escape');
if (await pg.locator('#c-list .ed-in').count()) fail('Esc dovrebbe chiudere la modifica');

// ordine dell'intestazione e sezione aggiunta
await pg.click('#c-ord-hd');
if ((await nCard()) !== 20) fail('l\'ordine dell\'intestazione dovrebbe avere 20 sezioni, ha ' + (await nCard()));
await pg.selectOption('#c-add', 'tag'); await pg.click('#c-add-btn');
if ((await nCard()) !== 21) fail('Aggiungi non ha aggiunto la sezione');
// scarica con rilettura
const [dls] = await Promise.all([pg.waitForEvent('download'), pg.click('#dlbtn')]);
await pg.waitForFunction(() => document.getElementById('dlbtn').dataset.state === 'done');
if (!/\.pro$/.test(dls.suggestedFilename())) fail('nome file canzone inatteso: ' + dls.suggestedFilename());
if (!/riletto il file/.test(await pg.locator('#dlstatus').innerText())) fail('manca la conferma della rilettura (canzoni)');
// ---------- caricare file ----------
const pdfIt = fileURLToPath(new URL('./fixtures/taste-it.pdf', import.meta.url)), pdfEn = fileURLToPath(new URL('./fixtures/taste-en.pdf', import.meta.url));
await pg.click('#c-clear');
await pg.setInputFiles('#cf-en', pdfEn);
await pg.waitForFunction(() => document.getElementById('c-en').value.includes('Sure as the sun'));
if (!/Caricato da: taste-en\.pdf/.test(await pg.locator('#src-en').innerText())) fail('manca il nome del file caricato (inglese)');
if (await pg.locator('#fx-en').isVisible()) fail('il PDF inglese non dovrebbe chiedere conferme');
await pg.setInputFiles('#cf-it', pdfIt);
await pg.waitForSelector('#fx-it:not([hidden])');
if ((await pg.locator('#fx-it .fx-row').count()) !== 2) fail('il PDF italiano dovrebbe chiedere 2 conferme');
if (!(await pg.locator('#dlbtn').isDisabled())) fail('con lettere da confermare non si deve poter scaricare');
await pg.click('#fx-it [data-act="fx-apply"]');
await pg.waitForFunction(() => document.getElementById('fx-it').hidden);
if ((await itBox()).includes('{?')) fail('i segnaposto non sono stati sostituiti');
if (!(await itBox()).includes('Come il sole che sorge al mattino')) fail('la lettura del PDF italiano è sbagliata');
if ((await nCard()) !== 19) fail('dai PDF dovrebbero uscire 19 sezioni, sono ' + (await nCard()));
const [dlp] = await Promise.all([pg.waitForEvent('download'), pg.click('#dlbtn')]);
await pg.waitForFunction(() => document.getElementById('dlbtn').dataset.state === 'done');
// due file insieme: si capisce quale è quale
await pg.click('#c-clear');
await pg.setInputFiles('#cf-it', [pdfEn, pdfIt]);
await pg.waitForFunction(() => document.getElementById('c-en').value.includes('Sure as the sun') && document.getElementById('c-it').value.includes('Come il sole'));
// file di testo con codifica Windows-1252
await pg.click('#c-clear');
await pg.setInputFiles('#cf-it', { name: 'Canzone - ITA.txt', mimeType: 'text/plain', buffer: Buffer.concat([Buffer.from('Verse 1\nLa tua bont'), Buffer.from([0xE0]), Buffer.from('\n')]) });
await pg.waitForFunction(() => document.getElementById('c-it').value.includes('bontà'));
// un file che non è leggibile: avviso, nessun errore
await pg.setInputFiles('#cf-en', { name: 'falso.pdf', mimeType: 'application/pdf', buffer: Buffer.from('non sono un pdf') });
await pg.waitForSelector('#toast.show');
if (!/non sembra un PDF/.test(await pg.locator('#toast').innerText())) fail('manca il messaggio per il PDF non valido');

// si torna ai versetti
await pg.click('#tab-bibbia');
if (!(await pg.locator('#s-msg').isVisible()) || (await pg.locator('#c-in').isVisible())) fail('il ritorno ai versetti non mostra le sezioni giuste');

console.log({ passi, slide, file: dl.suggestedFilename(), errori });
await b.close();
if (errori.length) process.exit(1);
