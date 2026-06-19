/**
 * migrator.js — FIAT
 * Responsabilidad única: normalizar contenido legacy al formato
 * interno "chord-over-lyric" que usa el Parser.
 *
 * Formato de salida para pares acorde+letra:
 *   @@G           C           Em          D
 *   Sumergido en las aguas busco tu paz
 *
 * El prefijo @@ marca la línea de acordes para que el Parser
 * la reconozca como tal sin ambigüedad.
 *
 * Si el contenido ya tiene sintaxis ChordPro ([Am]…), lo deja intacto
 * para que el Parser lo procese directamente.
 *
 * Sin dependencias externas. Sin acceso al DOM.
 */

const Migrator = (function () {

  const CHORD_RE = /^[A-G][b#]?(maj7?|min7?|min|M7?|m7?|m|sus[24]?|add9?|aug|dim7?|°|ø)?(\d+)?(\/[A-G][b#]?)?$/;

  function isChordToken(tok) {
    return CHORD_RE.test(tok);
  }

  function isChordLine(line) {
    const s = line.trim();
    if (!s) return false;
    if (/^(Capo|CAPO|TRANSPORTE|\()/.test(s)) return false;
    if (s[0] === '[' && s[s.length - 1] === ']' && !s.slice(1, -1).includes('[')) return false;
    const tokens = s.split(/\s+/).filter(Boolean);
    return tokens.length >= 1 && tokens.every(isChordToken);
  }

  function migrate(content) {
    // Si ya tiene ChordPro inline ([Am]letra), no tocar
    if (/\[[A-G][^\[\]]{0,8}\]/.test(content)) return content;

    const lines = content.split('\n');
    const out = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const s = line.trim();

      // Línea vacía
      if (!s) { out.push(''); i++; continue; }

      // Sección [ESTRIBILLO], [VERSO], etc.
      if (s[0] === '[' && s[s.length - 1] === ']' && !s.slice(1, -1).includes('[')) {
        out.push(s); i++; continue;
      }

      // Anotaciones: (nota), Capo, TRANSPORTE, Interludio…
      if (/^[(*]|^Capo|^CAPO|^TRANSPORTE|^Interludio/.test(s)) {
        out.push(s.startsWith('(') ? s : '(' + s + ')');
        i++; continue;
      }

      // Línea de acordes legacy
      if (isChordLine(line)) {
        const nextLine = lines[i + 1] || '';
        const nextTrimmed = nextLine.trim();
        const nextIsLyric = nextTrimmed
          && !isChordLine(nextLine)
          && !(nextTrimmed[0] === '[' && nextTrimmed[nextTrimmed.length - 1] === ']'
               && !nextTrimmed.slice(1, -1).includes('['));

        if (nextIsLyric) {
          // Marcar la línea de acordes con @@ para el Parser
          out.push('@@' + line);
          out.push(nextLine);
          i += 2; continue;
        }

        // Chord-line sin letra debajo → anotación
        out.push('(' + s + ')');
        i++; continue;
      }

      out.push(line);
      i++;
    }

    return out.join('\n');
  }

  return { migrate, isChordLine };

})();
