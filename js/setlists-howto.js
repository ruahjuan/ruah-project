/**
 * setlists-howto.js — FIAT/RUAH
 * Responsabilidad única: mostrar una tarjeta con 3 pasos ("Cómo armar tu
 * primer setlist") debajo del estado vacío de #msl-list, y sacarla apenas
 * el usuario ya tiene al menos un setlist guardado.
 *
 * No depende de app.js: como #msl-list se rellena dinámicamente (buildMisSetlists()
 * o como se llame en app.js), usamos un MutationObserver para reaccionar
 * cada vez que cambia su contenido, sin acoplarnos a esa función.
 */

const SETLIST_HOWTO_STEPS = [
  'Andá a <b>Canciones</b> y buscá los temas que querés tocar.',
  'Agregalos uno por uno a tu <b>setlist actual</b>.',
  'Volvé acá y tocá <b>"Guardar setlist actual"</b> para que quede guardado.'
];

function ensureSetlistHowto() {
  const list = document.getElementById('msl-list');
  if (!list) return;

  // Detectamos el estado vacío por el texto que ya usa la vista.
  // Si en algún momento cambiás esa copia, actualizá este string también.
  const isEmpty = list.textContent.includes('Todavía no guardaste');
  let howto = document.getElementById('msl-howto');

  if (isEmpty && !howto) {
    howto = document.createElement('div');
    howto.id = 'msl-howto';
    howto.className = 'howto';
    howto.innerHTML = `
      <div class="howto-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>
        Cómo armar tu primer setlist
      </div>
      ${SETLIST_HOWTO_STEPS.map((text, i) => `
        <div class="howto-step">
          <div class="step-num">${i + 1}</div>
          <div class="step-text">${text}</div>
        </div>`).join('')}
    `;
    list.appendChild(howto);
  } else if (!isEmpty && howto) {
    howto.remove();
  }
}

const _mslListEl = document.getElementById('msl-list');
if (_mslListEl) {
  ensureSetlistHowto(); // por si ya está vacío al cargar
  new MutationObserver(ensureSetlistHowto)
    .observe(_mslListEl, { childList: true, subtree: true });
}
