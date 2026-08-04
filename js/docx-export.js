/**
 * docx-export.js — RUAH Cancionero
 * Genera un "cancionero" de letras (SIN acordes) en formato .docx,
 * compatible con Word y Google Docs, a partir de un Setlist.
 *
 * Formato:
 *  - Bloque de título (Título / Subtítulo / Fecha-Asunto-Etc, editable)
 *    arriba a la izquierda de la primera columna — NO es una sección
 *    aparte, es parte del mismo flujo a 3 columnas (evita la página
 *    en blanco que generaba el corte de sección anterior).
 *  - Página apaisada (horizontal), cuerpo del cancionero a 3 columnas.
 *  - Cada canción numerada en el orden del setlist:
 *      "N. TÍTULO"  → 13pt, negrita, subrayado, MAYÚSCULAS
 *      Intérprete   → 10.5pt, cursiva, gris
 *      Letra        → 11.5pt (sin acordes; se apoya en Parser para
 *                     extraer solo el texto, conservando secciones
 *                     [ESTRIBILLO]/[VERSO] y espacios entre estrofas)
 *  - Pie de página en cada hoja con crédito de RUAH Cancionero.
 *
 * Dependencias:
 *  - JSZip (cargar por <script> antes que este archivo)
 *  - Parser (parser.js) — opcional; si no está, cae a texto plano.
 *
 * Uso:
 *   DocxExport.exportSetlist(setlistName, songs, headerInfo)
 *     - songs: array de canciones ya resueltas de SONGS_DATA
 *              (mismo objeto que usa PdfExport, con .title/.artist/.content)
 *     - headerInfo: opcional. Objeto { titulo, subtitulo, fecha } o un
 *              string (se toma como título). Si no se pasa, se pide
 *              con prompt()s.
 */
