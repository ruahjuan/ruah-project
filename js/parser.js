/**
 * parser.js — FIAT
 * Convierte contenido normalizado por Migrator en bloques tipados
 * listos para el Renderer.
 *
 * Tipos de bloque:
 *   { type: 'spacer' }
 *   { type: 'section',    label, isChorus }
 *   { type: 'annotation', text }
 *   { type: 'lyric-only', text, isChorus }
 *   { type: 'chord-row',  chords: string, lyric: string, isChorus }
 *   { type: 'chord-line', tokens: [{chord,lyric}], isChorus }  ← ChordPro inline
 *
 * Sin dependencias externas. Sin acceso al DOM.
 */

const Parser = (function () {

  const CHORD_TOKEN_RE   = /\[([A-G][^\]]{0,8})\]/;
  const CHORD_TOKEN_SPLIT = /(\[[A-G][^\]]{0,8}\])/;

  // Parsea una línea ChordPro inline → array de tokens [{chord, lyric}]
  function parseTokens(line) {
    if (!CHORD_TOKEN_RE.test(line)) return null;
    const parts = line.split(CHORD_TOKEN_SPLIT);
    const tokens = [];
    let pending = null;
    for (const part of parts) {
      const m = part.match(/^\[([^\]]+)\]$/);
      if (m) {
        if (pending !== null) tokens.push({ chord: pending, lyric: '' });
        pending = m[1];
      } else {
        if (pending !== null) { tokens.push({ chord: pending, lyric: part }); pending = null; }
        else if (part)        { tokens.push({ chord: null, lyric: part }); }
      }
    }
    if (pending !== null) tokens.push({ chord: pending, lyric: '' });
    return tokens;
  }

  function parse(content) {
    const lines = content.split('\n');
    const blocks = [];
    let isChorus = false;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const s = line.trim();

      // Línea vacía
      if (!s) { blocks.push({ type: 'spacer' }); i++; continue; }

      // Sección [ESTRIBILLO], [VERSO], etc.
      if (s[0] === '[' && s[s.length - 1] === ']'
          && !s.slice(1, -1).includes('[') && !s.slice(1, -1).includes(']')) {
        const label = s.slice(1, -1);
        isChorus = /ESTRIBILLO|CORO/i.test(label);
        blocks.push({ type: 'section', label, isChorus });
        i++; continue;
      }

      // Anotaciones
      if (/^[(*]|^Capo|^CAPO|^TRANSPORTE/.test(s)) {
        blocks.push({ type: 'annotation', text: s });
        i++; continue;
      }

      // Par chord-over-lyric (formato legacy normalizado por Migrator)
      if (line.startsWith('@@')) {
        const chords = line.slice(2); // quitar prefijo @@
        const lyric  = lines[i + 1] || '';
        blocks.push({ type: 'chord-row', chords, lyric: lyric.trimEnd(), isChorus });
        i += 2; continue;
      }

      // ChordPro inline
      const tokens = parseTokens(s);
      if (tokens) {
        blocks.push({ type: 'chord-line', tokens, isChorus });
        i++; continue;
      }

      // Solo letra
      blocks.push({ type: 'lyric-only', text: s, isChorus });
      i++;
    }

    return blocks;
  }

  return { parse };

})();
