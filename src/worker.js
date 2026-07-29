/**
 * worker.js — RUAH
 *
 * Primer script dinámico del proyecto (hasta ahora el sitio era 100%
 * static assets, ver wrangler.json). Solo se mete en /api/* gracias a
 * run_worker_first — todo lo demás sigue sirviéndose como venía
 * sirviéndose, vía env.ASSETS.fetch(request), sin cambios de comportamiento.
 */

const EVANGELIZO_BASE = 'https://feed.evangelizo.org/v2/reader.php';

// Subir este número cada vez que cambie limpiarTexto() (o cualquier otra
// lógica de armado de la respuesta): la Cache API no se entera solita de
// que el código cambió, así que sin esto la respuesta vieja (ya cacheada
// por hasta 24hs) seguiría sirviéndose tal cual después de un deploy.
const CACHE_VERSION = 'v6';

const READING_LABELS = {
  FR:  'Primera lectura',
  SR:  'Segunda lectura',
  PS:  'Salmo responsorial',
  GSP: 'Evangelio',
};

const HTML_ENTITIES = {
  '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&nbsp;': ' ', '&apos;': "'", '&#39;': "'",
  '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú',
  '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú',
  '&ntilde;': 'ñ', '&Ntilde;': 'Ñ', '&iexcl;': '¡', '&iquest;': '¿',
};

