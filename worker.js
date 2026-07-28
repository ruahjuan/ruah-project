/**
 * worker.js — RUAH
 *
 * Primer script dinámico del proyecto (hasta ahora el sitio era 100%
 * static assets, ver wrangler.json). Solo se mete en /api/* gracias a
 * run_worker_first — todo lo demás sigue sirviéndose como venía
 * sirviéndose, vía env.ASSETS.fetch(request), sin cambios de comportamiento.
 */

const EVANGELIZO_BASE = 'https://feed.evangelizo.org/v2/reader.php';

const READING_LABELS = {
  FR:  'Primera lectura',
  PS:  'Salmo responsorial',
  GSP: 'Evangelio',
};

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
  const [liturgic, frCite, frText, psCite, psText, gspCite, gspText] = await Promise.all([
    pedirCampo(dateStr, 'liturgic_t', null),
    pedirCampo(dateStr, 'reading_st', 'FR'),
    pedirCampo(dateStr, 'reading',    'FR'),
    pedirCampo(dateStr, 'reading_st', 'PS'),
    pedirCampo(dateStr, 'reading',    'PS'),
    pedirCampo(dateStr, 'reading_st', 'GSP'),
    pedirCampo(dateStr, 'reading',    'GSP'),
  ]);

  return {
    date: dateStr,
    liturgic,
    readings: {
      FR:  { label: READING_LABELS.FR,  cite: frCite,  text: frText },
      PS:  { label: READING_LABELS.PS,  cite: psCite,  text: psText },
      GSP: { label: READING_LABELS.GSP, cite: gspCite, text: gspText },
    },
  };
}

async function handleLecturaDelDia(ctx) {
  const dateStr = fechaHoyArgentina();

  // Cache API de Cloudflare: una sola consulta real a Evangelizo por día,
  // sin importar cuánta gente entre a Oraciones ese día.
  const cache = caches.default;
  const cacheKey = new Request(`https://ruah-cache.local/lectura-del-dia/${dateStr}`);

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
