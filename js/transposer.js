/**
 * transposer.js — FIAT
 * Responsabilidad única: transponer acordes y tonalidades.
 * Sin dependencias externas. Sin acceso al DOM.
 */

const Transposer = (function () {

  // Escala cromática (preferencia por sostenidos)
  const SC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  // Tabla de enarmónicos: mapea bemoles a su equivalente en sostenidos
  const ENH = {
    'Db':'C#','Eb':'D#','Fb':'E','Gb':'F#','Ab':'G#','Bb':'A#','Cb':'B'
  };

  /** Índice cromático de una nota (resuelve enarmónicos). */
  function noteIndex(note) {
    return SC.indexOf(ENH[note] ?? note);
  }

  /** Transpone una nota raíz s semitonos. */
  function transposeNote(note, semitones) {
    const i = noteIndex(note);
    if (i < 0) return note; // nota desconocida: devolver sin cambios
    return SC[((i + semitones) % 12 + 12) % 12];
  }

  /**
   * Transpone un acorde completo s semitonos.
   * Maneja: raíz, calidad (m, maj7, sus4…) y bajo opcional (C/G).
   */
  function transposeChord(chord, semitones) {
    if (!semitones) return chord;
    const m = chord.match(/^([A-G][b#]?)(.*)/);
    if (!m) return chord;
    const root = transposeNote(m[1], semitones);
    const rest = m[2];
    // Acorde con bajo: "Am/E" → transponer raíz y bajo por separado
    const bassMatch = rest.match(/\/([A-G][b#]?)$/);
    if (bassMatch) {
      const quality = rest.slice(0, rest.lastIndexOf('/'));
      return root + quality + '/' + transposeNote(bassMatch[1], semitones);
    }
    return root + rest;
  }

  /**
   * Muestra la tonalidad con el desplazamiento aplicado.
   * Ejemplo: displayKey('G', 2) → 'A (+2)'
   */
  function displayKey(key, semitones) {
    if (!semitones) return key || '—';
    return transposeChord(key || 'C', semitones) + ` (${semitones > 0 ? '+' : ''}${semitones})`;
  }

  return { transposeChord, displayKey };

})();
