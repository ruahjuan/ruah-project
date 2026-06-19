/* ══════════════════════════════════════════
   darkmode.js — Modo oscuro RUAH Cancionero
   Lógica: sistema como default → localStorage override
══════════════════════════════════════════ */

(function () {
  const LS_KEY = 'ruah-color-scheme'; // 'dark' | 'light' | null (seguir sistema)

  function getSystemDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function getEffectiveDark() {
    const stored = localStorage.getItem(LS_KEY);
    if (stored === 'dark')  return true;
    if (stored === 'light') return false;
    return getSystemDark(); // null → respetar sistema
  }

  function applyTheme(dark) {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    // Sincronizar íconos
    const sun  = document.getElementById('icon-dark-sun');
    const moon = document.getElementById('icon-dark-moon');
    if (sun && moon) {
      sun.style.display  = dark ? 'none'  : '';
      moon.style.display = dark ? ''      : 'none';
    }
  }

  // Init inmediato (antes del paint para evitar flash)
  applyTheme(getEffectiveDark());

  window.toggleDark = function () {
    const isDark = document.documentElement.classList.contains('dark');
    const next = !isDark;
    // Si el usuario elige lo mismo que el sistema, borrar override
    if (next === getSystemDark()) {
      localStorage.removeItem(LS_KEY);
    } else {
      localStorage.setItem(LS_KEY, next ? 'dark' : 'light');
    }
    applyTheme(next);
  };

  // Escuchar cambios del sistema en tiempo real (si no hay override manual)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem(LS_KEY)) {
      applyTheme(e.matches);
    }
  });
})();
