// ============================================================
//  RUAH Cancionero — Aviso de Actualización
//  Archivo: /js/update.js
//  Reutiliza el mismo banner que pwa.js (#pwa-install-banner),
//  cambiando dinámicamente título, texto y acción del botón.
//  Coordina con pwa.js a través de window.ruahBanner para que
//  los dos avisos nunca se muestren superpuestos.
//  Requiere que banner-coordinator.js se cargue antes.
// ============================================================

let swEnEspera = null;

// ── MUESTRA EL BANNER (con contenido de actualización) ──────
// reg es el ServiceWorkerRegistration que detectó la actualización.
function mostrarBannerActualizacion(reg) {
  swEnEspera = reg.waiting || reg.installing;

  window.ruahBanner.solicitar('update', () => {
    const title = document.getElementById('pib-title');
    const msg = document.getElementById('pib-msg');
    const btn = document.getElementById('pib-action-btn');

    if (title) title.textContent = 'Nueva versión disponible';
    if (msg) msg.textContent = 'Actualizá RUAH para obtener las últimas canciones y mejoras.';
    if (btn) {
      btn.textContent = 'Actualizar';
      btn.onclick = aplicarActualizacion;
    }
    const closeBtn = document.getElementById('pib-close-btn');
    if (closeBtn) closeBtn.onclick = ocultarBannerActualizacion;

    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.add('visible');
  });
}

function ocultarBannerActualizacion() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.classList.remove('visible');
  window.ruahBanner.liberar('update');
}

// ── APLICA LA ACTUALIZACIÓN ─────────────────────────────────
// El usuario apretó "Actualizar": le decimos al SW en espera que
// tome control. El reload lo dispara el listener de
// 'controllerchange' que está en index.html.
async function aplicarActualizacion() {
  if (!swEnEspera) return;
  swEnEspera.postMessage({ type: 'SKIP_WAITING' });
  ocultarBannerActualizacion();
}

// ── EXPONE LAS FUNCIONES AL HTML ────────────────────────────
window.ruahUpdate = {
  mostrarBannerActualizacion,
  ocultarBannerActualizacion,
  aplicarActualizacion,
};
