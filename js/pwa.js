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
function showInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.classList.add('visible');
}

function hideInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.classList.remove('visible');
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
