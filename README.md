# Versi

Pagina unica, senza dipendenze e senza server (funziona offline) che trasforma il messaggio
del pastore in una presentazione ProPresenter 7 con l'aspetto del template "Messaggio Modena".

**Per usarla:** apri `dist/Versi.html` nel browser.

## Struttura

```
src/index.html        struttura della pagina (con due segnaposto: stile e script)
src/ui/stile.css      aspetto: una sola colonna, colori chiari e scuri, animazioni sobrie, telefono
src/ui/*.js           interfaccia: base (strumenti), anteprima, controllo (riepilogo, schede e barra Scarica),
                      scarica, immagini (si ricordano per la volta dopo), ingrandimento, avvio
src/engine/*.js       engine: formato Protocol Buffers, RTF, libri, lettura del messaggio,
                      raggruppamento in slide (anche con correzioni a mano), costruzione della presentazione,
                      rilettura finale del file generato, zip
template/             Messaggio_Modena.pro, il template originale (incorporato nella pagina in base64)
build.mjs             assembla dist/Versi.html
test/                 test automatici (node --test)
dist/Versi.html       il file finale, generato: non modificarlo a mano
```

## Comandi (serve Node 18 o più recente, nessun pacchetto da installare)

```bash
node build.mjs     # rigenera dist/Versi.html dai sorgenti
node --test test/*.test.mjs   # esegue i test dell'engine
node test/ui-fumo.mjs         # prova l'interfaccia nel browser (serve Playwright)
```

Dopo ogni modifica ai sorgenti: `node build.mjs`, poi i test (verificano anche che `dist/` sia aggiornato).
