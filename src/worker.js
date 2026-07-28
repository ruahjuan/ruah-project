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
const CACHE_VERSION = 'v4';

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

  const promoMarkers = [
    /Extra[ií]do de la Biblia/i,
    /Para recibir cada ma[nñ]ana el Evangelio por correo/i,
    /Lee el Evangelio en Evangelizo/i,
  ];
  for (const marker of promoMarkers) {
    const idx = t.search(marker);
    if (idx !== -1) t = t.slice(0, idx);
  }

  t = t.replace(/<br\s*\/?>/gi, '\n');       // <br/> → salto de línea real
  t = t.replace(/<\/?[a-z][^>]*>/gi, '');    // cualquier otra etiqueta, conservando el texto de adentro

  t = t.replace(/&[a-zA-Z]+;/g, m => HTML_ENTITIES[m] ?? m);
  t = t.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  t = t.replace(/&#x([0-9a-fA-F]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));

  return t.replace(/\n{3,}/g, '\n\n').trim();
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
      FR:  { label: READING_LABELS.FR,  cite: limpiarTexto(frCite),  text: limpiarTexto(frText) },
      SR:  { label: READING_LABELS.SR,  cite: limpiarTexto(srCite),  text: limpiarTexto(srText) },
      PS:  { label: READING_LABELS.PS,  cite: limpiarTexto(psCite),  text: limpiarTexto(psText) },
      GSP: { label: READING_LABELS.GSP, cite: limpiarTexto(gspCite), text: limpiarTexto(gspText) },
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
      'Cache-Control': 'public, max-age=86400',
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
