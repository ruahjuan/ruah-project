// ============================================================
//  RUAH Cancionero — PWA Install Prompt
//  Archivo: /js/pwa.js
//  Muestra un banner "Instalar RUAH" cuando el navegador
//  lanza el evento beforeinstallprompt.
// ============================================================

let deferredPrompt = null;

// ── CAPTURA EL EVENTO DEL NAVEGADOR ─────────────────────────
// Chrome/Android lo lanza cuando la app cumple los criterios PWA.
// Lo guardamos para mostrarlo cuando el usuario quiera.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // Evita que el navegador muestre su propio banner
  deferredPrompt = e;
  showInstallBanner();
});

// ── MUESTRA EL BANNER ───────────────────────────────────────
// Pasa por el coordinador para no superponerse con el banner
// de actualización (comparten el mismo elemento del DOM).
function showInstallBanner() {
  window.ruahBanner.solicitar('install', () => {
    // Restaura el contenido "instalación" por si el banner quedó
    // con el texto de actualización de una solicitud anterior.
    const title = document.getElementById('pib-title');
    const msg = document.getElementById('pib-msg');
    const btn = document.getElementById('pib-action-btn');
    if (title) title.textContent = 'Instalar RUAH';
    if (msg) msg.textContent = 'Accedé offline desde tu pantalla de inicio';
    if (btn) {
      btn.textContent = 'Instalar';
      btn.onclick = triggerInstall;
    }
    const closeBtn = document.getElementById('pib-close-btn');
    if (closeBtn) closeBtn.onclick = hideInstallBanner;

    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.add('visible');
  });
}

function hideInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.classList.remove('visible');
  window.ruahBanner.liberar('install');
}

// ── DISPARA EL PROMPT NATIVO ────────────────────────────────
async function triggerInstall() {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  console.log('[RUAH PWA] Resultado instalación:', outcome);
  deferredPrompt = null;
  hideInstallBanner();
}

// ── CUANDO YA ESTÁ INSTALADA ────────────────────────────────
// Oculta el banner si el usuario ya instaló la app.
window.addEventListener('appinstalled', () => {
  console.log('[RUAH PWA] App instalada correctamente');
  hideInstallBanner();
  localStorage.setItem('ruah-pwa-installed', 'true');
});

// ── EXPONE LA FUNCIÓN AL HTML ───────────────────────────────
window.ruahPWA = { triggerInstall, hideInstallBanner };
