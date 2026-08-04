/**
 * lecturas-nav.js — RUAH
 *
 * Navegación de fecha para "Lecturas del Día": tira de 7 días + buscador
 * para saltar a cualquier fecha (ej. preparar una fiesta con meses de
 * anticipación). No toca el render de app.js: solo decide qué fecha
 * pedirle a buildLecturaDelDia(dateStr) (definida ahí) y refresca este
 * panel. Depende de que #lectura-nav exista en el DOM (index.html, vista
 * Oraciones) y de que buildLecturaDelDia esté disponible globalmente.
 */

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function _lnavFmtYYYYMMDD(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
function _lnavFmtISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function _lnavHoyStr() {
  return _lnavFmtYYYYMMDD(new Date());
}

let _lnavFecha = null;      // YYYYMMDD seleccionada; null = hoy
let _lnavPickerAbierto = false;

function _lnavDiaEnfoque() {
  if (!_lnavFecha) return new Date();
  return new Date(
    Number(_lnavFecha.slice(0, 4)),
    Number(_lnavFecha.slice(4, 6)) - 1,
    Number(_lnavFecha.slice(6, 8))
  );
}

function renderLecturaNav() {
  const host = document.getElementById('lectura-nav');
  if (!host) return;

  const hoyStr = _lnavHoyStr();
  const activa = _lnavFecha || hoyStr;
  const foco = _lnavDiaEnfoque();

  // Tira de 7 días centrada en lo que se está mostrando (3 antes / 3
  // después), para que "buscar" también reubique la tira en esa zona.
  let chipsHTML = '';
  for (let i = -3; i <= 3; i++) {
    const d = new Date(foco);
    d.setDate(foco.getDate() + i);
    const str = _lnavFmtYYYYMMDD(d);
    chipsHTML += `
      <button type="button" class="lnav-chip${str === activa ? ' on' : ''}" data-fecha="${str}">
        <span class="lnav-dname">${DIAS_CORTOS[d.getDay()]}</span>
        <span class="lnav-dnum">${d.getDate()}</span>
      </button>`;
  }

  host.innerHTML = `
    <div class="lnav-row">
      <div class="lnav-strip">${chipsHTML}</div>
      <button type="button" class="lnav-search${_lnavPickerAbierto ? ' on' : ''}" id="lnav-search-btn" aria-label="Buscar lecturas de otra fecha" aria-expanded="${_lnavPickerAbierto}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </button>
    </div>
    <div class="lnav-picker${_lnavPickerAbierto ? ' open' : ''}" id="lnav-picker">
      <label for="lnav-date-input">Buscar lecturas de otra fecha</label>
      <div class="lnav-picker-row">
        <input type="date" id="lnav-date-input" value="${_lnavFmtISO(foco)}">
        <button type="button" id="lnav-buscar-btn">Buscar</button>
      </div>
      <div class="lnav-quick">
        <span class="lnav-quick-btn" data-quick="hoy">Hoy</span>
        <span class="lnav-quick-btn" data-quick="domingo">Próximo domingo</span>
        <span class="lnav-quick-btn" data-quick="2meses">+2 meses</span>
      </div>
    </div>`;
}

function _lnavIrAFecha(fecha) {
  const str = typeof fecha === 'string' ? fecha : _lnavFmtYYYYMMDD(fecha);
  const hoyStr = _lnavHoyStr();
  _lnavFecha = str === hoyStr ? null : str;
  _lnavPickerAbierto = false;
  renderLecturaNav();
  if (typeof buildLecturaDelDia === 'function') buildLecturaDelDia(str);
}

document.addEventListener('click', e => {
  const chip = e.target.closest('.lnav-chip');
  if (chip) { _lnavIrAFecha(chip.dataset.fecha); return; }

  if (e.target.closest('#lnav-search-btn')) {
    _lnavPickerAbierto = !_lnavPickerAbierto;
    renderLecturaNav();
    return;
  }

  if (e.target.closest('#lnav-buscar-btn')) {
    const input = document.getElementById('lnav-date-input');
    if (input && input.value) _lnavIrAFecha(input.value.replace(/-/g, ''));
    return;
  }

  const quick = e.target.closest('.lnav-quick-btn');
  if (quick) {
    const hoy = new Date();
    if (quick.dataset.quick === 'hoy') { _lnavIrAFecha(hoy); return; }
    if (quick.dataset.quick === 'domingo') {
      const d = new Date(hoy);
      d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
      _lnavIrAFecha(d);
      return;
    }
    if (quick.dataset.quick === '2meses') {
      const d = new Date(hoy);
      d.setMonth(d.getMonth() + 2);
      _lnavIrAFecha(d);
      return;
    }
  }
});

const _lnavHost = document.getElementById('lectura-nav');
if (_lnavHost) renderLecturaNav();
