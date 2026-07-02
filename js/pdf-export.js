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
  const MARGIN    = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const LINE_H    = 6;

  const GOLD = [176, 141, 87];   // acento dorado de la identidad RUAH
  const INK  = [30, 30, 30];
  const MUTE = [110, 110, 110];

  function newDoc() {
    const { jsPDF } = window.jspdf;
    return new jsPDF({ unit: 'mm', format: 'a4' });
  }

  function ensureSpace(doc, y, needed) {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      return MARGIN;
    }
    return y;
  }

  /**
   * @param {Object} song
   * @param {number} sem   — semitonos de transposición manual (como en la app)
   * @param {number} capo  — traste del capo (resta semitonos visibles)
   */
  function addHeader(doc, song, sem, capo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text(song.title || 'Sin título', MARGIN, 22);

    const sub = [song.artist, song.composer].filter(Boolean).join(' · ');
    if (sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...MUTE);
      doc.text(sub, MARGIN, 29);
    }

    if (song.key) {
      // Igual que el header en pantalla: el tono mostrado usa sem crudo
      // (no effectiveSem), y el capo se anota aparte.
      const keyLabel = Transposer.displayKey(song.key, sem) + (capo > 0 ? ` [Capo ${capo}]` : '');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...GOLD);
      doc.text('Tono: ' + keyLabel, PAGE_W - MARGIN, 22, { align: 'right' });
    }

    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, 33, PAGE_W - MARGIN, 33);

    return 42; // y inicial del cuerpo
  }

  function renderBlocksToPDF(doc, blocks, semitones, notation, startY) {
    let y = startY;

    for (const block of blocks) {
      switch (block.type) {

        case 'spacer':
          y += LINE_H * 0.6;
          break;

        case 'section': {
          y = ensureSpace(doc, y, LINE_H * 1.5) + 2;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(...GOLD);
          doc.text(block.label.toUpperCase(), MARGIN, y);
          y += LINE_H;
          break;
        }

        case 'annotation': {
          y = ensureSpace(doc, y, LINE_H);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9.5);
          doc.setTextColor(...MUTE);
          doc.text(block.text, MARGIN, y);
          y += LINE_H;
          break;
        }

        case 'lyric-only': {
          doc.setFont('helvetica', block.isChorus ? 'bolditalic' : 'normal');
          doc.setFontSize(11);
          doc.setTextColor(...INK);
          const lines = doc.splitTextToSize(block.text, CONTENT_W);
          for (const ln of lines) {
            y = ensureSpace(doc, y, LINE_H);
            doc.text(ln, MARGIN, y);
            y += LINE_H;
          }
          break;
        }

        case 'chord-row': {
          y = ensureSpace(doc, y, LINE_H * 2);
          const chordStr = transposeChordString(block.chords, semitones, notation);
          const fs = 10.5; // misma fuente Y mismo tamaño en ambas filas: es lo único
                            // que hace que los espacios del string de acordes caigan
                            // en la misma columna que en la fila de letra.
          doc.setFont('courier', 'bold');
          doc.setFontSize(fs);
          doc.setTextColor(...GOLD);
          doc.text(chordStr, MARGIN, y);
          y += LINE_H - 1;
          doc.setFont('courier', block.isChorus ? 'oblique' : 'normal');
          doc.setFontSize(fs);
          doc.setTextColor(...INK);
          // OJO: NO usar .trim() acá — el parser solo aplica trimEnd(),
          // los espacios iniciales son los que alinean la letra bajo el
          // acorde correspondiente.
          doc.text(block.lyric, MARGIN, y);
          y += LINE_H + 1;
          break;
        }

        case 'chord-line': {
          y = ensureSpace(doc, y, LINE_H * 2);
          let x = MARGIN;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);

          for (const { chord, lyric } of block.tokens) {
            const text = lyric || '';
            const w = doc.getTextWidth(text) || 3;

            if (x + w > PAGE_W - MARGIN) {
              x = MARGIN;
              y += LINE_H * 2;
              y = ensureSpace(doc, y, LINE_H * 2);
            }

            if (chord) {
              const c = semitones ? Transposer.transposeChord(chord, semitones) : chord;
              doc.setFont('courier', 'bold');
              doc.setFontSize(9);
              doc.setTextColor(...GOLD);
              doc.text(applyNotation(c, notation), x, y);
            }

            doc.setFont('helvetica', block.isChorus ? 'italic' : 'normal');
            doc.setFontSize(11);
            doc.setTextColor(...INK);
            doc.text(text, x, y + LINE_H - 1.5);
            x += w;
          }
          y += LINE_H * 2 - 1;
          break;
        }
      }
    }

    return y;
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
   * @param {Object} song           — objeto canción (title, artist, composer, content, key)
   * @param {Object} [tone]         — { sem, capo } — igual que el estado global sem/capo
   * @param {string} [notation='american'] — 'american' | 'european'
   */
  function exportSong(song, tone = {}, notation = 'american') {
    const sem  = tone.sem  || 0;
    const capo = tone.capo || 0;
    const doc = newDoc();
    const blocks = parseContent(song);
    const y0 = addHeader(doc, song, sem, capo);
    renderBlocksToPDF(doc, blocks, effectiveSem(sem, capo), notation, y0);
    doc.save((typeof slugify === 'function' ? slugify(song.title) : song.title || 'cancion') + '.pdf');
  }

  /**
   * Exporta un setlist completo a PDF: portada + una canción por página.
   * @param {string} name  — nombre del setlist
   * @param {Array}  items — [{ song, sem, capo }]
   * @param {string} [notation='american']
   */
  function exportSetlist(name, items, notation = 'american') {
    const doc = newDoc();

    // ── Portada ──
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

    // ── Una página por canción ──
    items.forEach(it => {
      doc.addPage();
      const sem  = it.sem  || 0;
      const capo = it.capo || 0;
      const blocks = parseContent(it.song);
      const y0 = addHeader(doc, it.song, sem, capo);
      renderBlocksToPDF(doc, blocks, effectiveSem(sem, capo), notation, y0);
    });

    doc.save((typeof slugify === 'function' ? slugify(name) : name || 'setlist') + '.pdf');
  }

  return { exportSong, exportSetlist };

})();
