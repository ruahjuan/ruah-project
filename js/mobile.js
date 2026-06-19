// mobile.js — RUAH

function isMobile() {
  return window.innerWidth < 640;
}

// ── Drawer (desktop fallback, ya no se usa en mobile) ──

function toggleDrawer(){
  if (isMobile()) return;
  const panel   = document.getElementById('list-panel');
  const overlay = document.getElementById('drawer-overlay');
  const isOpen  = panel.classList.contains('drawer-open');
  if(isOpen){ closeDrawer(); } else { openDrawer(); }
}

function openDrawer(){
  document.getElementById('list-panel').classList.add('drawer-open');
  document.getElementById('drawer-overlay').classList.add('visible');
  document.body.style.overflow='hidden';
}

function closeDrawer(){
  if (isMobile()) return; // en mobile no hay drawer
  document.getElementById('list-panel').classList.remove('drawer-open');
  document.getElementById('drawer-overlay').classList.remove('visible');
  document.body.style.overflow='';
}

// ── Navegación mobile: abrir detalle ──

function mobileAbrirDetalle() {
  // Siempre agrega la clase; el CSS mobile.css decide si el detail está fixed o no
  document.getElementById('detail').classList.add('mobile-open');
  document.getElementById('detail').scrollTop = 0;
}

function mobileCerrarDetalle() {
  document.getElementById('detail').classList.remove('mobile-open');
}
