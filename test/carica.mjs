// Carica l'engine (senza interfaccia) in Node, con numeri casuali deterministici.
import { engineSource } from '../build.mjs';

export function loadEngine() {
  let seed = 12345;
  const fakeCrypto = {
    getRandomValues(a) {
      for (let i = 0; i < a.length; i++) { seed = (seed * 1103515245 + 12345) >>> 0; a[i] = seed >>> 16 & 255; }
      return a;
    },
  };
  const names = 'readMessage group buildPresentation makeZip parse ser path latin1Str esc canonBook crc32 b64ToBytes TEMPLATE_B64 groupWith autoJoins verifyPresentation rtfPlain pick tokens parseSongText makeSong sectionSlides songBlocks defaultJoins chunksOf isChordLine sectionHeader arrangementOf buildSongFile verifySongFile slideFit editSongText pdfToText decodeTextFile guessLang mergeSongLines zipList zipRead docxToText docxXmlToText zipTextFile fileToText verseGeometry fitVerseSlide approxWidth BOOKS'.split(' ');
  const f = new Function('crypto', engineSource() + `\nreturn {${names.join(',')}};`);
  return f(fakeCrypto);
}
