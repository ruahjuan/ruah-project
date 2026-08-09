/**
 * pdf-export.js — RUAH
 * Exporta canciones y setlists a PDF usando jsPDF.
 *
 * Depende de: Parser, Transposer, Migrator, jsPDF (global window.jspdf.jsPDF)
 * Sin acceso a estado global salvo lo que se le pase por parámetro.
 *
 * NOTA: la conversión de notación (americana ↔ Do-Re-Mi) está duplicada
 * aquí a partir de renderer.js para no acoplar este módulo al DOM.
 * Si en algún momento cambia la tabla EUR en renderer.js, replicar el
 * cambio acá también.
 *
 * LAYOUT DE CANCIÓN (v2):
 * Cada canción tiene que entrar en UNA sola hoja. Para lograrlo, antes
 * de dibujar se mide (con el mismo motor de render, en modo "measure")
 * cuánto ocupa el contenido y se decide, en este orden:
 *   1) una columna a todo el ancho, tamaño normal
 *   2) dos columnas, tamaño normal
 *   3) dos columnas, reduciendo la escala de fuente en pasos hasta que entre
 * Medir con el mismo código que dibuja evita que la estimación de alto
 * quede desalineada del render real (nada de heurísticas aparte).
 */

const PdfExport = (function () {

  // ── Notación europea (idéntica a renderer.js) ──────────────────────────
  const EUR = {
    'C':'Do','C#':'Do#','Db':'Reb',
    'D':'Re','D#':'Re#','Eb':'Mib',
    'E':'Mi','F':'Fa','F#':'Fa#','Fb':'Mib',
    'G':'Sol','G#':'Sol#','Gb':'Solb',
    'A':'La','A#':'La#','Ab':'Lab',
    'B':'Si','Bb':'Sib','Cb':'Si'
  };

  function toEur(note) { return EUR[note] || note; }

  function americanToEuropean(chord) {
    const m = chord.match(/^([A-G][b#]?)(.*)/);
    if (!m) return chord;
    const root = toEur(m[1]);
    const rest = m[2];
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

  function applyNotation(str, notation) {
    if (notation !== 'european') return str;
    return str.replace(
      /\b([A-G][b#]?)(maj7?|min7?|m7?|M7?|sus[24]?|add9?|aug|dim7?|°|ø)?(\d*)(\/[A-G][b#]?)?\b/g,
      match => americanToEuropean(match)
    );
  }

  // Transpone + aplica notación a una cadena de acordes (formato chord-row)
  function transposeChordString(str, semitones, notation) {
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
    return applyNotation(result, notation);
  }

  // ── Layout ───────────────────────────────────────────────────────────
  const PAGE_W    = 210, PAGE_H = 297; // A4 en mm
  const MARGIN    = 15;   // antes 18 — un poco más de área útil por hoja
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const COL_GUTTER = 8;

  const GOLD = [176, 141, 87];   // acento dorado de la identidad RUAH
  const INK  = [30, 30, 30];
  const MUTE = [110, 110, 110];

  // Tamaños/alturas base (mm / pt) a escala 1. Se multiplican por
  // "scale" cuando una canción no entra en una hoja ni siquiera a 2 columnas.
  const BASE = {
    LINE_H:              5.6,
    SECTION_SIZE:        10.5,
    ANNOTATION_SIZE:      9.5,
    LYRIC_SIZE:           11,
    CHORDROW_SIZE:        10.5,
    CHORDLINE_CHORD_SIZE:  9
  };

  // Pasos de reducción de escala como último recurso para que la canción
  // siga entrando en una sola hoja (a 2 columnas) aunque sea muy larga.
  const SCALE_STEPS = [1, 0.93, 0.87, 0.8, 0.74];

  function newDoc() {
    const { jsPDF } = window.jspdf;
    return new jsPDF({ unit: 'mm', format: 'a4' });
  }

  /**
   * Encabezado: Título + Intérprete (sin compositor).
   * @param {Object} song
   * @param {number} sem   — semitonos de transposición manual (como en la app)
   * @param {number} capo  — traste del capo (resta semitonos visibles)
   * @returns {number} y donde debe empezar el cuerpo de la canción
   */
  function addHeader(doc, song, sem, capo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(20, 20, 20);
    doc.text(song.title || 'Sin título', MARGIN, 19);

    if (song.artist) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(...MUTE);
      doc.text(song.artist, MARGIN, 25);
    }

    if (song.key) {
      // Igual que el header en pantalla: el tono mostrado usa sem crudo
      // (no effectiveSem), y el capo se anota aparte.
      const keyLabel = Transposer.displayKey(song.key, sem) + (capo > 0 ? ` [Capo ${capo}]` : '');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...GOLD);
      doc.text('Tono: ' + keyLabel, PAGE_W - MARGIN, 19, { align: 'right' });
    }

    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, 28.5, PAGE_W - MARGIN, 28.5);

    return 35; // y inicial del cuerpo (antes 42)
  }

  /**
   * Dibuja o mide UN bloque de contenido a partir de `y`, y devuelve el
   * nuevo `y`. Con `layout.draw = false` no se dibuja nada (solo se
   * setean fuentes, necesario para medir anchos/wraps con precisión) —
   * así medición y dibujo comparten exactamente la misma lógica de alto.
   *
   * @param {Object} layout — { x, width, scale, draw }
   */
  function renderOneBlock(doc, block, semitones, notation, y, layout) {
    const { x, width, scale, draw } = layout;
    const LH = BASE.LINE_H * scale;

    switch (block.type) {

      case 'spacer':
        y += LH * 0.6;
        break;

      case 'section': {
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(BASE.SECTION_SIZE * scale);
        if (draw) {
          doc.setTextColor(...GOLD);
          doc.text(block.label.toUpperCase(), x, y);
        }
        y += LH;
        break;
      }

      case 'annotation': {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(BASE.ANNOTATION_SIZE * scale);
        if (draw) {
          doc.setTextColor(...MUTE);
          doc.text(block.text, x, y);
        }
        y += LH;
        break;
      }

      case 'lyric-only': {
        doc.setFont('helvetica', block.isChorus ? 'bolditalic' : 'normal');
        doc.setFontSize(BASE.LYRIC_SIZE * scale);
        const lines = doc.splitTextToSize(block.text, width);
        for (const ln of lines) {
          if (draw) {
            doc.setTextColor(...INK);
            doc.text(ln, x, y);
          }
          y += LH;
        }
        break;
      }

      case 'chord-row': {
        const chordStr = transposeChordString(block.chords, semitones, notation);
        const fs = BASE.CHORDROW_SIZE * scale;
        doc.setFont('courier', 'bold');
        doc.setFontSize(fs);
        if (draw) {
          doc.setTextColor(...GOLD);
          doc.text(chordStr, x, y);
        }
        y += LH - scale;
        doc.setFont('courier', block.isChorus ? 'oblique' : 'normal');
        doc.setFontSize(fs);
        if (draw) {
          doc.setTextColor(...INK);
          // OJO: NO usar .trim() acá — el parser solo aplica trimEnd(),
          // los espacios iniciales alinean la letra bajo el acorde.
          doc.text(block.lyric, x, y);
        }
        y += LH + scale;
        break;
      }

      case 'chord-line': {
        let cx = x;

        for (const { chord, lyric } of block.tokens) {
          const text = lyric || '';

          doc.setFont('helvetica', block.isChorus ? 'italic' : 'normal');
          doc.setFontSize(BASE.LYRIC_SIZE * scale);
          const lyricW = doc.getTextWidth(text);

          // El acorde se dibuja en otra fuente/tamaño (courier bold, más
          // chico) que la letra. Si la letra debajo es corta o vacía
          // (típico en intros/interludios con acordes muy juntos), el
          // ancho del ACORDE puede ser mayor que el de la letra — hay
          // que reservar el máximo de los dos o el próximo acorde se
          // dibuja pisando al anterior.
          let chordText = null, chordW = 0;
          if (chord) {
            chordText = applyNotation(
              semitones ? Transposer.transposeChord(chord, semitones) : chord,
              notation
            );
            doc.setFont('courier', 'bold');
            doc.setFontSize(BASE.CHORDLINE_CHORD_SIZE * scale);
            chordW = doc.getTextWidth(chordText);
          }

          const w = Math.max(lyricW, chordW, 3 * scale);

          if (cx + w > x + width) {
            cx = x;
            y += LH * 2;
          }

          if (chordText && draw) {
            doc.setFont('courier', 'bold');
            doc.setFontSize(BASE.CHORDLINE_CHORD_SIZE * scale);
            doc.setTextColor(...GOLD);
            doc.text(chordText, cx, y);
          }

          doc.setFont('helvetica', block.isChorus ? 'italic' : 'normal');
          doc.setFontSize(BASE.LYRIC_SIZE * scale);
          if (draw) {
            doc.setTextColor(...INK);
            doc.text(text, cx, y + LH - 1.5 * scale);
          }
          cx += w;
        }
        y += LH * 2 - scale;
        break;
      }
    }

    return y;
  }

  function renderBlocksToPDF(doc, blocks, semitones, notation, startY, layout) {
    let y = startY;
    for (const block of blocks) {
      y = renderOneBlock(doc, block, semitones, notation, y, layout);
    }
    return y;
  }

  // Alto (delta de y) que ocupa un solo bloque, medido de forma aislada.
  // Válido porque ningún bloque depende del `y` de partida para calcular
  // su propio alto (solo depende de su contenido + width/scale).
  function blockHeight(doc, block, semitones, notation, width, scale) {
    return renderOneBlock(doc, block, semitones, notation, 0, { x: 0, width, scale, draw: false });
  }

  /**
   * Decide cómo entra la canción en una sola hoja: 1 columna, 2 columnas,
   * o 2 columnas con la fuente reducida un paso más en cada intento.
   */
  function decideLayout(doc, blocks, semitones, notation, headerH) {
    const availH = PAGE_H - MARGIN - headerH;
    const colW = (CONTENT_W - COL_GUTTER) / 2;

    let lastAttempt = null;

    for (const scale of SCALE_STEPS) {
      const singleH = renderBlocksToPDF(doc, blocks, semitones, notation, 0,
        { x: 0, width: CONTENT_W, scale, draw: false });
      if (singleH <= availH) {
        return { mode: 'single', scale };
      }

      const heights = blocks.map(b => blockHeight(doc, b, semitones, notation, colW, scale));
      let cum = 0, splitIndex = blocks.length;
      for (let i = 0; i < heights.length; i++) {
        if (cum + heights[i] > availH) { splitIndex = i; break; }
        cum += heights[i];
      }
      const col2H = heights.slice(splitIndex).reduce((a, b) => a + b, 0);
      lastAttempt = { mode: 'two-col', scale, splitIndex: splitIndex || 1, colW };

      if (splitIndex > 0 && splitIndex < blocks.length && col2H <= availH) {
        return lastAttempt;
      }
    }

    // Último recurso: quedó una canción excepcionalmente larga. Se usa la
    // escala mínima a 2 columnas igual, aunque desborde un poco — mejor
    // eso que perder el layout de 1-hoja-por-canción en el 99% de los casos.
    return lastAttempt || { mode: 'single', scale: SCALE_STEPS[SCALE_STEPS.length - 1] };
  }

  function renderSongPage(doc, song, sem, capo, notation) {
    const semEff = effectiveSem(sem, capo);
    const blocks = parseContent(song);
    const headerH = addHeader(doc, song, sem, capo);

    const layout = decideLayout(doc, blocks, semEff, notation, headerH);

    if (layout.mode === 'single') {
      renderBlocksToPDF(doc, blocks, semEff, notation, headerH,
        { x: MARGIN, width: CONTENT_W, scale: layout.scale, draw: true });
    } else {
      const col1 = blocks.slice(0, layout.splitIndex);
      const col2 = blocks.slice(layout.splitIndex);
      const x2 = MARGIN + layout.colW + COL_GUTTER;
      renderBlocksToPDF(doc, col1, semEff, notation, headerH,
        { x: MARGIN, width: layout.colW, scale: layout.scale, draw: true });
      renderBlocksToPDF(doc, col2, semEff, notation, headerH,
        { x: x2, width: layout.colW, scale: layout.scale, draw: true });
    }
  }

  // Igual que renderBody() en app.js: sem = transposición manual,
  // capo = traste del capo (resta semitonos visibles al acorde real).
  function effectiveSem(sem, capo) {
    return ((sem - capo) % 12 + 12) % 12;
  }

  function parseContent(song) {
    const raw = (typeof Migrator !== 'undefined' && Migrator.migrate)
      ? Migrator.migrate(song.content || '')
      : (song.content || '');
    return Parser.parse(raw);
  }

  /**
   * Exporta una sola canción a PDF y dispara la descarga.
   * @param {Object} song           — objeto canción (title, artist, content, key)
   * @param {Object} [tone]         — { sem, capo } — igual que el estado global sem/capo
   * @param {string} [notation='american'] — 'american' | 'european'
   */
  function exportSong(song, tone = {}, notation = 'american') {
    const sem  = tone.sem  || 0;
    const capo = tone.capo || 0;
    const doc = newDoc();
    renderSongPage(doc, song, sem, capo, notation);
    doc.save((typeof slugify === 'function' ? slugify(song.title) : song.title || 'cancion') + '.pdf');
  }

  /**
   * Exporta un setlist completo a PDF: portada (índice) + una canción por
   * página, cada una ajustada para entrar completa en su hoja.
   * @param {string} name  — nombre del setlist
   * @param {Array}  items — [{ song, sem, capo }]
   * @param {string} [notation='american']
   */
  function exportSetlist(name, items, notation = 'american') {
    const doc = newDoc();

    // ── Portada / índice (sin cambios) ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(20, 20, 20);
    doc.text(name || 'Setlist', MARGIN, 40);

    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, 46, PAGE_W - MARGIN, 46);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    let ly = 58;

    items.forEach((it, i) => {
      doc.setTextColor(...MUTE);
      doc.text(`${i + 1}. ${it.song.title}`, MARGIN, ly);

      if (it.song.key) {
        const label = Transposer.displayKey(it.song.key, it.sem || 0) + (it.capo ? ` [Capo ${it.capo}]` : '');
        doc.setTextColor(...GOLD);
        doc.text(label, PAGE_W - MARGIN, ly, { align: 'right' });
      }

      ly += 8;
      if (ly > PAGE_H - MARGIN) { doc.addPage(); ly = MARGIN; }
    });

    // ── Una página por canción, ajustada para entrar completa ──
    items.forEach(it => {
      doc.addPage();
      renderSongPage(doc, it.song, it.sem || 0, it.capo || 0, notation);
    });

    doc.save((typeof slugify === 'function' ? slugify(name) : name || 'setlist') + '.pdf');
  }

  return { exportSong, exportSetlist };

})();
