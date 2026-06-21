/**
 * state.js — RUAH
 * Responsabilidad única: declarar y exportar todo el estado global
 * y las constantes de la aplicación.
 *
 * Debe cargarse PRIMERO, antes que cualquier otro módulo.
 * Todos los demás archivos leen y escriben estas variables directamente
 * (no hay sistema de módulos ES6 — son globals del browser).
 *
 * ─── ESTADO DE LA APP ────────────────────────────────────────────────────
 */

// Cancionero activo (puede ser modificado por admin/import)
let songs = [];

// ID de la canción actualmente abierta (null = ninguna)
let curId = null;

// Semitonos de transposición de la canción actual (0 = sin cambio)
let sem = 0;

// Bloques parseados de la canción actual (salida de Parser.parse)
let blocks = [];

// ─── ESTADO DE FILTROS Y LISTA ───────────────────────────────────────────

// Modo de ordenamiento: 'alpha' | 'artist' | 'composer' | 'random'
let sortMode = 'alpha';

// Filtro de favoritos: 'all' | 'fav'
let filt = 'all';

// Tag activo para filtrar: 'all' | nombre del tag
let tagFilt = 'all';

// Orden aleatorio actual (array de índices, null = sin calcular)
let randomOrder = null;

// ─── ESTADO DEL SETLIST ──────────────────────────────────────────────────

// ¿Está el panel de setlist abierto?
let slOpen = false;

// IDs de canciones en el setlist actual
let setlist = [];

// ─── ESTADO DEL EDITOR ───────────────────────────────────────────────────

// ID de la canción que se está editando (null = nueva canción)
let edSongId = null;

// Tags seleccionados en el editor
let edTags = [];

// ¿Está el preview del editor abierto?
let edPreviewOpen = true;

// ─── ESTADO DEL MODO IMPRESIÓN ───────────────────────────────────────────

// true = solo letra visible (sin acordes), para imprimir/proyectar
let printMode = false;

// ─── TAMAÑO DE FUENTE ────────────────────────────────────────────────────

// Factor de escala del cuerpo de la canción (1 = normal, 1.2 = grande, etc.)
let fontSize = 1;
const FONT_MIN  = 0.75;
const FONT_MAX  = 1.75;
const FONT_STEP = 0.125;

// ─── CAPO ────────────────────────────────────────────────────────────────

// Traste del capo (0 = sin capo). Afecta la visualización de acordes.
let capo = 0;

// ─── CIFRADO ─────────────────────────────────────────────────────────────

// 'american' = C D E F G A B  |  'european' = Do Re Mi Fa Sol La Si
let chordNotation = 'american';

// ─── ESTADO DEL ADMIN ────────────────────────────────────────────────────

// Columna por la que está ordenada la tabla del admin
let adminSortKey = 'title';

// true = orden ascendente
let adminSortAsc = true;

// Cache de thumbnails (cacheKey → URL de imagen)
let thumbCache = {};

// ─── PERSISTENCIA ────────────────────────────────────────────────────────

// Clave de localStorage para guardar el cancionero modificado
const LS_KEY      = 'fiat_songs_v2';
const LS_TAGS_KEY = 'fiat_tags_v1';

// ─── TAGS DISPONIBLES ────────────────────────────────────────────────────

// Tags — se derivan automáticamente del cancionero en initState()
let ALL_TAGS = [];

// ─── LABELS DE UI ────────────────────────────────────────────────────────

const SORT_LABELS = {
  alpha:    'Título',
  artist:   'Artista',
  composer: 'Compositor',
  random:   'Aleatorio'
};

// ─── TOOLBAR DEL EDITOR ──────────────────────────────────────────────────

// Cada grupo es un array de acordes relacionados.
// El botón de cada grupo lleva el tooltip de TOOLBAR_LABELS[i].
const TOOLBAR_CHORDS = [
  ['[VERSO]', '[ESTRIBILLO]', '[PUENTE]', '[INTRO]', '[CODA]'],
  ['C', 'Cm', 'C7', 'Cmaj7', 'Csus4'],
  ['D', 'Dm', 'D7', 'Dsus4'],
  ['E', 'Em', 'E7'],
  ['F', 'Fm', 'Fmaj7'],
  ['G', 'G7', 'Gsus4'],
  ['A', 'Am', 'A7'],
  ['B', 'Bm', 'B7']
];

const TOOLBAR_LABELS = [
  'Secciones',
  'Do',
  'Re',
  'Mi',
  'Fa',
  'Sol',
  'La',
  'Si'
];

// ─── HELPERS PUROS (sin deps, sin DOM) ───────────────────────────────────

/**
 * Genera un slug URL-friendly a partir de un string.
 * Ejemplo: "A La Medida" → "a-la-medida"
 */
function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── INICIALIZACIÓN ──────────────────────────────────────────────────────

/**
 * Carga el cancionero desde el JSON y aplica los cambios guardados en
 * localStorage (si existen). Debe llamarse una sola vez al iniciar la app.
 *
 * @param {Array} rawData — contenido de data/song.jason.json
 */
function initState(rawData) {
  window.SD = rawData;

  // songs_data.js es la fuente de verdad principal
  songs = rawData.map(s => ({ ...s, tags: s.tags || [] }));

  // Aplicar solo ediciones de canciones EXISTENTES desde localStorage
  // (nunca agregar canciones extra — evita duplicados al actualizar el ZIP)
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) {
        const baseIds = new Set(songs.map(s => s.id));
        const map = Object.fromEntries(
          parsed.filter(s => baseIds.has(s.id)).map(s => [s.id, s])
        );
        songs = songs.map(s => map[s.id] ? { ...s, ...map[s.id] } : s);
      }
    }
  } catch (e) {
    console.warn('[RUAH] No se pudo cargar localStorage:', e.message);
  }

  // Derivar ALL_TAGS automáticamente del cancionero (nunca hardcodeado)
  const tagSet = new Set();
  songs.forEach(s => (s.tags || []).forEach(t => tagSet.add(t)));
  ALL_TAGS = Array.from(tagSet).sort();
  try { localStorage.setItem(LS_TAGS_KEY, JSON.stringify(ALL_TAGS)); } catch(e) {}
}