// Evangelizo devuelve texto plano que trae HTML sin decodificar adentro
// (<font dir="ltr">...</font>, <br />, &quot;) y además le pega, en la
// misma respuesta, un párrafo promocional al final ("Lee el Evangelio en
// Evangelizo...", "Para recibir cada mañana el Evangelio por correo...").
// Esta función deja el texto limpio, listo para mostrar.
function limpiarTexto(raw) {
  if (!raw) return '';
  let t = raw;

  t = t.replace(/_/g, ' '); // Evangelizo a veces manda "1_Jn" en vez de "1 Jn"

  const promoMarkers = [
    /Extra[ií]do de la Biblia/i,
    /Para recibir cada ma[nñ]ana el Evangelio por correo/i,
    /Lee el Evangelio en Evangelizo/i,
  ];
  for (const marker of promoMarkers) {
    const idx = t.search(marker);
    if (idx !== -1) t = t.slice(0, idx);
  }

  t = t.replace(/\r\n?/g, '\n');             // normalizar fin de línea (\r\n / \r sueltos → \n)
  t = t.replace(/<br\s*\/?>/gi, '\n');        // <br/> → salto de línea real
  t = t.replace(/<\/?[a-z][^>]*>/gi, '');     // cualquier otra etiqueta, conservando el texto de adentro

  t = t.replace(/&[a-zA-Z]+;/g, m => HTML_ENTITIES[m] ?? m);
  t = t.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  t = t.replace(/&#x([0-9a-fA-F]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));

  return t
    .replace(/[ \t]*\n[ \t]*/g, '\n')  // espacios sueltos pegados a un salto de línea
    .replace(/\n{3,}/g, '\n\n')        // más de 2 saltos seguidos → 1 línea en blanco
    .trim();
}

// Evangelizo devuelve la cita de cada lectura con abreviatura latina
// ("1_Jn 4", "Ps 34", "Mt 5"), no el nombre completo del libro. Este mapa
// cubre las abreviaturas más comunes; si aparece una que no está acá, se
// deja tal cual vino (mejor eso que romper la cita). Si ves alguna sin
// expandir, mandámela y la sumo.
const BOOK_NAMES = {
  // Antiguo Testamento
  gn: 'Génesis', ex: 'Éxodo', lv: 'Levítico', nm: 'Números', dt: 'Deuteronomio',
  jos: 'Josué', jc: 'Jueces', jue: 'Jueces', rt: 'Rut',
  '1s': 'Primer Libro de Samuel', '1sm': 'Primer Libro de Samuel',
  '2s': 'Segundo Libro de Samuel', '2sm': 'Segundo Libro de Samuel',
  '1r': 'Primer Libro de los Reyes', '1re': 'Primer Libro de los Reyes',
  '2r': 'Segundo Libro de los Reyes', '2re': 'Segundo Libro de los Reyes',
  '1cr': 'Primer Libro de las Crónicas', '1cro': 'Primer Libro de las Crónicas',
  '2cr': 'Segundo Libro de las Crónicas', '2cro': 'Segundo Libro de las Crónicas',
  esd: 'Esdras', ne: 'Nehemías', tb: 'Tobías', jdt: 'Judit', est: 'Ester',
  '1m': 'Primer Libro de los Macabeos', '1ma': 'Primer Libro de los Macabeos',
  '2m': 'Segundo Libro de los Macabeos', '2ma': 'Segundo Libro de los Macabeos',
  jb: 'Job', sal: 'Salmos', ps: 'Salmos', pr: 'Proverbios',
  qo: 'Eclesiastés', ecl: 'Eclesiastés', ct: 'Cantar de los Cantares',
  sb: 'Sabiduría', sap: 'Sabiduría', si: 'Eclesiástico', eclo: 'Eclesiástico', sir: 'Eclesiástico',
  is: 'Isaías', jr: 'Jeremías', lm: 'Lamentaciones', ba: 'Baruc', ez: 'Ezequiel', dn: 'Daniel',
  os: 'Oseas', jl: 'Joel', am: 'Amós', ab: 'Abdías', jon: 'Jonás',
  mi: 'Miqueas', miq: 'Miqueas', na: 'Nahúm', nah: 'Nahúm',
  ha: 'Habacuc', hab: 'Habacuc', so: 'Sofonías', sof: 'Sofonías',
  ag: 'Ageo', za: 'Zacarías', zac: 'Zacarías', ml: 'Malaquías', mal: 'Malaquías',
  // Nuevo Testamento
  mt: 'Mateo', mc: 'Marcos', lc: 'Lucas', jn: 'Juan',
  hch: 'Hechos de los Apóstoles',
  rm: 'Carta a los Romanos', rom: 'Carta a los Romanos',
  '1co': 'Primera Carta a los Corintios', '2co': 'Segunda Carta a los Corintios',
  ga: 'Carta a los Gálatas', gal: 'Carta a los Gálatas',
  ef: 'Carta a los Efesios',
  flp: 'Carta a los Filipenses', fil: 'Carta a los Filipenses',
  col: 'Carta a los Colosenses',
  '1ts': 'Primera Carta a los Tesalonicenses', '1tes': 'Primera Carta a los Tesalonicenses',
  '2ts': 'Segunda Carta a los Tesalonicenses', '2tes': 'Segunda Carta a los Tesalonicenses',
  '1tm': 'Primera Carta a Timoteo', '1tim': 'Primera Carta a Timoteo',
  '2tm': 'Segunda Carta a Timoteo', '2tim': 'Segunda Carta a Timoteo',
  tt: 'Carta a Tito', tit: 'Carta a Tito',
  flm: 'Carta a Filemón', filem: 'Carta a Filemón',
  hb: 'Carta a los Hebreos', heb: 'Carta a los Hebreos',
  st: 'Carta de Santiago', sant: 'Carta de Santiago',
  '1p': 'Primera Carta de Pedro', '1pe': 'Primera Carta de Pedro', '1pt': 'Primera Carta de Pedro',
  '2p': 'Segunda Carta de Pedro', '2pe': 'Segunda Carta de Pedro', '2pt': 'Segunda Carta de Pedro',
  '1jn': 'Primera Carta de Juan', '2jn': 'Segunda Carta de Juan', '3jn': 'Tercera Carta de Juan',
  jud: 'Carta de Judas', ap: 'Apocalipsis', apo: 'Apocalipsis',
};

function _normalizarClave(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function expandirCita(cite) {
  if (!cite) return cite;
  const m = cite.match(/^\s*(?:([123])\s*)?([A-Za-zÀ-ÿ]{1,6})\.?\s*(.*)$/s);
  if (!m) return cite;
  const [, num, abbr, resto] = m;
  const nombre = BOOK_NAMES[_normalizarClave((num || '') + abbr)];
  if (!nombre) return cite; // abreviatura no mapeada — se deja como vino
  return resto ? `${nombre} ${resto}` : nombre;
}

// Argentina no usa horario de verano, así que un offset fijo de -3 alcanza
// para no depender de datos de timezone en el runtime del Worker.
function fechaHoyArgentina() {
  const now = new Date();
  const arg = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const y = arg.getUTCFullYear();
  const m = String(arg.getUTCMonth() + 1).padStart(2, '0');
  const d = String(arg.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

async function pedirCampo(dateStr, type, content) {
  const url = new URL(EVANGELIZO_BASE);
  url.searchParams.set('date', dateStr);
  url.searchParams.set('type', type);
  url.searchParams.set('lang', 'SP');
  if (content) url.searchParams.set('content', content);

  const res = await fetch(url.toString());
  if (!res.ok) return '';
  return (await res.text()).trim();
}

async function obtenerLecturaDelDia(dateStr) {
  const [liturgic, frCite, frText, srCite, srText, psCite, psText, gspCite, gspText] = await Promise.all([
    pedirCampo(dateStr, 'liturgic_t', null),
    pedirCampo(dateStr, 'reading_st', 'FR'),
    pedirCampo(dateStr, 'reading',    'FR'),
    pedirCampo(dateStr, 'reading_st', 'SR'),
    pedirCampo(dateStr, 'reading',    'SR'),
    pedirCampo(dateStr, 'reading_st', 'PS'),
    pedirCampo(dateStr, 'reading',    'PS'),
    pedirCampo(dateStr, 'reading_st', 'GSP'),
    pedirCampo(dateStr, 'reading',    'GSP'),
  ]);

  return {
    date: dateStr,
    liturgic: limpiarTexto(liturgic),
    readings: {
      FR:  { label: READING_LABELS.FR,  cite: expandirCita(limpiarTexto(frCite)),  text: limpiarTexto(frText) },
      SR:  { label: READING_LABELS.SR,  cite: expandirCita(limpiarTexto(srCite)),  text: limpiarTexto(srText) },
      PS:  { label: READING_LABELS.PS,  cite: expandirCita(limpiarTexto(psCite)),  text: limpiarTexto(psText) },
      GSP: { label: READING_LABELS.GSP, cite: expandirCita(limpiarTexto(gspCite)), text: limpiarTexto(gspText) },
    },
  };
}

async function handleLecturaDelDia(ctx) {
  const dateStr = fechaHoyArgentina();

  // Cache API de Cloudflare: una sola consulta real a Evangelizo por día,
  // sin importar cuánta gente entre a Oraciones ese día.
  const cache = caches.default;
  const cacheKey = new Request(`https://ruah-cache.local/lectura-del-dia/${CACHE_VERSION}/${dateStr}`);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const data = await obtenerLecturaDelDia(dateStr);
  const response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      // Antes: 'public, max-age=86400'. Eso hacía que el navegador
      // cacheara la respuesta por 24hs a nivel HTTP, sin enterarse de
      // que la URL debería devolver algo distinto al día siguiente —
      // servía la lectura de ayer aunque el SW y la Cache API de acá
      // abajo ya tuvieran la de hoy lista. El cacheo por día ya está
      // resuelto explícitamente con `cache.put`/`cache.match` (clave
      // con fecha), así que no hace falta caché HTTP además.
      'Cache-Control': 'no-store',
    },
  });

  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/lectura-del-dia') {
      try {
        return await handleLecturaDelDia(ctx);
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'No se pudo obtener la lectura del día' }),
          { status: 502, headers: { 'Content-Type': 'application/json; charset=UTF-8' } }
        );
      }
    }

    // Cualquier otra ruta: se sirve exactamente como antes (archivos
    // estáticos + fallback SPA a index.html, definido en wrangler.json).
    return env.ASSETS.fetch(request);
  },
};
