# Script Pro

Pagina unica, senza dipendenze e senza server (funziona offline) che prepara presentazioni
ProPresenter 7:

- **Versetti:** trasforma il messaggio del pastore in slide, con l'aspetto del template "Messaggio Modena".
- **Canzoni:** da un testo italiano e uno inglese fa le slide come nel modello "Breakthrough's Coming - ITA + ENG"
  (italiano in maiuscolo sulla slide, inglese nelle note, un gruppo per ogni sezione).
  I testi si incollano oppure si caricano da file `.txt`, `.pdf` o Word `.docx` (anche trascinandoli).
- Il messaggio dei versetti si può caricare anche da una chat esportata da WhatsApp (`.zip` o `.txt`, formati computer, iPhone e Android).
- Il lavoro in corso si salva da solo nel browser e si riprende alla prossima apertura.

**Per usarla:** apri `dist/Script-Pro.html` nel browser.

## Struttura

```
src/index.html        struttura della pagina (con due segnaposto: stile e script)
src/ui/stile.css      aspetto in stile Apple: caratteri di sistema, superfici raggruppate, barre traslucide,
                      controlli segmentati e interruttori, colori chiari e scuri, animazioni a molla, telefono
src/ui/*.js           interfaccia: base (strumenti), anteprima, controllo (riepilogo, schede e barra Scarica),
                      scarica, immagini (si ricordano per la volta dopo), ingrandimento, avvio
src/engine/*.js       engine (canzoni.js e canzone.js per le canzoni, pdf.js e office.js per i file): formato Protocol Buffers, RTF, libri, lettura del messaggio,
                      raggruppamento in slide (anche con correzioni a mano), costruzione della presentazione,
                      rilettura finale del file generato, zip
template/             Messaggio_Modena.pro (versetti) e Canzone_ITA-ENG.pro (canzoni): i modelli originali,
                      incorporati nella pagina in base64
build.mjs             assembla dist/Script-Pro.html
test/                 test automatici (node --test)
dist/Script-Pro.html  il file finale, generato: non modificarlo a mano
```

## Comandi (serve Node 18 o più recente, nessun pacchetto da installare)

```bash
node build.mjs     # rigenera dist/Script-Pro.html dai sorgenti
node --test test/*.test.mjs   # esegue i test dell'engine
node test/ui-fumo.mjs         # prova l'interfaccia nel browser (serve Playwright)
node test/ui-novita.mjs       # prova bozza, anteprima, annulla, video, colori, file Word e zip
```

Dopo ogni modifica ai sorgenti: `node build.mjs`, poi i test (verificano anche che `dist/` sia aggiornato).
