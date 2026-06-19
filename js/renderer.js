/**
 * renderer.js — FIAT
 * Convierte bloques del Parser en nodos DOM.
 *
 * Depende de: Transposer
 * Sin acceso a estado global. Sin manipulación de listas.
 *
 * Clases CSS generadas:
 *   .cp-spacer       — separador de estrofa
 *   .cp-section      — etiqueta de sección
 *   .cp-annotation   — nota entre paréntesis
 *   .cp-lyric-only   — línea de solo letra
 *   .cp-pair         — contenedor de dos filas (acordes + letra)
 *   .cp-chords-row   — fila superior: acordes
 *   .cp-lyric-row    — fila inferior: letra
 *   .cp-line         — línea ChordPro inline (bloque acorde+sílaba)
 *   .cp-block        — par (acorde, sílaba) dentro de cp-line
 *   .cp-chord        — acorde individual
 *   .cp-lyric        — sílaba/texto
 *   .chorus          — modificador para estribillo
 *   .print-mode      — oculta acordes al imprimir
 */

const Renderer = (function () {

  // ── Cifrado europeo ───────────────────────────────────────────────────
  // Mapa de nota americana → europea (sostenido primero, luego bemol)
  const EUR = {
    'C':'Do','C#':'Do#','Db':'Reb',
    'D':'Re','D#':'Re#','Eb':'Mib',
    'E':'Mi','F':'Fa','F#':'Fa#','Fb':'Mib',
    'G':'Sol','G#':'Sol#','Gb':'Solb',
    'A':'La','A#':'La#','Ab':'Lab',
    'B':'Si','Bb':'Sib','Cb':'Si',
    'Dmaj7':'Remaj7' // no se usa directamente; la raíz se convierte sola
  };

  /**
   * Convierte una nota/raíz a nomenclatura europea.
   * Solo convierte la parte de la raíz, deja la calidad intacta.
   */
  function toEur(note) {
    return EUR[note] || note;
  }

  /**
   * Convierte un acorde completo a cifrado europeo.
   * Ejemplo: "Am7" → "Lam7",  "C/G" → "Do/Sol"
   */
  function americanToEuropean(chord) {
    const m = chord.match(/^([A-G][b#]?)(.*)/);
    if (!m) return chord;
    const root    = toEur(m[1]);
    const rest    = m[2];
    // Bajo opcional: "Am/E" → "Lam/Mi"
    const bassIdx = rest.lastIndexOf('/');
    if (bassIdx !== -1) {
      const quality = rest.slice(0, bassIdx);
      const bass    = rest.slice(bassIdx + 1);
      const bassM   = bass.match(/^([A-G][b#]?)(.*)/);
      const bassEur = bassM ? toEur(bassM[1]) + bassM[2] : bass;
      return root + quality + '/' + bassEur;
    }
    return root + rest;
  }

  /**
   * Convierte todos los acordes de una cadena a cifrado europeo si corresponde.
   * Recibe el string ya transpuesto.
   */
  function applyNotation(str) {
    if (typeof chordNotation === 'undefined' || chordNotation === 'american') return str;
    return str.replace(/\b([A-G][b#]?)(maj7?|min7?|m7?|M7?|sus[24]?|add9?|aug|dim7?|°|ø)?(\d*)(\/[A-G][b#]?)?\b/g,
      match => {
        const m = match.match(/^([A-G][b#]?)(.*)/);
        if (!m) return match;
        return americanToEuropean(match);
      });
  }

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  // Transpone todos los acordes de una cadena de texto y aplica notación
  function transposeChordString(str, semitones) {
    let result = str;
    if (semitones) {
      result = result.replace(
        /\b([A-G][b#]?)(maj7?|min7?|m7?|M7?|sus[24]?|add9?|aug|dim7?|°|ø)?(\d*)?(\/[A-G][b#]?)?\b/g,
        match => {
          const m = match.match(/^([A-G][b#]?)(.*)/);
          if (!m) return match;
          const root = Transposer.transposeChord(m[1], semitones);
          const rest = m[2];
          const bass = rest.match(/\/([A-G][b#]?)$/);
          if (bass) {
            const quality = rest.slice(0, rest.lastIndexOf('/'));
            return root + quality + '/' + Transposer.transposeChord(bass[1], semitones);
          }
          return root + rest;
        }
      );
    }
    return applyNotation(result);
  }

  /**
   * Renderiza un bloque chord-row: dos filas (acordes arriba, letra abajo).
   * En print-mode solo muestra la letra.
   */
  function renderChordRow(block, semitones, printMode) {
    const cls = 'cp-pair' + (block.isChorus ? ' chorus' : '');

    if (printMode) {
      const p = el('p', 'cp-lyric-only' + (block.isChorus ? ' chorus' : ''));
      p.textContent = block.lyric.trim();
      return p;
    }

    const pair = el('div', cls);

    // Fila de acordes
    const chordsRow = el('div', 'cp-chords-row');
    chordsRow.textContent = transposeChordString(block.chords, semitones);
    pair.appendChild(chordsRow);

    // Fila de letra
    const lyricRow = el('div', 'cp-lyric-row');
    lyricRow.textContent = block.lyric.trim();
    pair.appendChild(lyricRow);

    return pair;
  }

  /**
   * Renderiza una chord-line ChordPro inline (bloque por sílaba).
   * Usado para canciones que ya vienen en formato ChordPro.
   */
  function renderChordLine(block, semitones, printMode) {
    const cls = 'cp-line' + (block.isChorus ? ' chorus' : '');

    if (printMode) {
      const p = el('p', 'cp-lyric-only' + (block.isChorus ? ' chorus' : ''));
      for (const { lyric } of block.tokens) {
        if (!lyric) continue;
        const span = el('span', 'cp-lyric');
        span.textContent = lyric;
        p.appendChild(span);
      }
      return p;
    }

    const line = el('div', cls);
    for (const { chord, lyric } of block.tokens) {
      const blk = el('span', 'cp-block');
      const chordEl = el('span', 'cp-chord');
      const rawChord = chord
        ? (semitones ? Transposer.transposeChord(chord, semitones) : chord)
        : '';
      chordEl.textContent = rawChord ? applyNotation(rawChord) : '';
      blk.appendChild(chordEl);
      const lyricEl = el('span', 'cp-lyric');
      lyricEl.textContent = lyric || '';
      blk.appendChild(lyricEl);
      line.appendChild(blk);
    }
    return line;
  }

  /**
   * Convierte un array de bloques en un DocumentFragment.
   */
  function render(blocks, semitones = 0, printMode = false) {
    const frag = document.createDocumentFragment();

    for (const block of blocks) {
      switch (block.type) {

        case 'spacer': {
          frag.appendChild(el('div', 'cp-spacer'));
          break;
        }
        case 'annotation': {
          const p = el('p', 'cp-annotation');
          p.textContent = block.text;
          frag.appendChild(p);
          break;
        }
        case 'section': {
          const p = el('p', 'cp-section' + (block.isChorus ? ' chorus' : ''));
          p.textContent = block.label;
          frag.appendChild(p);
          break;
        }
        case 'lyric-only': {
          const p = el('p', 'cp-lyric-only' + (block.isChorus ? ' chorus' : ''));
          p.textContent = block.text;
          frag.appendChild(p);
          break;
        }
        case 'chord-row': {
          frag.appendChild(renderChordRow(block, semitones, printMode));
          break;
        }
        case 'chord-line': {
          frag.appendChild(renderChordLine(block, semitones, printMode));
          break;
        }
      }
    }

    return frag;
  }

  return { render };

})();
