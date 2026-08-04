/**
 * docx-export.js — RUAH Cancionero
 * Genera un "cancionero" de letras (SIN acordes) en formato .docx,
 * compatible con Word y Google Docs, a partir de un Setlist.
 *
 * Formato:
 *  - Encabezado editable, centrado, arriba de todo.
 *  - Página apaisada (horizontal), cuerpo del cancionero a 3 columnas.
 *  - Cada canción numerada en el orden del setlist:
 *      "N. TÍTULO"  → 12pt, negrita, subrayado, MAYÚSCULAS
 *      Intérprete   → 9.5pt, cursiva, gris
 *      Letra        → 10.5pt (sin acordes; se apoya en Parser para
 *                     extraer solo el texto, conservando secciones
 *                     [ESTRIBILLO]/[VERSO] y espacios entre estrofas)
 *
 * Dependencias:
 *  - JSZip (cargar por <script> antes que este archivo)
 *  - Parser (parser.js) — opcional; si no está, cae a texto plano.
 *
 * Uso:
 *   DocxExport.exportSetlist(setlistName, songs, headerText)
 *     - songs: array de canciones ya resueltas de SONGS_DATA
 *              (mismo objeto que usa PdfExport, con .title/.artist/.content)
 *     - headerText: opcional. Si no se pasa, se pide con un prompt().
 */
