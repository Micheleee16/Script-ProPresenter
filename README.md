# Script Pro

Pagina unica, senza dipendenze e senza server (funziona offline) che prepara presentazioni
ProPresenter 7:

- **Versetti:** trasforma il messaggio del pastore in slide, con l'aspetto del template "Messaggio Modena".
- **Canzoni:** da un testo italiano e uno inglese fa le slide come nel modello "Breakthrough's Coming - ITA + ENG"
  (italiano in maiuscolo sulla slide, inglese nelle note, un gruppo per ogni sezione).
  I testi si incollano oppure si caricano da file `.txt`, `.pdf` o Word `.docx` (anche trascinandoli).
- Il messaggio dei versetti si può caricare anche da una chat esportata da WhatsApp (`.zip` o `.txt`, formati computer, iPhone e Android).
- Il lavoro in corso si salva da solo nel browser e si riprende alla prossima apertura.

**Per usarla:** apri la pagina pubblicata su GitHub Pages (https://micheleee16.github.io/Script-ProPresenter/), oppure genera il file con `node build.mjs` e aprilo (`dist/Script-Pro.html`). Una volta aperta funziona anche offline.

## Struttura

```
src/index.html        struttura della pagina (con due segnaposto: stile e script)
src/ui/stile.css      aspetto in stile Apple: caratteri di sistema, superfici raggruppate, barre traslucide,
                      controlli segmentati e interruttori, colori chiari e scuri, animazioni a molla, telefono
src/ui/*.js           interfaccia: base (strumenti), anteprima, controllo (riepilogo, schede e barra Scarica),
                      scarica, immagini (si ricordano per la volta dopo), ingrandimento, avvio
src/engine/*.js       engine (layout.js: misure del modello e righe di testo; canzoni.js e canzone.js per le canzoni, pdf.js e office.js per i file): formato Protocol Buffers, RTF, libri, lettura del messaggio,
                      raggruppamento in slide (anche con correzioni a mano), costruzione della presentazione,
                      rilettura finale del file generato, zip
template/             Messaggio_Modena.pro (versetti) e Canzone_ITA-ENG.pro (canzoni): i modelli originali,
                      incorporati nella pagina in base64
build.mjs             assembla dist/Script-Pro.html
test/                 test automatici (node --test)
dist/Script-Pro.html  il file finale, generato (non è nel repo): lo crea `node build.mjs`, lo pubblica la CI su GitHub Pages
.github/workflows/    test.yml: build e test a ogni push; pages.yml: pubblicazione su GitHub Pages dopo ogni merge su main
```

## Comandi (serve Node 18 o più recente, nessun pacchetto da installare)

```bash
node build.mjs     # rigenera dist/Script-Pro.html dai sorgenti
node --test test/*.test.mjs   # esegue i test dell'engine
node test/ui-fumo.mjs         # prova l'interfaccia nel browser (serve Playwright)
node test/ui-novita.mjs       # prova bozza, anteprima, annulla, video, colori, file Word e zip
node test/ui-layout.mjs       # prova l'avviso quando il testo non entra nel riquadro della slide
node test/ui-accessibilita.mjs # tastiera, nomi dei pulsanti, punti di riferimento
node test/ui-axe.mjs          # controllo automatico di accessibilità (serve: npm install --no-save axe-core@4)
```

Dopo ogni modifica ai sorgenti: `node build.mjs`, poi i test. I test dell'interfaccia aprono `dist/Script-Pro.html`, quindi vanno lanciati dopo la build. La CI esegue gli stessi passi a ogni push.