const DocxExport = (function () {

  // ── Config de tipografía (fácil de ajustar) ──────────────────────────
  // Los tamaños están en "half-points" (unidad de OOXML): pt * 2.
  const TITLE_SIZE     = 26; // 13pt  (canción)
  const SUBTITLE_SIZE  = 21; // 10.5pt (intérprete)
  const BODY_SIZE      = 23; // 11.5pt (letra)

  const HEAD_TITULO_SIZE    = 34; // 17pt
  const HEAD_SUBTITULO_SIZE = 23; // 11.5pt
  const HEAD_FECHA_SIZE     = 20; // 10pt
  const HEAD_COLOR          = '5a5a5a'; // gris para subtítulo/fecha

  const SUBTITLE_COLOR = '808080'; // gris (intérprete de cada canción)
  const FOOTER_COLOR   = '999999'; // gris claro (crédito de pie de página)

  const FONT      = 'Calibri';        // cuerpo / títulos de canción
  const HEAD_FONT = 'Georgia';        // bloque de título del cancionero

  // Página A4 apaisada (twips = 1/20 pt). Cambiar a Carta/Letter:
  // w:w="15840" w:h="12240" si lo necesitás en vez de A4.
  const PAGE_W = 16838;
  const PAGE_H = 11906;
  const MARGIN = 700;      // ~0.49" de margen
  const FOOTER_MARGIN = 260;
  const COL_GAP = 340;     // separación entre columnas
  const COLS = 3;

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function rXml(text, opts = {}) {
    const font = opts.font || FONT;
    let rPr = '<w:rPr>';
    rPr += `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>`;
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

  function sectPrContents(footerRelId) {
    const footerTag = footerRelId
      ? `<w:footerReference w:type="default" r:id="${footerRelId}"/>`
      : '';
    return footerTag +
      `<w:pgSz w:w="${PAGE_W}" w:h="${PAGE_H}" w:orient="landscape"/>` +
      `<w:pgMar w:top="${MARGIN}" w:right="${MARGIN}" w:bottom="${MARGIN}" w:left="${MARGIN}" w:header="0" w:footer="${FOOTER_MARGIN}" w:gutter="0"/>` +
      `<w:cols w:num="${COLS}" w:space="${COL_GAP}"/>`;
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

  // Bloque de título del cancionero: Título / Subtítulo / Fecha-Asunto-Etc.
  // Va como los primeros párrafos del documento → cae naturalmente arriba
  // a la izquierda de la primera columna (como en la referencia visual).
  function buildTitleBlock(info) {
    let xml = '';

    xml += pXml(
      rXml(info.titulo || 'Cancionero', { bold: true, size: HEAD_TITULO_SIZE, font: HEAD_FONT }),
      '<w:pPr><w:keepNext/><w:spacing w:after="20"/></w:pPr>'
    );

    if (info.subtitulo) {
      xml += pXml(
        rXml(info.subtitulo, { italic: true, color: HEAD_COLOR, size: HEAD_SUBTITULO_SIZE, font: HEAD_FONT }),
        '<w:pPr><w:keepNext/><w:spacing w:after="10"/></w:pPr>'
      );
    }

    if (info.fecha) {
      xml += pXml(
        rXml(info.fecha, { italic: true, color: HEAD_COLOR, size: HEAD_FECHA_SIZE, font: HEAD_FONT }),
        '<w:pPr><w:keepNext/><w:spacing w:after="260"/></w:pPr>'
      );
    } else {
      // Deja igual un respiro antes de que arranque la primera canción.
      xml += pXml('', '<w:pPr><w:spacing w:after="260"/></w:pPr>');
    }

    return xml;
  }

  function buildSongParagraphs(song, number) {
    const title = `${number}. ${(song.title || '').toUpperCase()}`;
    let xml = '';

    // Título: negrita, subrayado, MAYÚSCULAS. keepNext evita que quede
    // huérfano solo al final de una columna.
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

  function buildDocumentXml(headerInfo, songs) {
    let body = '';

    body += buildTitleBlock(headerInfo);

    songs.forEach((song, i) => {
      body += buildSongParagraphs(song, i + 1);
    });

    // Una sola sección para todo el documento (sin cortes) → sin página
    // en blanco. El pie de página ("rId2") se referencia acá.
    body += `<w:sectPr>${sectPrContents('rId2')}</w:sectPr>`;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<w:body>${body}</w:body></w:document>`;
  }

  function buildFooterXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      pXml(
        rXml('Generado en RUAH Cancionero · Música para Dios', { italic: true, color: FOOTER_COLOR, size: 14 }),
        '<w:pPr><w:jc w:val="center"/></w:pPr>'
      ) +
      `</w:ftr>`;
  }

  const CONTENT_TYPES =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
    `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>` +
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
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>` +
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

  function resolveHeaderInfo(headerInfo, setlistName) {
    if (headerInfo && typeof headerInfo === 'object') return headerInfo;
    if (typeof headerInfo === 'string' && headerInfo.trim()) {
      return { titulo: headerInfo, subtitulo: '', fecha: '' };
    }
    // Sin datos: se pide por prompt (título obligatorio, resto opcional).
    const titulo = window.prompt('Título del cancionero:', setlistName || 'Cancionero')
      || setlistName || 'Cancionero';
    const subtitulo = window.prompt('Subtítulo (opcional — Enter para omitir):', '') || '';
    const fecha = window.prompt('Fecha / asunto / etc. (opcional — Enter para omitir):', '') || '';
    return { titulo, subtitulo, fecha };
  }

  async function exportSetlist(setlistName, songs, headerInfo) {
    if (!songs || !songs.length) {
      if (typeof toast === 'function') toast('El setlist está vacío');
      return;
    }
    if (typeof JSZip === 'undefined') {
      console.error('DocxExport: falta cargar JSZip (agregá el <script> en index.html)');
      if (typeof toast === 'function') toast('Falta JSZip para exportar a Word');
      return;
    }

    const info = resolveHeaderInfo(headerInfo, setlistName);

    const documentXml = buildDocumentXml(info, songs);
    const footerXml = buildFooterXml();

    const zip = new JSZip();
    zip.file('[Content_Types].xml', CONTENT_TYPES);
    zip.folder('_rels').file('.rels', RELS);
    const wordFolder = zip.folder('word');
    wordFolder.file('document.xml', documentXml);
    wordFolder.file('styles.xml', STYLES);
    wordFolder.file('footer1.xml', footerXml);
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