const DocxExport = (function () {

  // ── Config de tipografía (fácil de ajustar) ──────────────────────────
  // Los tamaños están en "half-points" (unidad de OOXML): pt * 2.
  const TITLE_SIZE     = 24; // 12pt
  const SUBTITLE_SIZE  = 19; // 9.5pt
  const BODY_SIZE      = 21; // 10.5pt
  const HEADER_SIZE    = 32; // 16pt
  const SUBTITLE_COLOR = '808080'; // gris

  const FONT = 'Calibri';

  // Página A4 apaisada (twips = 1/20 pt). Cambiar a Carta/Letter:
  // w:w="15840" w:h="12240" si lo necesitás en vez de A4.
  const PAGE_W = 16838;
  const PAGE_H = 11906;
  const MARGIN = 700;      // ~0.49" de margen
  const COL_GAP = 340;     // separación entre columnas

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function rXml(text, opts = {}) {
    let rPr = '<w:rPr>';
    rPr += `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>`;
    if (opts.bold)      rPr += '<w:b/>';
    if (opts.italic)    rPr += '<w:i/>';
    if (opts.underline) rPr += '<w:u w:val="single"/>';
    if (opts.color)     rPr += `<w:color w:val="${opts.color}"/>`;
    if (opts.size)      rPr += `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>`;
    rPr += '</w:rPr>';
    return `<w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
  }

  function pXml(runs, pPr = '') {
    return `<w:p>${pPr}${runs}</w:p>`;
  }

  function sectPrContents(cols, type) {
    const typeTag = type ? `<w:type w:val="${type}"/>` : '';
    return `${typeTag}` +
      `<w:pgSz w:w="${PAGE_W}" w:h="${PAGE_H}" w:orient="landscape"/>` +
      `<w:pgMar w:top="${MARGIN}" w:right="${MARGIN}" w:bottom="${MARGIN}" w:left="${MARGIN}" w:header="0" w:footer="0" w:gutter="0"/>` +
      `<w:cols w:num="${cols}" w:space="${COL_GAP}"/>`;
  }

  // Extrae solo la letra (sin acordes) reutilizando el Parser de la app.
  // Devuelve bloques: { type: 'blank'|'section'|'annotation'|'lyric', text }
  function extractLyricBlocks(content) {
    if (typeof Parser === 'undefined') {
      // Fallback si por algún motivo Parser no está cargado.
      return (content || '').split('\n').map(l => {
        const s = l.trim();
        return s ? { type: 'lyric', text: s } : { type: 'blank', text: '' };
      });
    }
    const blocks = Parser.parse(content || '');
    const out = [];
    for (const b of blocks) {
      switch (b.type) {
        case 'spacer':
          out.push({ type: 'blank', text: '' });
          break;
        case 'section':
          out.push({ type: 'section', text: b.label });
          break;
        case 'annotation':
          out.push({ type: 'annotation', text: b.text });
          break;
        case 'lyric-only':
          out.push({ type: 'lyric', text: b.text });
          break;
        case 'chord-row':
          out.push({ type: 'lyric', text: (b.lyric || '').trim() });
          break;
        case 'chord-line': {
          const text = b.tokens.map(t => t.lyric || '').join('');
          out.push({ type: 'lyric', text });
          break;
        }
      }
    }
    return out;
  }

  function buildSongParagraphs(song, number) {
    const title = `${number}. ${(song.title || '').toUpperCase()}`;
    let xml = '';

    // Título: negrita, subrayado, MAYÚSCULAS, 12pt. keepNext evita que
    // quede huérfano solo al final de una columna.
    xml += pXml(
      rXml(title, { bold: true, underline: true, size: TITLE_SIZE }),
      '<w:pPr><w:keepNext/><w:spacing w:after="40"/></w:pPr>'
    );

    if (song.artist) {
      xml += pXml(
        rXml(song.artist, { italic: true, color: SUBTITLE_COLOR, size: SUBTITLE_SIZE }),
        '<w:pPr><w:keepNext/><w:spacing w:after="140"/></w:pPr>'
      );
    }

    const blocks = extractLyricBlocks(song.content || '');
    for (const b of blocks) {
      if (b.type === 'blank') {
        xml += pXml('', '<w:pPr><w:spacing w:after="60"/></w:pPr>');
      } else if (b.type === 'section') {
        xml += pXml(
          rXml(b.text, { bold: true, size: BODY_SIZE }),
          '<w:pPr><w:spacing w:before="100" w:after="40"/></w:pPr>'
        );
      } else if (b.type === 'annotation') {
        xml += pXml(
          rXml(b.text, { italic: true, size: BODY_SIZE }),
          '<w:pPr><w:spacing w:after="40"/></w:pPr>'
        );
      } else {
        xml += pXml(
          rXml(b.text, { size: BODY_SIZE }),
          '<w:pPr><w:spacing w:after="0" w:line="260" w:lineRule="auto"/></w:pPr>'
        );
      }
    }

    // Separador antes de la próxima canción.
    xml += pXml('', '<w:pPr><w:spacing w:after="220"/></w:pPr>');
    return xml;
  }

  function buildDocumentXml(headerText, songs) {
    let body = '';

    // Encabezado editable, centrado, arriba de todo (spanea toda la página).
    body += pXml(
      rXml(headerText, { bold: true, size: HEADER_SIZE }),
      '<w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr>'
    );

    // Corte de sección "continuous": cierra la sección del encabezado
    // (1 columna) e inicia la del cancionero (3 columnas) en la misma página.
    body += `<w:p><w:pPr><w:sectPr>${sectPrContents(1, 'continuous')}</w:sectPr></w:pPr></w:p>`;

    songs.forEach((song, i) => {
      body += buildSongParagraphs(song, i + 1);
    });

    // Sección final: rige desde el corte anterior hasta el final del doc.
    body += `<w:sectPr>${sectPrContents(3, null)}</w:sectPr>`;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<w:body>${body}</w:body></w:document>`;
  }

  const CONTENT_TYPES =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
    `</Types>`;

  const RELS =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`;

  const DOC_RELS =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const STYLES =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:docDefaults><w:rPrDefault><w:rPr>` +
    `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>` +
    `<w:sz w:val="${BODY_SIZE}"/><w:szCs w:val="${BODY_SIZE}"/>` +
    `<w:lang w:val="es-AR"/>` +
    `</w:rPr></w:rPrDefault></w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>` +
    `</w:styles>`;

  async function exportSetlist(setlistName, songs, headerText) {
    if (!songs || !songs.length) {
      if (typeof toast === 'function') toast('El setlist está vacío');
      return;
    }
    if (typeof JSZip === 'undefined') {
      console.error('DocxExport: falta cargar JSZip (agregá el <script> en index.html)');
      if (typeof toast === 'function') toast('Falta JSZip para exportar a Word');
      return;
    }

    const finalHeader = headerText != null
      ? headerText
      : (window.prompt('Encabezado del cancionero:', setlistName || 'Cancionero') || setlistName || 'Cancionero');

    const documentXml = buildDocumentXml(finalHeader, songs);

    const zip = new JSZip();
    zip.file('[Content_Types].xml', CONTENT_TYPES);
    zip.folder('_rels').file('.rels', RELS);
    const wordFolder = zip.folder('word');
    wordFolder.file('document.xml', documentXml);
    wordFolder.file('styles.xml', STYLES);
    wordFolder.folder('_rels').file('document.xml.rels', DOC_RELS);

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const filename = `${(setlistName || 'cancionero').replace(/[^\w\-]+/g, '_')}.docx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    if (typeof toast === 'function') toast('Cancionero .docx generado');
  }

  return { exportSetlist };

})();
