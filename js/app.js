/**
 * app.js — RUAH
 * Orquestador principal de la aplicación.
 *
 * Responsabilidades:
 *   - Renderizar la lista de canciones
 *   - Abrir y mostrar una canción
 *   - Filtros, búsqueda, ordenamiento
 *   - Transposición (UI)
 *   - Favoritos
 *   - Setlist
 *   - Modo impresión
 *   - Editor (save, delete, preview, toolbar)
 *   - Panel admin (tabla, sort, delete, persistencia)
 *   - Navegación entre vistas
 *   - Init (carga del JSON + arranque)
 *
 * Depende de (globals cargadas antes):
 *   state.js · transposer.js · migrator.js · parser.js · renderer.js
 *   misc.js  · mobile.js    · editor.js
 */

// ═══════════════════════════════════════════════════════
// LISTA DE CANCIONES
// ═══════════════════════════════════════════════════════

function renderList() {
  const vis = sortedVisible();
  document.getElementById('cnt').textContent = vis.length + ' canciones';
  document.getElementById('sort-disp').textContent = SORT_LABELS[sortMode] || '';

  const body = document.getElementById('list-body');
  body.innerHTML = '';
  let lastGroup = '';

  vis.forEach(s => {
    // Separador alfabético por primera letra del campo activo
    let group = '';
    if (sortMode === 'alpha' || sortMode === 'random') {
      group = s.title.replace(/^(EL |LA |LOS |LAS |UN |UNA )/i, '')[0] || s.title[0];
    } else if (sortMode === 'artist') {
      group = (s.artist || '—')[0].toUpperCase();
    } else if (sortMode === 'composer') {
      group = (s.composer || '—')[0].toUpperCase();
    }

    if (group !== lastGroup && sortMode !== 'random') {
      const div = document.createElement('div');
      div.className = 'alpha-div';
      div.textContent = group;
      body.appendChild(div);
      lastGroup = group;
    }

    const row = document.createElement('div');
    row.className = 'srow' + (s.id === curId ? ' act' : '');
    const tagsHTML = (s.tags || []).length
      ? `<div class="sr-tags">${(s.tags || []).map(t => `<span class="sr-tag">${t}</span>`).join('')}</div>`
      : '';
    row.innerHTML = `<div class="sr-t">${esc(s.title)}</div><div class="sr-a">${esc(s.artist) || '—'}</div>${tagsHTML}`;
    row.onclick = () => openSong(s.id);
    body.appendChild(row);
  });
}

// ═══════════════════════════════════════════════════════
// ABRIR CANCIÓN
// ═══════════════════════════════════════════════════════

function openSong(id) {
  const s = songs.find(x => x.id === id);
  if (!s) return;

  // En modo presentación, la URL y el meta SEO los maneja _presentGoTo()
  // (apuntan a /setlist, no a la canción individual) — no pisar eso acá.
  if (!presentActive) {
    const newPath = '/cancion/' + id;
    if (location.pathname !== newPath) history.pushState({ song: id }, '', newPath);
    updateMeta(s);
  }

  curId = id;
  sem = 0;
  capo = 0;
  _pauseAutoscroll();

  // Mostrar el detalle inmediatamente (mobile: pantalla completa)
  document.getElementById('empty').style.display     = 'none';
  document.getElementById('song-view').style.display = 'flex';
  document.getElementById('detail').scrollTop        = 0;
  mobileAbrirDetalle();

  // Rellenar datos
  document.getElementById('s-title').textContent         = s.title;
  document.getElementById('s-artist').textContent        = s.artist || '';
  document.getElementById('s-artist-inline').textContent = s.artist || '';
  document.getElementById('s-composer').textContent      = s.composer ? 'Composición: ' + s.composer : '';
  document.getElementById('s-tags-row').innerHTML        = (s.tags || [])
    .map(t => `<span class="s-tag" onclick="setTag('${t}',null)">${t}</span>`)
    .join('');
  document.getElementById('td').textContent              = s.key || '—';
  document.getElementById('tp-key-disp').textContent     = s.key || '—';
  document.getElementById('tp-rst').style.display        = 'none';
  // Resetear capo display
  if (document.getElementById('capo-disp')) {
    document.getElementById('capo-disp').textContent = 'Sin capo';
    document.getElementById('capo-dec').disabled = true;
    document.getElementById('capo-inc').disabled = false;
  }

  updateFavBtn();

  try { blocks = Parser.parse(Migrator.migrate(s.content)); renderBody(); } catch(e) { console.warn('render:', e); }
  try { renderLinks(s); } catch(e) { console.warn('links:', e); }
  try { loadCover(s);   } catch(e) { console.warn('cover:', e); }

  renderList();
}

// ── Renderiza el cuerpo de la canción actual ──────────────

function renderBody() {
  const container = document.getElementById('sbody');
  container.innerHTML = '';
  // sem = transposición manual; capo = traste del capo (resta semitonos visibles)
  const effectiveSem = ((sem - capo) % 12 + 12) % 12;
  container.appendChild(Renderer.render(blocks, effectiveSem, printMode));
  printMode
    ? container.classList.add('print-mode')
    : container.classList.remove('print-mode');
  applyFontSize();
}

// ── Links externos — controla el ítem YouTube del menú ⋮ ──

function renderLinks(s) {
  // Ocultar el slinks clásico (ya no se usa)
  const slinks = document.getElementById('slinks');
  if (slinks) { slinks.style.display = 'none'; slinks.innerHTML = ''; }

  // Mostrar/ocultar el ítem "Ver en YouTube" del menú ⋮
  const ytBtn = document.getElementById('dot-yt-btn');
  if (ytBtn) {
    ytBtn.style.display = s.youtube ? '' : 'none';
    ytBtn.dataset.ytUrl = s.youtube || '';
  }

  // Mostrar/ocultar el ítem "Ver en Spotify" del menú ⋮
  const spBtn = document.getElementById('dot-sp-btn');
  if (spBtn) {
    spBtn.style.display = s.spotify ? '' : 'none';
    spBtn.dataset.spUrl = s.spotify || '';
  }

  // Mostrar/ocultar el botón "Escuchar" del toolbar principal
  const listenBtn = document.getElementById('btn-listen');
  if (listenBtn) {
    listenBtn.style.display = s.youtube ? '' : 'none';
    listenBtn.dataset.ytUrl = s.youtube || '';
  }
}

function openYoutube() {
  const btn = document.getElementById('dot-yt-btn');
  if (btn && btn.dataset.ytUrl) window.open(btn.dataset.ytUrl, '_blank');
}

// ── Modal "Escuchar" — reproduce el mismo s.youtube embebido ──

function extractYoutubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function openListenModal() {
  const btn = document.getElementById('btn-listen');
  const id = extractYoutubeId(btn?.dataset.ytUrl);
  if (!id) return;

  let modal = document.getElementById('listen-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'listen-modal';
    modal.className = 'listen-modal';
    modal.innerHTML = `
      <div class="listen-modal-box">
        <div class="listen-modal-header">
          <span id="listen-modal-title"></span>
          <span class="listen-modal-close" onclick="closeListenModal()">✕</span>
        </div>
        <div class="listen-modal-frame">
          <iframe id="listen-modal-iframe" src="" title="YouTube video player"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeListenModal(); });
  }

  document.getElementById('listen-modal-title').textContent = document.title || 'Escuchar';
  document.getElementById('listen-modal-iframe').src = `https://www.youtube.com/embed/${id}?autoplay=1`;
  modal.classList.add('open');
}

function closeListenModal() {
  const modal = document.getElementById('listen-modal');
  if (!modal) return;
  modal.classList.remove('open');
  const iframe = document.getElementById('listen-modal-iframe');
  if (iframe) iframe.src = ''; // corta la reproducción al cerrar
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('listen-modal');
    if (modal && modal.classList.contains('open')) closeListenModal();
  }
});

function openSpotify() {
  const btn = document.getElementById('dot-sp-btn');
  if (btn && btn.dataset.spUrl) window.open(btn.dataset.spUrl, '_blank');
}

// ═══════════════════════════════════════════════════════
// TRANSPOSICIÓN
// ═══════════════════════════════════════════════════════

function doTp(delta) {
  const s = songs.find(x => x.id === curId);
  if (!s) return;
  sem = ((sem + delta) % 12 + 12) % 12;
  if (sem > 6) sem -= 12;
  const key = Transposer.displayKey(s.key, sem);
  document.getElementById('td').textContent          = key;
  document.getElementById('tp-key-disp').textContent = key;
  document.getElementById('tp-rst').style.display    = sem !== 0 ? 'flex' : 'none';
  renderBody();
}

function doTpRst() {
  const s = songs.find(x => x.id === curId);
  if (!s) return;
  sem = 0;
  document.getElementById('td').textContent          = s.key || '—';
  document.getElementById('tp-key-disp').textContent = s.key || '—';
  document.getElementById('tp-rst').style.display    = 'none';
  renderBody();
}

// ═══════════════════════════════════════════════════════
// FAVORITOS
// ═══════════════════════════════════════════════════════

function toggleFav() {
  const s = songs.find(x => x.id === curId);
  if (!s) return;
  s.fav = !s.fav;
  updateFavBtn();
  renderList();
  toast(s.fav ? '★ Guardada en favoritas' : 'Eliminada de favoritas');
}

// ═══════════════════════════════════════════════════════
// MODO IMPRESIÓN
// ═══════════════════════════════════════════════════════

function togglePrint() {
  printMode = !printMode;
  const dotBtn   = document.getElementById('dot-print-btn');
  const dotLabel = document.getElementById('dot-print-label');
  if (dotBtn)   dotBtn.classList.toggle('on', printMode);
  if (dotLabel) dotLabel.textContent = printMode ? 'Mostrar acordes' : 'Ocultar acordes';
  if (curId) renderBody();
  toast(printMode ? 'Acordes ocultos' : 'Acordes visibles');
}

// ═══════════════════════════════════════════════════════
// TAMAÑO DE FUENTE
// ═══════════════════════════════════════════════════════

function applyFontSize() {
  document.getElementById('sbody').style.fontSize = fontSize + 'em';
  document.getElementById('fs-disp').textContent = Math.round(fontSize * 100) + '%';
  document.getElementById('fs-dec').disabled = fontSize <= FONT_MIN;
  document.getElementById('fs-inc').disabled = fontSize >= FONT_MAX;
}

function changeFontSize(dir) {
  fontSize = Math.min(FONT_MAX, Math.max(FONT_MIN, fontSize + Number(dir) * FONT_STEP));
  applyFontSize();
}

// ═══════════════════════════════════════════════════════
// AUTOSCROLL
// ═══════════════════════════════════════════════════════

let _scrollInterval = null;
let scrollSpeed = 1; // px por tick (ajustable)

function _syncScrollBtns(on) {
  const btn = document.getElementById('btn-scroll');
  if (btn) { btn.classList.toggle('on', on); btn.title = on ? 'Detener scroll' : 'Autoscroll'; }
  const pBtn = document.getElementById('slp-scroll-btn');
  if (pBtn) { pBtn.classList.toggle('on', on); pBtn.title = on ? 'Detener autoscroll' : 'Iniciar autoscroll'; }
}

function _syncScrollSpd() {
  const lbl = scrollSpeed.toFixed(1) + '×';
  const spd = document.getElementById('scroll-spd');
  if (spd) spd.textContent = lbl;
  const pSpd = document.getElementById('slp-scroll-spd');
  if (pSpd) pSpd.textContent = lbl;
}

function toggleAutoscroll() {
  if (_scrollInterval) {
    clearInterval(_scrollInterval);
    _scrollInterval = null;
    _syncScrollBtns(false);
  } else {
    const detail = document.getElementById('detail');
    _scrollInterval = setInterval(() => {
      detail.scrollTop += scrollSpeed;
      // Parar si llegó al final
      if (detail.scrollTop + detail.clientHeight >= detail.scrollHeight - 2) {
        clearInterval(_scrollInterval);
        _scrollInterval = null;
        _syncScrollBtns(false);
      }
    }, 50);
    _syncScrollBtns(true);
  }
}

function changeScrollSpeed(dir) {
  scrollSpeed = Math.min(5, Math.max(0.5, scrollSpeed + dir * 0.5));
  _syncScrollSpd();
}

// Autoscroll del modo proyector: misma lógica/estado que el normal,
// solo que los botones viven en la barra del proyector en vez del gear-panel.
function projScrollToggle() { toggleAutoscroll(); }
function projScrollSpeed(dir) { changeScrollSpeed(dir); }

// Pausar autoscroll al abrir otra canción
function _pauseAutoscroll() {
  if (_scrollInterval) {
    clearInterval(_scrollInterval);
    _scrollInterval = null;
    _syncScrollBtns(false);
  }
}

// ═══════════════════════════════════════════════════════
// CAPO
// ═══════════════════════════════════════════════════════

function changeCapo(dir) {
  capo = Math.min(11, Math.max(0, capo + dir));
  document.getElementById('capo-disp').textContent = capo === 0 ? 'Sin capo' : 'Capo ' + capo;
  document.getElementById('capo-dec').disabled = capo <= 0;
  document.getElementById('capo-inc').disabled = capo >= 11;
  // El capo baja los acordes mostrados: si capo=2, se muestran 2 semitonos menos
  // La tonalidad SONORA no cambia, pero los acordes que ve el guitarrista sí
  renderBody();
  // Actualizar display de tonalidad
  const s = songs.find(x => x.id === curId);
  if (s) {
    const effectiveSem = ((sem - capo) % 12 + 12) % 12;
    const capoLabel = capo > 0 ? ` [Capo ${capo}]` : '';
    document.getElementById('td').textContent = Transposer.displayKey(s.key, sem) + capoLabel;
  }
}

// ═══════════════════════════════════════════════════════
// CIFRADO AMERICANO / EUROPEO
// ═══════════════════════════════════════════════════════

function toggleNotation() {
  chordNotation = chordNotation === 'american' ? 'european' : 'american';
  const btn = document.getElementById('btn-notation');
  btn.textContent = chordNotation === 'american' ? 'C → Do' : 'Do → C';
  btn.title = chordNotation === 'american' ? 'Cifrado americano (C D E…)' : 'Cifrado europeo (Do Re Mi…)';
  if (curId) renderBody();
  toast(chordNotation === 'american' ? 'Cifrado americano' : 'Cifrado europeo (Do Re Mi…)');
}



function copySong() {
  const s = songs.find(x => x.id === curId);
  if (!s) return;
  navigator.clipboard.writeText(s.title + '\n' + (s.artist || '') + '\n\n' + s.content).catch(() => {});
  toast('Letra copiada');
}

// ═══════════════════════════════════════════════════════
// SETLIST
// ═══════════════════════════════════════════════════════

function toggleSL() {
  slOpen = !slOpen;
  document.getElementById('sl-panel').classList.toggle('on', slOpen);
  document.getElementById('pill-sl').classList.toggle('on', slOpen);
}

function toggleMobileSL() {
  const sheet = document.getElementById('mobile-sl-sheet');
  if (!sheet) return;
  sheet.classList.toggle('open');
}

function addToSL() {
  if (!curId) return;
  if (setlist.includes(curId)) { toast('Ya está en el setlist'); return; }
  setlist.push(curId);
  renderSL();
  _updateSaveBtnVisibility();
  toast('Agregada al setlist ✓');
  // En mobile, abrir el sheet automáticamente para que el usuario lo vea
  const sheet = document.getElementById('mobile-sl-sheet');
  if (sheet && window.innerWidth < 768 && !sheet.classList.contains('open')) {
    sheet.classList.add('open');
  }
}

function removeFromSL(id) {
  setlist = setlist.filter(x => x !== id);
  if (!setlist.length) activeMslId = null;  // ya no representa una lista guardada
  renderSL();
  _updateSaveBtnVisibility();
}

function clearSL() {
  setlist = [];
  activeMslId = null;
  renderSL();
  _updateSaveBtnVisibility();
  // Limpiar parámetro ?sl= de la URL sin recargar
  const url = new URL(location.href);
  if (url.searchParams.has('sl')) {
    url.searchParams.delete('sl');
    history.replaceState(null, '', url.pathname);
  }
}

// ═══════════════════════════════════════════════════════
// MIS SETLISTS — listas guardadas (hasta MSL_MAX)
// ═══════════════════════════════════════════════════════
// Cada lista guardada: { id, name, songs:[ids], createdAt, updatedAt }
// Los tonos por canción NO se duplican acá: siguen viviendo en
// SLTONES_LS_KEY indexados por _setlistKey(ids), así que cargar una
// lista guardada automáticamente trae sus tonos si coinciden los IDs.

const MSL_LS_KEY = 'ruah_my_setlists';
const MSL_MAX     = 15;
let activeMslId    = null;   // id de la lista guardada actualmente cargada (null = setlist suelto sin guardar)

function _loadMyLists() {
  try { return JSON.parse(localStorage.getItem(MSL_LS_KEY) || '[]'); }
  catch (e) { return []; }
}

function _saveMyLists(lists) {
  try { localStorage.setItem(MSL_LS_KEY, JSON.stringify(lists)); }
  catch (e) { /* noop */ }
}

function _mslGenId() {
  return 'sl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Abre el prompt para guardar el setlist activo como una lista nueva
// (o actualizar la que ya está cargada, si activeMslId apunta a una).
function openSaveSetlistDialog() {
  if (!setlist.length) { toast('El setlist está vacío'); return; }

  const lists = _loadMyLists();

  // Si ya hay una lista cargada, preguntar si actualizar o guardar como nueva
  if (activeMslId && lists.some(l => l.id === activeMslId)) {
    const updateExisting = confirm(
      '¿Actualizar la lista guardada con los cambios actuales?\n\n' +
      'Cancelar = guardar como una lista nueva en su lugar.'
    );
    if (updateExisting) {
      saveSetlistAs(null, activeMslId);
      return;
    }
  }

  if (lists.length >= MSL_MAX) {
    toast(`Ya tenés ${MSL_MAX} listas guardadas (el máximo). Borrá alguna antes de crear otra.`);
    showView('setlists');
    return;
  }

  const name = prompt('Nombre para esta lista:', setlistName || '');
  if (name === null) return;
  saveSetlistAs(name.trim());
}

// Guarda (o actualiza) el setlist activo como una lista en Mis Setlists.
// Si se pasa updateId, actualiza esa lista existente en vez de crear una nueva.
function saveSetlistAs(name, updateId) {
  if (!setlist.length) { toast('El setlist está vacío'); return; }

  const lists = _loadMyLists();
  const now = Date.now();

  if (updateId) {
    const idx = lists.findIndex(l => l.id === updateId);
    if (idx === -1) { toast('No se encontró la lista a actualizar'); return; }
    lists[idx].songs     = [...setlist];
    lists[idx].updatedAt = now;
    if (name) lists[idx].name = name;
    _saveMyLists(lists);
    activeMslId = updateId;
    toast('Lista actualizada ✓');
  } else {
    if (lists.length >= MSL_MAX) {
      toast(`Ya tenés ${MSL_MAX} listas guardadas (el máximo).`);
      return;
    }
    const entry = {
      id: _mslGenId(),
      name: (name && name.trim()) ? name.trim() : 'Setlist sin nombre',
      songs: [...setlist],
      createdAt: now,
      updatedAt: now,
    };
    lists.push(entry);
    _saveMyLists(lists);
    activeMslId = entry.id;
    if (entry.name) _saveSetlistName(entry.name);
    toast('Lista guardada ✓');
  }

  renderMyLists();
  _updateSaveBtnVisibility();
}

// Carga una lista guardada como el setlist activo (reemplaza el actual)
function loadMyList(id) {
  const lists = _loadMyLists();
  const entry = lists.find(l => l.id === id);
  if (!entry) { toast('No se encontró la lista'); return; }

  if (setlist.length && !confirm(
    `Esto reemplaza el setlist actual (${setlist.length} canción${setlist.length === 1 ? '' : 'es'}) por "${entry.name}".\n\n¿Continuar?`
  )) return;

  // Filtrar por si alguna canción fue borrada del cancionero desde que se guardó
  const validIds = entry.songs.filter(id => songs.some(s => s.id === id));
  if (validIds.length < entry.songs.length) {
    toast(`${entry.songs.length - validIds.length} canción(es) de esta lista ya no existen`);
  }

  setlist = validIds;
  activeMslId = entry.id;
  _saveSetlistName(entry.name);
  renderSL();
  renderMyLists();
  _updateSaveBtnVisibility();
  toast(`"${entry.name}" cargada ✓`);

  // Abrir el panel de setlist para que la vea de inmediato
  if (window.innerWidth < 768) {
    const sheet = document.getElementById('mobile-sl-sheet');
    if (sheet) sheet.classList.add('open');
  } else if (!slOpen) {
    toggleSL();
  }
}

// Borra una lista guardada (no toca el setlist activo)
function deleteMyList(id, evt) {
  if (evt) evt.stopPropagation();
  const lists = _loadMyLists();
  const entry = lists.find(l => l.id === id);
  if (!entry) return;
  if (!confirm(`¿Borrar la lista "${entry.name}"? Esta acción no se puede deshacer.`)) return;

  _saveMyLists(lists.filter(l => l.id !== id));
  if (activeMslId === id) activeMslId = null;
  renderMyLists();
  _updateSaveBtnVisibility();
  toast('Lista borrada');
}

// Muestra/oculta el botón "+ Guardar setlist actual" según haya algo que guardar
function _updateSaveBtnVisibility() {
  const btn = document.getElementById('msl-save-current-btn');
  if (!btn) return;
  btn.style.display = setlist.length ? 'inline-block' : 'none';
}

// Formatea fecha relativa simple (hoy, ayer, hace N días, o fecha)
function _mslRelDate(ts) {
  const diffDays = Math.floor((Date.now() - ts) / 86400000);
  if (diffDays <= 0) return 'hoy';
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  const d = new Date(ts);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

// Renderiza la vista completa de Mis Setlists
function renderMyLists() {
  const container = document.getElementById('msl-list');
  if (!container) return;

  const lists = _loadMyLists().sort((a, b) => b.updatedAt - a.updatedAt);

  if (!lists.length) {
    container.innerHTML = `
      <div class="msl-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="6" height="18" rx="1.3"/><line x1="13" y1="6" x2="21" y2="6"/><line x1="13" y1="12" x2="21" y2="12"/><line x1="13" y1="18" x2="21" y2="18"/></svg>
        <p>Todavía no guardaste ninguna lista.<br>Armá un setlist desde el cancionero y tocá "Guardar setlist actual" para verlo acá.</p>
      </div>`;
    return;
  }

  container.innerHTML = lists.map(l => {
    const isActive = l.id === activeMslId;
    const count = l.songs.length;
    return `
      <div class="msl-card${isActive ? ' active' : ''}" onclick="loadMyList('${l.id}')">
        <div class="msl-dot"${isActive ? ' style="background:var(--f4)"' : ''}></div>
        <div class="msl-meta">
          <div class="msl-name">${esc(l.name)}</div>
          <div class="msl-info">${count} canción${count === 1 ? '' : 'es'} · editada ${_mslRelDate(l.updatedAt)}</div>
        </div>
        ${isActive ? '<span class="msl-active-badge">Activa</span>' : ''}
        <div class="msl-actions">
          <button class="msl-del-btn" onclick="deleteMyList('${l.id}', event)" aria-label="Borrar lista" title="Borrar lista">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>`;
  }).join('') + `<div class="msl-count-note">${lists.length} / ${MSL_MAX} listas guardadas</div>`;
}

function shareSetlist() {
  if (!setlist.length) { toast('El setlist está vacío'); return; }

  // ¿Hay tonos guardados (de una presentación anterior) para este setlist?
  // Si los hay, preguntamos si se incluyen en el link o se comparte con
  // los tonos originales de cada canción.
  const savedTones    = _loadSetlistTones(setlist);
  const hasCustom     = _hasCustomTones(savedTones);
  const includeTones  = hasCustom
    ? confirm('Tenés tonos ajustados guardados para este setlist.\n\n¿Compartir CON esos tonos? (Cancelar = compartir con los tonos originales)')
    : false;

  // Construir URL desde cero — NUNCA desde location.href, porque si el
  // usuario está viendo una canción que no es la primera del setlist
  // (ej. probando un tema suelto), location.pathname quedaría apuntando
  // a esa canción y rompía el link compartido (abría la canción
  // equivocada en vez del setlist). Acá se fuerza siempre /setlist.
  const url = new URL(location.origin + '/setlist');
  const slParam = includeTones
    ? setlist.map(id => {
        const t = savedTones[id];
        return (t && (t.sem || t.capo)) ? `${id}:${t.sem || 0}:${t.capo || 0}` : id;
      }).join(',')
    : setlist.join(',');
  url.searchParams.set('sl', slParam);
  if (setlistName && setlistName.trim()) url.searchParams.set('n', setlistName.trim());
  const shareUrl = url.toString();

  // Texto plano para clipboard/share
  const text = setlist.map((id, i) => {
    const s = songs.find(x => x.id === id);
    if (!s) return '';
    const t = includeTones ? savedTones[id] : null;
    const keyLabel = (t && t.sem)
      ? Transposer.displayKey(s.key, t.sem)
      : s.key;
    const capoLabel = (t && t.capo) ? ` [Capo ${t.capo}]` : '';
    return `${i + 1}. ${s.title}${keyLabel ? ' (' + keyLabel + ')' : ''}${capoLabel}`;
  }).filter(Boolean).join('\n');

  const titleLine = (setlistName && setlistName.trim()) ? setlistName.trim() : 'RUAH · Setlist';

  const shareData = {
    title: titleLine,
    text: titleLine + ':\n' + text,
    url: shareUrl
  };

  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    navigator.clipboard.writeText(shareUrl + '\n\n' + text).catch(() => {});
    toast('Setlist copiado al portapapeles');
  }
}

function renderSL() {
  const tones = _loadSetlistTones(setlist); // { id: {sem, capo} } guardado para este setlist

  const html = !setlist.length
    ? '<div class="sl-empty">Sin canciones aún.</div>'
    : setlist.map((id, i) => {
        const s = songs.find(x => x.id === id);
        if (!s) return '';
        const t = tones[id] || { sem: 0, capo: 0 };
        const displayKey = Transposer.displayKey(s.key, t.sem || 0);
        const isCustom = !!(t.sem || t.capo);
        return `<div class="sl-row">` +
               `<span class="sl-num">${i + 1}</span>` +
               `<span class="sl-title" onclick="openSong('${id}')">${esc(s.title)}</span>` +
               `<div class="sl-tone${isCustom ? ' sl-tone-custom' : ''}">` +
                 `<button class="sl-tone-btn" onclick="event.stopPropagation();adjustSLTone('${id}',-1)" aria-label="Bajar semitono">−</button>` +
                 `<span class="sl-tone-disp" title="${isCustom ? 'Tono ajustado para este setlist' : 'Tono original'}">${displayKey || '—'}</span>` +
                 `<button class="sl-tone-btn" onclick="event.stopPropagation();adjustSLTone('${id}',1)" aria-label="Subir semitono">+</button>` +
               `</div>` +
               `<button class="sl-del" onclick="event.stopPropagation();removeFromSL('${id}')">✕</button>` +
               `</div>`;
      }).join('');

  // Sincronizar ambos paneles (desktop y mobile)
  const sc = document.getElementById('sl-scroll');
  const msc = document.getElementById('mobile-sl-scroll');
  if (sc)  sc.innerHTML  = html;
  if (msc) msc.innerHTML = html;

  // Botón mobile: mostrar solo si hay canciones, con contador
  const btn   = document.getElementById('pill-sl-mobile');
  const count = document.getElementById('pill-sl-count');
  if (btn) btn.style.display = setlist.length ? '' : 'none';
  if (count) count.textContent = setlist.length ? `(${setlist.length})` : '';
}

// Ajusta el semitono de UNA canción del setlist directo desde el panel
// (sin necesidad de entrar al modo Presentación). Usa el mismo storage
// que _presentGoTo, así "Presentar" y el panel de Setlist siempre están
// sincronizados — cualquiera de los dos lugares donde ajustes el tono
// queda guardado para el otro y para compartir.
function adjustSLTone(id, delta) {
  const tones = _loadSetlistTones(setlist);
  const cur = tones[id] || { sem: 0, capo: 0 };
  cur.sem = ((cur.sem + delta) % 12 + 12) % 12; // wrap 0–11, como la transposición normal
  if (cur.sem > 6) cur.sem -= 12; // representar como -5..+6 para que se vea natural (ej. -1 en vez de +11)
  tones[id] = cur;
  _saveSetlistTones(setlist, tones);

  // Si esa canción está activa ahora mismo en modo presentación, refrescar también ahí
  if (presentActive && curId === id) {
    presentPerSong[id] = cur;
    sem = cur.sem;
    _presentApplyKeyDisplay();
    renderBody();
  }

  renderSL();
}

// ═══════════════════════════════════════════════════════
// MODO PRESENTACIÓN DE SETLIST ("modo escenario")
// ═══════════════════════════════════════════════════════
//
// Vista a pantalla completa que recorre las canciones del setlist
// una por una (estilo presentación: flechas / swipe), reutilizando
// #song-view y todos sus controles existentes (transposición, capo,
// scroll, tamaño de letra, cifrado) sin duplicar esa lógica.
//
// Cada canción guarda su propio sem/capo/fontSize mientras se navega,
// para que la transposición de una no afecte a las demás.

let presentActive  = false;   // ¿estamos en modo presentación?
let presentIds     = [];      // copia congelada del setlist al entrar
let presentIdx     = 0;       // índice actual dentro de presentIds
let presentPerSong = {};      // { id: {sem, capo} } — estado independiente por canción
let setlistName    = '';      // nombre del setlist (persiste en localStorage)

const SLNAME_LS_KEY  = 'ruah_setlist_name';
const SLTONES_LS_KEY = 'ruah_setlist_tones'; // { [setlistKey]: { [id]: {sem, capo} } }

// Cargar nombre guardado al iniciar la app
try { setlistName = localStorage.getItem(SLNAME_LS_KEY) || ''; } catch (e) { /* noop */ }

function _saveSetlistName(name) {
  setlistName = name || '';
  try { localStorage.setItem(SLNAME_LS_KEY, setlistName); } catch (e) { /* noop */ }
}

// Clave estable para identificar "este setlist" entre sesiones — se basa
// solo en qué canciones lo componen (no en el orden ni en el nombre), para
// que recordar los tonos sobreviva a reordenar la lista o renombrarla.
function _setlistKey(ids) {
  return [...ids].sort().join('|');
}

function _loadSetlistTones(ids) {
  try {
    const all = JSON.parse(localStorage.getItem(SLTONES_LS_KEY) || '{}');
    return all[_setlistKey(ids)] || {};
  } catch (e) { return {}; }
}

function _saveSetlistTones(ids, perSong) {
  try {
    const all = JSON.parse(localStorage.getItem(SLTONES_LS_KEY) || '{}');
    all[_setlistKey(ids)] = perSong;
    localStorage.setItem(SLTONES_LS_KEY, JSON.stringify(all));
  } catch (e) { /* noop */ }
}

// ¿Hay al menos un tono distinto de 0 guardado para este setlist?
function _hasCustomTones(perSong) {
  return Object.values(perSong || {}).some(v => v && (v.sem || v.capo));
}

// ── Iniciar presentación desde el panel de Setlist ─────────

function startPresent() {
  if (!setlist.length) { toast('El setlist está vacío'); return; }

  if (!setlistName.trim()) {
    const name = prompt('Nombre para este setlist (opcional):', setlistName || '');
    if (name !== null) _saveSetlistName(name.trim());
  }

  // Cerrar paneles de armado de setlist si estaban abiertos
  if (slOpen) toggleSL();
  const mobileSheet = document.getElementById('mobile-sl-sheet');
  if (mobileSheet) mobileSheet.classList.remove('open');

  enterPresent([...setlist], 0, setlistName);
}

// ── Entrar al modo presentación (también usado por deep-link) ─

function enterPresent(ids, startIdx, name, sharedTones) {
  presentIds     = ids;
  presentIdx     = Math.min(Math.max(0, startIdx || 0), ids.length - 1);
  // Prioridad: tonos que vienen en el link compartido (sharedTones) >
  // tonos guardados localmente para este mismo setlist > limpio (0,0).
  presentPerSong = { ..._loadSetlistTones(ids), ...(sharedTones || {}) };
  if (typeof name === 'string') setlistName = name;

  presentActive = true;
  document.body.classList.add('sl-presenting');
  document.getElementById('sl-present').classList.add('on');
  document.getElementById('sl-present').setAttribute('aria-hidden', 'false');

  document.getElementById('empty').style.display     = 'none';
  document.getElementById('song-view').style.display  = 'flex';

  _renderPresentDots();
  _presentGoTo(presentIdx, true);
}

function exitPresent() {
  // Persistir el tono de la última canción vista antes de salir
  if (curId) {
    presentPerSong[curId] = { sem, capo };
    _saveSetlistTones(presentIds, presentPerSong);
  }

  presentActive = false;
  document.body.classList.remove('sl-presenting');
  document.body.classList.remove('proj-active');
  projectorMode = false;
  _applyProjectorTheme();
  _projectorUpdateBtn();
  applyFontSize();   // restaurar tamaño normal de lectura
  document.getElementById('sl-present').classList.remove('on');
  document.getElementById('sl-present').setAttribute('aria-hidden', 'true');
  _pauseAutoscroll();

  // Limpiar la URL de presentación y volver al inicio del cancionero
  history.replaceState(null, '', '/');
  resetMeta();
  curId = null;
  document.getElementById('song-view').style.display = 'none';
  document.getElementById('empty').style.display      = 'flex';
  showView('home');
}

// ── Modo Proyector ───────────────────────────────────────────
// Variante de la presentación de setlist: misma navegación,
// pero pantalla oscura con letra gigante centrada sin acordes,
// pensada para proyectar al público (iglesia, sala).

let projectorMode  = false;
const PROJ_THEMES  = ['proj-dark', 'proj-light', 'proj-warm'];
const PROJ_ICONS   = ['☀︎', '☾', '✦'];
const PROJ_LABELS  = ['negro', 'blanco', 'beige'];
const PROJ_THEME_KEY   = 'ruah_proj_theme';
const PROJ_FONT_KEY    = 'ruah_proj_font';
const PROJ_FONT_MIN    = 1.2;
const PROJ_FONT_MAX    = 6.0;
const PROJ_FONT_STEP   = 0.4;
const PROJ_FONT_DEFAULT = 3.0;   // em base en desktop
let projectorThemeIdx = 0;
let projFontSize = PROJ_FONT_DEFAULT;

// Cargar preferencias guardadas
try {
  const st = parseInt(localStorage.getItem(PROJ_THEME_KEY), 10);
  if (!isNaN(st) && st >= 0 && st < PROJ_THEMES.length) projectorThemeIdx = st;
} catch(e) { /* noop */ }
try {
  const sf = parseFloat(localStorage.getItem(PROJ_FONT_KEY));
  if (!isNaN(sf) && sf >= PROJ_FONT_MIN && sf <= PROJ_FONT_MAX) projFontSize = sf;
} catch(e) { /* noop */ }

function _applyProjFont() {
  const sbody = document.getElementById('sbody');
  if (sbody && projectorMode) sbody.style.fontSize = projFontSize + 'em';
}

function projFontChange(dir) {
  projFontSize = Math.min(PROJ_FONT_MAX, Math.max(PROJ_FONT_MIN, projFontSize + dir * PROJ_FONT_STEP));
  try { localStorage.setItem(PROJ_FONT_KEY, projFontSize); } catch(e) { /* noop */ }
  _applyProjFont();
}

// Aplica la clase de tema al body
function _applyProjectorTheme() {
  PROJ_THEMES.forEach(t => document.body.classList.remove(t));
  if (projectorMode) document.body.classList.add(PROJ_THEMES[projectorThemeIdx]);
  const btn = document.getElementById('slp-theme-btn');
  if (btn) {
    btn.textContent = PROJ_ICONS[projectorThemeIdx];
    btn.title = `Fondo: ${PROJ_LABELS[projectorThemeIdx]} — click para cambiar`;
  }
}

// Cicla entre los 3 temas (solo funciona con proyector activo)
function cycleProjectorTheme() {
  projectorThemeIdx = (projectorThemeIdx + 1) % PROJ_THEMES.length;
  try { localStorage.setItem(PROJ_THEME_KEY, projectorThemeIdx); } catch(e) { /* noop */ }
  _applyProjectorTheme();
  toast(`Fondo: ${PROJ_LABELS[projectorThemeIdx]}`);
}

// Arranca el modo proyector desde el panel del setlist
function startProjector() {
  if (!setlist.length) { toast('El setlist está vacío'); return; }

  if (!setlistName.trim()) {
    const name = prompt('Nombre para este setlist (opcional):', setlistName || '');
    if (name !== null) _saveSetlistName(name.trim());
  }

  if (slOpen) toggleSL();
  const mobileSheet = document.getElementById('mobile-sl-sheet');
  if (mobileSheet) mobileSheet.classList.remove('open');

  projectorMode = true;
  enterPresent([...setlist], 0, setlistName);
  document.body.classList.add('proj-active');
  _applyProjectorTheme();
  _applyProjFont();
  _projectorUpdateBtn();
  toast('Modo proyector activado');
}

// Toggle proyector desde el botón en la barra de presentación
function toggleProjector() {
  projectorMode = !projectorMode;
  document.body.classList.toggle('proj-active', projectorMode);
  _applyProjectorTheme();
  if (projectorMode) {
    _applyProjFont();
  } else {
    // Restaurar el font-size normal (applyFontSize usa la variable global fontSize)
    applyFontSize();
  }
  _projectorUpdateBtn();
  toast(projectorMode ? 'Modo proyector activado' : 'Modo proyector desactivado');
}

function _projectorUpdateBtn() {
  const btn = document.getElementById('slp-proj-btn');
  if (!btn) return;
  btn.style.background = projectorMode ? '#c9a84c'  : 'var(--surf2)';
  btn.style.color      = projectorMode ? '#1c1510'  : 'var(--text)';
  btn.style.border     = projectorMode ? '1px solid #c9a84c' : '1px solid var(--bord)';
  btn.title = projectorMode ? 'Desactivar modo proyector' : 'Activar modo proyector (letra para el público)';
}


function renamePresent() {
  const name = prompt('Nombre del setlist:', setlistName || '');
  if (name === null) return;
  _saveSetlistName(name.trim());
  document.getElementById('slp-name').textContent = setlistName || 'Setlist';

  // Refrescar meta SEO/OG y la URL con el nuevo nombre
  const url = _buildPresentUrl();
  history.replaceState({ present: true, idx: presentIdx }, '', url.pathname + url.search);

  const currentSong = songs.find(x => x.id === curId);
  updatePresentMeta(presentIds, setlistName, currentSong);
}

// Construye la URL de la barra de direcciones durante el modo presentación.
// No incluye los tonos ajustados acá — esos viven en localStorage de este
// dispositivo (ver _saveSetlistTones) y solo se agregan a una URL cuando
// el usuario decide explícitamente compartirla con shareSetlist().
function _buildPresentUrl() {
  const url = new URL(location.origin + '/setlist');
  url.searchParams.set('sl', presentIds.join(','));
  if (setlistName.trim()) url.searchParams.set('n', setlistName.trim());
  url.searchParams.set('i', String(presentIdx + 1));
  return url;
}

// ── Navegación entre canciones del setlist ──────────────────

function presentNav(delta) {
  _presentGoTo(presentIdx + delta);
}

function _presentGoTo(idx, isFirstLoad) {
  if (idx < 0 || idx >= presentIds.length) return; // límites: no da la vuelta

  // Guardar sem/capo de la canción que estábamos viendo (si no es la primera carga)
  if (!isFirstLoad && curId) {
    presentPerSong[curId] = { sem, capo };
    _saveSetlistTones(presentIds, presentPerSong); // persistir en este dispositivo
  }

  presentIdx = idx;
  const id = presentIds[presentIdx];

  openSong(id); // reutiliza toda la lógica existente de render

  // Restaurar (o inicializar) sem/capo independientes de esta canción
  const saved = presentPerSong[id] || { sem: 0, capo: 0 };
  sem  = saved.sem;
  capo = saved.capo;
  presentPerSong[id] = saved;
  _presentApplyKeyDisplay();
  renderBody();

  _presentUpdateBar();
  _presentUpdateDots();
  _presentUpdateNavButtons();

  // Reflejar la canción actual en la URL + meta SEO/Open Graph
  // (para que el link compartido tenga buena preview en WhatsApp, etc.)
  const url = _buildPresentUrl();
  history.replaceState({ present: true, idx: presentIdx }, '', url.pathname + url.search);

  const currentSong = songs.find(x => x.id === id);
  updatePresentMeta(presentIds, setlistName, currentSong);
}

// Re-aplica el display de tonalidad/capo tras restaurar sem/capo guardados
function _presentApplyKeyDisplay() {
  const s = songs.find(x => x.id === curId);
  if (!s) return;
  const key = Transposer.displayKey(s.key, sem);
  document.getElementById('td').textContent          = key + (capo > 0 ? ` [Capo ${capo}]` : '');
  document.getElementById('tp-key-disp').textContent = key;
  document.getElementById('tp-rst').style.display    = sem !== 0 ? 'flex' : 'none';
  const capoDisp = document.getElementById('capo-disp');
  if (capoDisp) {
    capoDisp.textContent = capo === 0 ? 'Sin capo' : 'Capo ' + capo;
    document.getElementById('capo-dec').disabled = capo <= 0;
    document.getElementById('capo-inc').disabled = capo >= 11;
  }
}

function _presentUpdateBar() {
  document.getElementById('slp-name').textContent = setlistName.trim() || 'Setlist';
  document.getElementById('slp-pos').textContent   = `${presentIdx + 1} / ${presentIds.length}`;
}

function _presentUpdateNavButtons() {
  document.getElementById('slp-prev').disabled = presentIdx <= 0;
  document.getElementById('slp-next').disabled = presentIdx >= presentIds.length - 1;
}

function _renderPresentDots() {
  const wrap = document.getElementById('slp-dots');
  if (!wrap) return;
  wrap.innerHTML = presentIds.map((id, i) =>
    `<span class="slp-dot${i === presentIdx ? ' act' : ''}" data-i="${i}" title="${i + 1}"></span>`
  ).join('');
  wrap.querySelectorAll('.slp-dot').forEach(dot => {
    dot.onclick = () => _presentGoTo(Number(dot.dataset.i));
  });
}

function _presentUpdateDots() {
  const wrap = document.getElementById('slp-dots');
  if (!wrap) return;
  wrap.querySelectorAll('.slp-dot').forEach((dot, i) => {
    dot.classList.toggle('act', i === presentIdx);
  });
}

// ── Swipe táctil ─────────────────────────────────────────────

(function initPresentSwipe() {
  let touchStartX = 0, touchStartY = 0, touching = false;

  document.addEventListener('touchstart', e => {
    if (!presentActive) return;
    if (!e.target.closest('#sl-present')) return;
    touching = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!presentActive || !touching) return;
    touching = false;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    // Solo swipe horizontal claro, para no interferir con el scroll vertical de la letra
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      presentNav(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
})();

// ── Teclado: flechas ←/→ para navegar en modo presentación ───

document.addEventListener('keydown', e => {
  if (!presentActive) return;
  if (e.key === 'ArrowRight') presentNav(1);
  else if (e.key === 'ArrowLeft') presentNav(-1);
  else if (e.key === 'Escape') exitPresent();
});

// ═══════════════════════════════════════════════════════
// FILTROS Y BÚSQUEDA
// ═══════════════════════════════════════════════════════

// Favoritas: un solo botón que alterna entre "Todas" y "Favoritas"
function toggleFavFilter(btn) {
  filt = (filt === 'fav') ? 'all' : 'fav';
  btn.classList.toggle('on', filt === 'fav');
  renderList();
}

function setSort(s, el) {
  sortMode = s;
  randomOrder = null;
  document.querySelectorAll('#filter-bar .chip[data-sort]').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  renderList();
  _syncFilterTriggers();
  _closeFilterPanelMobile();
}

function setTag(t, el) {
  tagFilt = t;
  document.querySelectorAll('#filter-bar .chip[data-tag]').forEach(c => c.classList.remove('on', 'tag-on'));
  if (el) {
    el.classList.add(t === 'all' ? 'on' : 'tag-on');
  } else {
    const found = document.querySelector(`#filter-bar .chip[data-tag="${t}"]`);
    if (found) found.classList.add('tag-on');
  }
  renderList();
  showView('songs');
  _syncFilterTriggers();
  _closeFilterPanelMobile();
}

// Disparadores "Orden ▾" / "Tags ▾" (mobile)
function toggleFilterPanel(mode) {
  const bar = document.getElementById('filter-bar');
  const alreadyOpenSame = bar.classList.contains('open') && bar.dataset.mode === mode;
  if (alreadyOpenSame) {
    bar.classList.remove('open');
  } else {
    bar.dataset.mode = mode;
    bar.classList.add('open');
  }
}

function _syncFilterTriggers() {
  const sortLbl = document.getElementById('sort-trigger-lbl');
  const tagLbl  = document.getElementById('tag-trigger-lbl');
  if (sortLbl) {
    const active = document.querySelector('#filter-bar .chip.on[data-sort]');
    sortLbl.textContent = active ? active.textContent : 'A–Z';
  }
  if (tagLbl) {
    const active = document.querySelector('#filter-bar .chip[data-tag].on, #filter-bar .chip[data-tag].tag-on');
    tagLbl.textContent = active ? active.textContent : 'Todas';
  }
}

function _closeFilterPanelMobile() {
  if (window.innerWidth >= 640) return;
  document.getElementById('filter-bar').classList.remove('open');
}

function doSearch() {
  renderList();
}

// ═══════════════════════════════════════════════════════
// NAVEGACIÓN DE VISTAS
// ═══════════════════════════════════════════════════════

function showView(v) {
  document.body.dataset.view = v;
  document.querySelectorAll('.view').forEach(el => el.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
  document.getElementById('v-' + v).classList.add('on');
  document.getElementById('nb-' + v).classList.add('on');
  if (v === 'admin') adminRenderTable();
  if (v === 'setlists') { renderMyLists(); _updateSaveBtnVisibility(); }
  if (v === 'prayers') buildLecturaDelDia();
  const hb = document.getElementById('hamburger');
  if (hb) hb.style.display = 'none';
  if (v === 'home' || v === 'songs' || v === 'prayers') {
    history.replaceState(null, '', '/');
    resetMeta();
  }
}

// ═══════════════════════════════════════════════════════
// LECTURA DEL DÍA (Oraciones)
// ═══════════════════════════════════════════════════════

let _lecturaDelDiaCargada = false;

// El caché por día ya lo maneja el Worker (Cache API, clave con fecha,
// 24hs) y ahora también el Service Worker (networkFirst en sw.js). Se
// sacó la capa extra de localStorage acá: era redundante y, al no estar
// alineada con esas otras dos, terminaba sirviendo la lectura de ayer.
function _hoyStrArg() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

async function buildLecturaDelDia() {
  const wrap = document.getElementById('reading-accordion');
  if (!wrap || _lecturaDelDiaCargada) return;

  try {
    const res = await fetch('/api/lectura-del-dia', { cache: 'no-store' });
    if (!res.ok) return; // endpoint no disponible en este deploy todavía — no rompe nada
    const data = await res.json();
    if (!data || !data.readings) return;
    // Si esto vuelve a pasar (SW/Worker sirviendo algo viejo), que se note
    // en la UI en vez de quedar disimulado.
    const isStale = data.date !== _hoyStrArg();
    _renderLecturaDelDia(wrap, data, isStale);
    _lecturaDelDiaCargada = true;
  } catch (e) {
    return; // sin conexión / CORS / lo que sea — el widget simplemente no aparece
  }
}

// Evangelizo separa párrafos con 1 o más líneas en blanco, sin mucha
// consistencia. Antes esto se mostraba con white-space:pre-line, así que
// cada línea en blanco se traducía en una línea entera de alto (según
// line-height) — con textos que traen varias, se veía un espacio enorme
// entre párrafos. Acá se arman <p> reales, separados por saltos simples
// dentro del párrafo, y el espaciado entre párrafos lo controla el CSS
// (.ra-body-inner p), no la cantidad de \n que vino en el texto.
function _formatReadingText(raw) {
  return raw
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function _renderLecturaDelDia(wrap, data, isStale) {
  const y = Number(data.date.slice(0, 4));
  const m = Number(data.date.slice(4, 6)) - 1;
  const d = Number(data.date.slice(6, 8));
  let dateFmt = new Date(y, m, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  dateFmt = dateFmt.charAt(0).toUpperCase() + dateFmt.slice(1);

  const order = ['FR', 'PS', 'SR', 'GSP']; // todo arranca colapsado; SR (2da lectura) se salta sola si no viene texto
  const itemsHTML = order.map(key => {
    const r = data.readings[key];
    if (!r || !r.text) return '';
    const expanded = false;
    return `
      <button type="button" class="ra-item" data-key="${key}" aria-expanded="${expanded}">
        <span class="ra-label">
          <b>${esc(r.label || key)}</b>
          ${r.cite ? `<span>${esc(r.cite)}</span>` : ''}
        </span>
        <span class="ra-chev">▾</span>
      </button>
      <div class="ra-body" id="ra-body-${key}" ${expanded ? '' : 'hidden'}>
        <div class="ra-body-inner">${_formatReadingText(r.text)}</div>
      </div>
    `;
  }).join('');

  if (!itemsHTML) return; // día sin datos utilizables — mejor no mostrar nada

  wrap.innerHTML = `
    <div class="ra-head">
      <div class="ra-eyebrow">${esc(data.liturgic || 'Lecturas de hoy')}</div>
      <div class="ra-date">${esc(dateFmt)}</div>
      ${isStale ? '<div class="ra-stale">⚠ Podría no ser de hoy — probá recargar</div>' : ''}
    </div>
    ${itemsHTML}
  `;
  wrap.hidden = false;
}

// Expandir/colapsar una lectura del acordeón.
document.addEventListener('click', e => {
  const btn = e.target.closest('#reading-accordion .ra-item');
  if (!btn) return;
  const body = document.getElementById(`ra-body-${btn.dataset.key}`);
  if (!body) return;
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!expanded));
  body.hidden = expanded;
});

// ═══════════════════════════════════════════════════════
// EDITOR
// ═══════════════════════════════════════════════════════

function buildChordToolbar() {
  const tb = document.getElementById('chord-toolbar');
  tb.innerHTML = '';
  TOOLBAR_CHORDS.forEach((group, gi) => {
    if (gi > 0) {
      const sep = document.createElement('div');
      sep.className = 'tb-sep';
      tb.appendChild(sep);
    }
    group.forEach(chord => {
      const btn = document.createElement('button');
      btn.className = 'ck-btn';
      btn.title = TOOLBAR_LABELS[gi];
      const isSpecial = ['sus4', 'sus2', 'add9', 'dim', 'aug'].includes(chord);
      btn.textContent = chord;
      btn.onclick = () => {
        const ta = document.getElementById('ed-content');
        const start = ta.selectionStart;
        const before = ta.value.slice(0, start);
        const after  = ta.value.slice(ta.selectionEnd);
        let insert;
        if (isSpecial) {
          const prevChord = before.match(/\[([A-G][b#]?(?:m|M|maj)?\d*)\]$/);
          if (prevChord) {
            const newBefore = before.slice(0, before.length - prevChord[0].length);
            const newChord  = '[' + prevChord[1] + chord + ']';
            ta.value = newBefore + newChord + after;
            ta.selectionStart = ta.selectionEnd = newBefore.length + newChord.length;
            ta.focus();
            edPreviewUpdate();
            return;
          }
          insert = chord;
        } else {
          insert = '[' + chord + ']';
        }
        ta.value = before + insert + after;
        ta.selectionStart = ta.selectionEnd = start + insert.length;
        ta.focus();
        edPreviewUpdate();
      };
      tb.appendChild(btn);
    });
  });
}

function editorSave() {
  const title = document.getElementById('ed-title').value.trim().toUpperCase();
  if (!title) {
    toast('El título es obligatorio');
    document.getElementById('ed-title').focus();
    return;
  }
  const sp = document.getElementById('ed-spotify').value.trim();
  const yt = document.getElementById('ed-youtube').value.trim();
  const rawContent = document.getElementById('ed-content').value;

  const data = {
    title,
    artist:   document.getElementById('ed-artist').value.trim(),
    composer: document.getElementById('ed-composer').value.trim(),
    key:      document.getElementById('ed-key').value.trim(),
    spotify:  sp,  spId: spId(sp),
    youtube:  yt,  ytId: ytId(yt),
    content:  Migrator.migrate(rawContent),
    tags:     [...edTags],
    source: '', srcTag: 'base', srcColor: '#9e9e9e', fav: false
  };

  if (edSongId) {
    const s = songs.find(x => x.id === edSongId);
    if (s) {
      Object.assign(s, data);
      s.id = edSongId;
      // Si la canción editada está abierta, refrescar la vista
      if (curId === edSongId) {
        blocks = Parser.parse(Migrator.migrate(s.content));
        document.getElementById('s-title').textContent    = s.title;
        document.getElementById('s-artist').textContent   = s.artist || '';
        document.getElementById('s-composer').textContent = s.composer ? 'Composición: ' + s.composer : '';
        document.getElementById('s-tags-row').innerHTML   = (s.tags || [])
          .map(t => `<span class="s-tag" onclick="setTag('${t}',null)">${t}</span>`)
          .join('');
        document.getElementById('td').textContent = s.key || '—';
        renderBody();
        renderLinks(s);
      }
    }
  } else {
    data.id = slugify(title) || 'song-' + Date.now();
    songs.push(data);
  }

  // Guardar automáticamente en localStorage
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(songs));
    document.getElementById('admin-changed').style.display = 'none';
  } catch (e) {
    markUnsaved();
  }
  editorClose();
  adminRenderTable();
  renderList();
  toast(`✓ "${title}" guardada`);
}

function editorDelete() {
  const s = songs.find(x => x.id === edSongId);
  if (!s) return;
  if (!confirm(`¿Eliminar "${s.title}"?`)) return;
  songs = songs.filter(x => x.id !== edSongId);
  if (curId === edSongId) {
    curId = null;
    document.getElementById('empty').style.display    = 'flex';
    document.getElementById('song-view').style.display = 'none';
  }
  // Guardar automáticamente en localStorage
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(songs));
    document.getElementById('admin-changed').style.display = 'none';
  } catch (e) {
    markUnsaved();
  }
  editorClose();
  adminRenderTable();
  renderList();
  toast(`"${s.title}" eliminada`);
}

function edPreviewUpdate() {
  const raw = document.getElementById('ed-content').value;
  const cp  = Migrator.migrate(raw);
  const bl  = Parser.parse(cp);
  const container = document.getElementById('ed-preview-body');
  container.innerHTML = '';
  container.appendChild(Renderer.render(bl, 0, false));

  // Validación de sintaxis ChordPro
  const status = document.getElementById('ed-status');
  const ta     = document.getElementById('ed-content');
  const malformed = /\[[^\]]{0,20}$|\][^\[]*\[/.test(raw) ||
    /[A-G][b#]?[M]\]|\[[A-G][b#]?[M][^\]]*$/.test(raw);
  const hasChords = /\[[A-G][^\]]{0,8}\]/.test(cp);

  if (!raw.trim()) {
    status.className = '';
    status.style.display = 'none';
    ta.classList.remove('has-error');
    return;
  }
  if (malformed) {
    status.textContent = '⚠ Revisar corchetes';
    status.className = 'err';
    ta.classList.add('has-error');
  } else if (hasChords) {
    status.textContent = '✓ ChordPro';
    status.className = 'ok';
    ta.classList.remove('has-error');
  } else {
    status.textContent = 'Solo letra';
    status.className = '';
    status.style.display = 'none';
    ta.classList.remove('has-error');
  }
}

// ═══════════════════════════════════════════════════════
// ADMIN — TABLA
// ═══════════════════════════════════════════════════════

function adminRenderTable() {
  const q = deacc(document.getElementById('admin-si').value);
  let vis = songs.filter(s =>
    !q ||
    deacc(s.title).includes(q) ||
    deacc(s.artist || '').includes(q)
  );
  vis.sort((a, b) => {
    const va = deacc(a[adminSortKey] || '');
    const vb = deacc(b[adminSortKey] || '');
    return adminSortAsc ? va.localeCompare(vb, 'es') : vb.localeCompare(va, 'es');
  });

  document.getElementById('admin-count').textContent = vis.length + ' / ' + songs.length + ' canciones';
  const tbody = document.getElementById('admin-tbody');
  tbody.innerHTML = '';

  vis.forEach((s, i) => {
    const tr = document.createElement('tr');
    const tagsHTML = (s.tags || []).map(t => `<span class="td-tag">${t}</span>`).join('');
    const spLink   = s.spotify
      ? `<a class="lbadge sp" href="${s.spotify}" target="_blank" style="font-size:10px;padding:2px 7px">♫</a>`
      : '';
    const ytLink   = s.youtube
      ? `<a class="lbadge yt" href="${s.youtube}" target="_blank" style="font-size:10px;padding:2px 7px">▶</a>`
      : '';
    tr.innerHTML =
      `<td><div class="td-title" title="${esc(s.title)}">${i + 1}. ${esc(s.title)}</div>` +
      `<div class="td-sub">${esc(s.artist) || '—'}</div></td>` +
      `<td class="td-sub">${esc(s.composer) || '—'}</td>` +
      `<td class="td-key">${esc(s.key) || '—'}</td>` +
      `<td><div class="td-tags">${tagsHTML}</div></td>` +
      `<td>${spLink} ${ytLink}</td>` +
      `<td><button class="row-btn" onclick="editorOpen('${s.id}')">Editar</button>` +
      `<button class="row-btn row-del" onclick="adminDelRow('${s.id}')">✕</button></td>`;
    tbody.appendChild(tr);
  });
}

function adminSort(key) {
  if (adminSortKey === key) {
    adminSortAsc = !adminSortAsc;
  } else {
    adminSortKey = key;
    adminSortAsc = true;
  }
  adminRenderTable();
}

function adminDelRow(id) {
  const s = songs.find(x => x.id === id);
  if (!s) return;
  if (!confirm(`¿Eliminar "${s.title}"?`)) return;
  songs = songs.filter(x => x.id !== id);
  if (curId === id) {
    curId = null;
    document.getElementById('empty').style.display    = 'flex';
    document.getElementById('song-view').style.display = 'none';
  }
  markUnsaved();
  adminRenderTable();
  renderList();
  toast(`"${s.title}" eliminada`);
}

// ═══════════════════════════════════════════════════════
// ADMIN — PERSISTENCIA
// ═══════════════════════════════════════════════════════

function markUnsaved() {
  document.getElementById('admin-changed').style.display = 'inline';
}

function adminSaveLS() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(songs));
    document.getElementById('admin-changed').style.display = 'none';
    toast('✓ Guardado en el navegador');
  } catch (e) {
    toast('✗ Error: ' + e.message);
  }
}

function adminExport() {
  const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ruah_cancionero_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('✓ JSON exportado');
}

// Orden fijo de campos para songs_data.js — mantiene los diffs de git limpios
// entre exportaciones sucesivas (el archivo original tenía 4 órdenes distintos
// mezclados, así que se normaliza a uno solo de acá en adelante).
const SONGS_DATA_FIELD_ORDER = [
  'id', 'title', 'artist', 'composer', 'key',
  'spotify', 'spId', 'youtube', 'ytId',
  'content', 'tags',
  'source', 'srcTag', 'srcColor',
  'fav', 'thumbnailHint'
];

/**
 * Genera el texto completo de songs_data.js a partir del array `songs`
 * actual en memoria (con todos los cambios hechos en el editor/admin).
 */
function buildSongsDataJsText() {
  const normalized = songs.map(s => {
    const out = {};
    SONGS_DATA_FIELD_ORDER.forEach(key => {
      if (key === 'thumbnailHint') {
        out[key] = s.thumbnailHint || (s.ytId ? 'youtube' : (s.spId ? 'spotify' : ''));
      } else if (key === 'tags') {
        out[key] = s.tags || [];
      } else if (key in s) {
        out[key] = s[key];
      } else {
        out[key] = (key === 'fav') ? false : '';
      }
    });
    return out;
  });
  return `const SONGS_DATA = ${JSON.stringify(normalized, null, 2)};\n`;
}

/**
 * Descarga songs_data.js listo para reemplazar el archivo en el repo.
 * Incluye las 220+ canciones con todos los cambios hechos en el editor.
 */
function adminExportSongsData() {
  const text = buildSongsDataJsText();
  const blob = new Blob([text], { type: 'application/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'songs_data.js';
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`✓ songs_data.js exportado (${songs.length} canciones)`);
}

function adminImport(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    try {
      const p = JSON.parse(e.target.result);
      if (!Array.isArray(p)) throw new Error('No es un array');
      if (!confirm(`¿Importar ${p.length} canciones? Reemplazará el cancionero actual.`)) return;
      songs = p.map(s => ({
        ...s,
        spId: spId(s.spotify || ''),
        ytId: ytId(s.youtube || ''),
        tags: s.tags || []
      }));
      adminSaveLS();
      adminRenderTable();
      renderList();
      toast(`✓ ${songs.length} canciones importadas`);
    } catch (e) {
      toast('✗ ' + e.message);
    }
  };
  r.readAsText(file);
  ev.target.value = '';
}

function adminResetConfirm() {
  if (!confirm('¿Restaurar cancionero original? Se perderán los cambios guardados en este navegador.')) return;
  localStorage.removeItem(LS_KEY);
  songs = [...SD].map(s => ({ ...s, tags: s.tags || [] }));
  document.getElementById('admin-changed').style.display = 'none';
  adminRenderTable();
  renderList();
  toast('✓ Restaurado');
}

// ── Acceso Admin protegido ────────────────────────────────
const ADMIN_PWD = 'ruah2026';
let _adminUnlocked = false;

function adminAccess() {
  if (_adminUnlocked) { showView('admin'); return; }
  const pwd = prompt('Contraseña:');
  if (pwd === ADMIN_PWD) {
    _adminUnlocked = true;
    // Dejar visible el botón del nav: si entraste por /admin (mobile,
    // sin Ctrl+Shift+A disponible) igual queda un camino de vuelta.
    const navBtn = document.getElementById('nb-admin');
    if (navBtn) navBtn.style.display = '';
    showView('admin');
  } else if (pwd !== null) {
    toast('Contraseña incorrecta');
  }
}

// Atajo secreto: Ctrl+Shift+A muestra el botón Admin
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    const btn = document.getElementById('nb-admin');
    if (btn) btn.style.display = btn.style.display === 'none' ? '' : 'none';
  }
});

// ═══════════════════════════════════════════════════════
// HEADER DE CANCIÓN — Menú ⋮ y panel ⚙
// ═══════════════════════════════════════════════════════

let _dotMenuOpen  = false;
let _gearPanelOpen = false;

function toggleDotMenu() {
  _dotMenuOpen = !_dotMenuOpen;
  const panel = document.getElementById('dot-menu');
  const btn   = document.getElementById('btn-dot-menu');
  if (panel) { panel.classList.toggle('open', _dotMenuOpen); panel.setAttribute('aria-hidden', !_dotMenuOpen); }
  if (btn)   btn.setAttribute('aria-expanded', _dotMenuOpen);
}

function closeDotMenu() {
  _dotMenuOpen = false;
  const panel = document.getElementById('dot-menu');
  const btn   = document.getElementById('btn-dot-menu');
  if (panel) { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); }
  if (btn)   btn.setAttribute('aria-expanded', 'false');
}

function toggleGearPanel() {
  _gearPanelOpen = !_gearPanelOpen;
  const panel   = document.getElementById('gear-panel');
  const btn     = document.getElementById('btn-gear');
  const chevron = document.getElementById('gear-chevron');
  if (panel)   { panel.classList.toggle('open', _gearPanelOpen); panel.setAttribute('aria-hidden', !_gearPanelOpen); }
  if (btn)     btn.setAttribute('aria-expanded', _gearPanelOpen);
  if (chevron) chevron.style.transform = _gearPanelOpen ? 'rotate(180deg)' : '';
}

function shareSong() {
  const s = songs.find(x => x.id === curId);
  if (!s) return;
  const url  = location.origin + '/cancion/' + s.id;
  const text = s.title + (s.artist ? ' — ' + s.artist : '');
  if (navigator.share) {
    navigator.share({ title: 'RUAH · ' + s.title, text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).catch(() => {});
    toast('Enlace copiado');
  }
}

// ── Exportar canción actual a PDF ──
// Usa sem/capo/chordNotation tal cual están en pantalla ahora mismo,
// igual que renderBody() los usa para dibujar el cuerpo de la canción.
function exportSongPDF() {
  const s = songs.find(x => x.id === curId);
  if (!s) return;
  try {
    PdfExport.exportSong(s, { sem, capo }, chordNotation);
  } catch (e) {
    console.error('exportSongPDF:', e);
    toast('No se pudo generar el PDF');
  }
}

// ── Exportar el setlist completo a PDF ──
// Una página por canción + portada con índice, respetando los tonos
// ajustados que el usuario haya guardado para este setlist.
function exportSetlistPDF() {
  if (!setlist.length) { toast('El setlist está vacío'); return; }
  const tones = _loadSetlistTones(setlist); // { id: {sem, capo} }
  const items = setlist
    .map(id => {
      const song = songs.find(x => x.id === id);
      if (!song) return null;
      const t = tones[id] || { sem: 0, capo: 0 };
      return { song, sem: t.sem || 0, capo: t.capo || 0 };
    })
    .filter(Boolean);
  try {
    PdfExport.exportSetlist(setlistName && setlistName.trim() ? setlistName.trim() : 'Setlist', items, chordNotation);
  } catch (e) {
    console.error('exportSetlistPDF:', e);
    toast('No se pudo generar el PDF');
  }
}

// Navegación con botón Atrás / Adelante del navegador
function handleNavigation() {
  // Soporta rutas reales /cancion/id (History API), /setlist (modo presentación)
  // y hash legacy #cancion/id o #id
  const pathMatch    = location.pathname.match(/^\/cancion\/(.+)$/);
  const hashMatch    = location.hash.match(/^#(?:cancion\/)?(.+)$/);
  const isPresentUrl = /^\/setlist\/?$/.test(location.pathname);
  const songId = pathMatch ? pathMatch[1].trim()
               : hashMatch ? hashMatch[1].trim()
               : null;

  if (presentActive && !isPresentUrl) {
    // El usuario usó "Atrás" del navegador para salir del modo presentación
    exitPresent();
    return;
  }

  if (songId) {
    const exists = songs.find(s => s.id === songId);
    if (exists) { showView('songs'); openSong(songId); return; }
  }
  showView('home');
}

window.addEventListener('hashchange', handleNavigation);
window.addEventListener('popstate', handleNavigation);

// Cerrar menú ⋮ al hacer clic fuera
document.addEventListener('click', e => {
  if (_dotMenuOpen && !document.getElementById('dot-menu-wrap')?.contains(e.target)) {
    closeDotMenu();
  }
});

// ═══════════════════════════════════════════════════════
// HOME — Últimas añadidas, Categorías
// ═══════════════════════════════════════════════════════

// Últimas N canciones agregadas. No depende de fecha: las nuevas siempre
// se cargan al final de SONGS_DATA, así que el orden de posición en el
// array ya es el orden de "agregado" (la más nueva, última).
function getUltimasAgregadas(n = 3) {
  return songs.slice(-n).reverse();
}

// Color de fondo detrás de la portada (o del ícono, si no hay portada),
// según el primer tag de la canción — reusa la paleta de las categorías
// destacadas del home para que no desentone.
function _coverColor(tags) {
  const t = (tags || [])[0];
  return CAT_COLORS[t] || { bg: 'var(--f2)', fg: 'var(--f4)' };
}

// Miniatura de YouTube: URL pública y predecible, sin API key. hqdefault
// es 480x360 (16:9) — se recorta a cuadrado por CSS (object-fit: cover).
function _youtubeThumb(ytId) {
  return ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
}

// Portadas de Spotify resueltas vía su endpoint público de oEmbed (no
// requiere autenticación). Se cachean en localStorage para no repetir el
// fetch en cada carga del Home — la portada de un track no cambia.
const SP_COVER_CACHE_KEY = 'ruah_sp_covers';
function _loadSpCoverCache() {
  try { return JSON.parse(localStorage.getItem(SP_COVER_CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function _saveSpCoverCache(cache) {
  try { localStorage.setItem(SP_COVER_CACHE_KEY, JSON.stringify(cache)); }
  catch { /* localStorage lleno o deshabilitado: no es crítico, se reintenta la próxima carga */ }
}
async function _fetchSpotifyCover(spId) {
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${spId}`);
    if (!res.ok) throw new Error('oEmbed no OK');
    const data = await res.json();
    return data.thumbnail_url || null;
  } catch {
    return null; // se queda con el ícono de categoría como fallback
  }
}

// Si la <img> de portada falla al cargar (video/track eliminado, red, etc.)
// cae al ícono de categoría en vez de quedar rota.
function handleCoverImgError(imgEl) {
  const cover = imgEl.closest('.hli-cover');
  if (!cover) return;
  cover.innerHTML = _catIconSvg(imgEl.dataset.fallbackTag || '');
}

function _coverImgTag(url, tags) {
  const tag = esc((tags || [])[0] || '');
  return `<img src="${esc(url)}" alt="" loading="lazy" data-fallback-tag="${tag}" onerror="handleCoverImgError(this)">`;
}

// Portada sincrónica de mejor calidad disponible en el momento: manual >
// YouTube (inmediata, mientras se resuelve Spotify) > ícono. Spotify nunca
// entra acá porque, salvo que ya esté cacheado, requiere un fetch async
// (ver buildHomeLatest).
function _coverInnerHTML(s) {
  const url = s.cover || _youtubeThumb(s.ytId);
  return url ? _coverImgTag(url, s.tags) : _catIconSvg((s.tags || [])[0]);
}

const HOME_LATEST_TOTAL = 12;
const HOME_LATEST_PAGE_SIZE = 3;

function _homeLatestItemHTML(s, spCache) {
  const c = _coverColor(s.tags);
  const tagsHTML = (s.tags || []).slice(0, 2)
    .map(t => `<span class="hli-tag">${esc(toTitleCase(t))}</span>`)
    .join('');

  // Prioridad: Spotify cacheado (mejor calidad, cuadrada) > manual >
  // YouTube (inmediata mientras se resuelve Spotify) > ícono.
  const cachedSp = (!s.cover && s.spId) ? spCache[s.spId] : null;
  const coverInner = cachedSp ? _coverImgTag(cachedSp, s.tags) : _coverInnerHTML(s);

  return `
    <button class="home-latest-item" data-id="${esc(s.id)}">
      <span class="hli-cover" style="background:${c.bg};color:${c.fg}">${coverInner}</span>
      <span class="hli-info">
        <span class="hli-title">${esc(s.title)}</span>
        <span class="hli-artist">${esc(s.artist || '—')}</span>
        ${tagsHTML ? `<span class="hli-tags">${tagsHTML}</span>` : ''}
      </span>
    </button>
  `;
}

function buildHomeLatest() {
  const wrap = document.getElementById('home-latest');
  const dotsWrap = document.getElementById('home-latest-dots');
  if (!wrap) return;

  const latest = getUltimasAgregadas(HOME_LATEST_TOTAL);
  if (!latest.length) return;

  const spCache = _loadSpCoverCache();

  // Agrupar en páginas de a 3 (vista se mantiene igual, se desliza a la
  // siguiente tanda de canciones en vez de mostrar una lista larga).
  const pages = [];
  for (let i = 0; i < latest.length; i += HOME_LATEST_PAGE_SIZE) {
    pages.push(latest.slice(i, i + HOME_LATEST_PAGE_SIZE));
  }

  wrap.innerHTML = pages.map(page => `
    <div class="home-latest-page">
      ${page.map(s => _homeLatestItemHTML(s, spCache)).join('')}
    </div>
  `).join('');

  if (dotsWrap) {
    dotsWrap.innerHTML = pages.map((_, i) =>
      `<button class="home-latest-dot${i === 0 ? ' active' : ''}" data-page="${i}" aria-label="Página ${i + 1}"></button>`
    ).join('');
  }

  // Fija la altura del carrusel a exactamente 3 filas (medidas en base a
  // la altura real del primer ítem, ya que puede variar según si trae
  // tags o no) para que el scroll vertical siempre muestre 3 canciones.
  requestAnimationFrame(() => {
    const firstItem = wrap.querySelector('.home-latest-item');
    if (firstItem) {
      const itemHeight = firstItem.getBoundingClientRect().height;
      wrap.style.height = (itemHeight * HOME_LATEST_PAGE_SIZE) + 'px';
    }
  });

  // Resolver en segundo plano las portadas de Spotify que no estaban
  // cacheadas — corre para TODAS las que tengan spId (aunque ya se esté
  // mostrando la de YouTube), porque Spotify es la fuente preferida: al
  // llegar reemplaza la miniatura de YouTube por la portada de álbum.
  latest
    .filter(s => !s.cover && s.spId && !spCache[s.spId])
    .forEach(s => {
      _fetchSpotifyCover(s.spId).then(url => {
        if (!url) return;
        const cache = _loadSpCoverCache();
        cache[s.spId] = url;
        _saveSpCoverCache(cache);

        const item = wrap.querySelector(`.home-latest-item[data-id="${CSS.escape(s.id)}"]`);
        const coverEl = item && item.querySelector('.hli-cover');
        if (coverEl) coverEl.innerHTML = _coverImgTag(url, s.tags);
      });
    });
}

// Sincroniza los puntitos con la página visible al deslizar (swipe/scroll
// vertical). Delegado una sola vez sobre #home-latest; recalcula qué
// página está a la vista usando la altura del propio contenedor (cada
// página mide 100% de esa altura).
(function () {
  const wrap = document.getElementById('home-latest');
  if (!wrap) return;
  let ticking = false;

  wrap.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const pageIndex = Math.round(wrap.scrollTop / wrap.clientHeight);
      const dotsWrap = document.getElementById('home-latest-dots');
      if (dotsWrap) {
        dotsWrap.querySelectorAll('.home-latest-dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === pageIndex);
        });
      }
      ticking = false;
    });
  }, { passive: true });
})();

// Click en un puntito → desliza a esa página.
document.addEventListener('click', e => {
  const dot = e.target.closest('#home-latest-dots .home-latest-dot');
  if (!dot) return;
  const wrap = document.getElementById('home-latest');
  const page = Number(dot.dataset.page || 0);
  if (wrap) wrap.scrollTo({ top: page * wrap.clientHeight, behavior: 'smooth' });
});

// Delegación de eventos para las filas de "Últimas añadidas" (mismo patrón
// que goCat: nunca onclick inline, porque títulos/artistas pueden traer
// comillas o tildes que rompen el atributo).
document.addEventListener('click', e => {
  const item = e.target.closest('#home-latest .home-latest-item');
  if (item && item.dataset.id) {
    showView('songs');
    openSong(item.dataset.id);
  }
});

// Iconos por categoría (Tabler-style, mismo set de trazos que el resto del home)
const CAT_ICONS = {
  'ALABANZA':          '<path d="M12 2l2.5 6.5L21 9l-5.5 4.5L17 21l-5-3.5L7 21l1.5-7.5L3 9l6.5-.5z"/>',
  'ADORACIÓN':         '<path d="M15.1765 10.4118C15.1765 12.1661 13.7543 13.5882 12 13.5882M15.1765 10.4118C15.1765 8.65744 13.7543 7.23529 12 7.23529M15.1765 10.4118L19.4117 10.4117M12 13.5882C10.2457 13.5882 8.82352 12.1661 8.82352 10.4118M12 13.5882L12 21M8.82352 10.4118C8.82352 8.65744 10.2457 7.23529 12 7.23529M8.82352 10.4118L4.58826 10.4117M12 7.23529L12 3M14.3319 8.20844L16.2995 6.24081M14.3319 12.6152L16.2995 14.5828M9.66849 8.20844L7.70086 6.24081M9.66849 12.6044L7.70086 14.5721M8.82352 21H15.1765" stroke-linecap="round" stroke-linejoin="round"/>',
  'ENTRADA':           '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'SALIDA':            '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  'COMUNIÓN':          '<path d="M12 2v6M8 8h8l2 13H6L8 8z"/>',
  'SALMO':             '<path d="M5 3v18M9 3v12M13 3v18M17 3v8"/>',
  'PASCUA':            '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M5 8h14M5 16h14"/>',
  'MARÍA':             '<path d="M12 21c-4-3-8-6-8-11a5 5 0 0110-1 5 5 0 0110 1c0 5-4 8-8 11z"/>',
  'JESÚS':             '<path d="M12 3v18M7 8h10"/>',
  'ESPÍRITU SANTO':    '<path d="M12 3c2 3-2 5 0 8s-2 5 0 8M5 12h14"/>',
  'ACCIÓN DE GRACIAS': '<path d="M21.4171 17.9722C21.4171 17.9722 18.1259 14.8027 17.7106 13.3599C16.9227 10.6231 14.6309 2.90597 14.6309 2.90597M2.58274 17.9722C2.58274 17.9722 5.87391 14.8027 6.28928 13.3599C7.07718 10.6231 9.36897 2.90597 9.36897 2.90597M17.5837 22C17.5837 22 14.1989 19.0507 13.0565 17.1007C12.0013 15.2995 12.0013 12.9524 12.0013 12.9524C12.0013 12.9524 12.0013 15.2995 10.946 17.1007C9.8036 19.0507 6.41881 22 6.41881 22M12.0013 14.3181L12.0013 3.35202M17.6004 21.9983L21.4387 17.9938M6.41431 21.9993L2.56128 17.9907M15.0546 19.5062L18.9078 15.5329M8.94519 19.5058L5.092 15.5325M14.6372 2.92816C14.5366 2.62356 14.331 2.36464 14.0571 2.19765C13.7833 2.03066 13.4589 1.96649 13.1421 2.0166C12.8253 2.06671 12.5366 2.22784 12.3276 2.47119C12.1186 2.71454 12.003 3.02427 12.0013 3.34504C11.9997 3.02427 11.884 2.71454 11.675 2.47119C11.466 2.22784 11.1773 2.06671 10.8605 2.0166C10.5437 1.96649 10.2193 2.03066 9.94546 2.19765C9.67158 2.36464 9.466 2.62356 9.36544 2.92816" stroke-linecap="round" stroke-linejoin="round"/>',
  'PENITENCIAL':       '<path d="M12 2v20M5 9l7-7 7 7"/>',
  'SANACIÓN':          '<path d="M12 21s-7-4.5-7-10a5 5 0 0110-1 5 5 0 0110 1c0 5.5-7 10-7 10z"/>',
  // Iglesia con cruz y puerta
  'MISA':              '<path d="M12 2v3M10.5 3.5h3" stroke-linecap="round"/><path d="M6 21V11l6-4 6 4v10" stroke-linejoin="round"/><path d="M9.5 21v-5h5v5"/>',
  // Brújula
  'VOCACIONAL':        '<circle cx="12" cy="12" r="9"/><path d="M15.3 8.7l-2 4.6-4.6 2 2-4.6z" stroke-linejoin="round"/>',
  // Micrófono
  'ANIMACIÓN':         '<rect x="9" y="3" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0012 0" stroke-linecap="round"/><path d="M12 17v3.5M9.5 21h5" stroke-linecap="round"/>',
};
CAT_ICONS['ESPÍRITU SANTO'] = '<path d="M21.3719 15.6309C20.2684 16.956 18.8367 17.9393 17.2334 18.473C15.6301 19.0067 13.917 19.0704 12.2814 18.6571C10.6457 18.2438 9.15055 17.3694 7.95934 16.1295C6.76812 14.8896 5.92673 13.332 5.52719 11.627M21.2184 15.6492C19.954 15.9891 18.6333 16.0659 17.338 15.8749C16.0427 15.6839 14.8003 15.2292 13.6877 14.539M9.10234 10.4595C10.1705 8.26299 12.0379 6.55788 14.3223 5.69336C16.6066 4.82884 19.1351 4.87032 21.3899 5.80932M17.0459 10.7604C17.0589 11.692 16.7246 12.595 16.1082 13.2936C15.4918 13.9922 14.6374 14.4363 13.7115 14.5395M17.0539 10.76C17.0185 10.0973 17.1067 9.43344 17.3124 8.81304C17.5181 8.19263 17.8367 7.62996 18.2468 7.16271C18.6569 6.69546 19.149 6.33442 19.6902 6.10377C20.2315 5.87312 20.8093 5.77819 21.385 5.82533M2.61014 9.67504C3.25471 9.54767 3.92316 9.68176 4.47004 10.0481C5.01691 10.4145 5.39796 10.9836 5.53027 11.6314M2.61548 9.66784C2.80683 9.18255 3.11992 8.75471 3.5246 8.42553C3.92927 8.09635 4.41189 7.87692 4.92597 7.78838C5.44005 7.69983 5.96827 7.74516 6.45976 7.91998C6.95124 8.09481 7.38942 8.39325 7.7321 8.78656M7.72977 8.78461L9.07743 10.4877" stroke-linecap="round" stroke-linejoin="round"/>';
const CAT_ICON_DEFAULT = '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>';

// Color de fondo + acento por categoría destacada (usa la paleta de marca
// definida en css/app.css, así que respeta el modo oscuro automáticamente)
const CAT_COLORS = {
  'ADORACIÓN':         { bg: 'var(--vlight)',    fg: 'var(--violet)' },
  'ACCIÓN DE GRACIAS': { bg: 'var(--f1)',        fg: 'var(--f4)' },
  'MISA':              { bg: 'var(--surf3)',     fg: 'var(--f5)' },
  'VOCACIONAL':        { bg: 'var(--chorus-bg)', fg: 'var(--chorus-text)' },
  'ANIMACIÓN':         { bg: 'var(--f2)',        fg: 'var(--f4)' },
  'ESPÍRITU SANTO':    { bg: 'var(--surf2)',     fg: 'var(--f5)' },
};

function _catIconSvg(tag) {
  const path = CAT_ICONS[tag] || CAT_ICON_DEFAULT;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="24" height="24" aria-hidden="true">${path}</svg>`;
}

function buildHomeCats() {
  const featuredWrap = document.getElementById('home-cats-featured');
  const restWrap      = document.getElementById('home-cat-chips');
  if (!featuredWrap || !restWrap) return;

  // Contar canciones por tag
  const counts = {};
  songs.forEach(s => (s.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));

  // Ordenar por cantidad descendente (empate: alfabético)
  const sortedTags = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));

  // Destacadas fijas (las 5 de mayor uso real, curadas a mano en vez de
  // puro conteo — así no saltan de lugar cada vez que se cargan canciones).
  // Si alguna de estas todavía no tiene canciones cargadas, se completa con
  // las siguientes más usadas para no dejar el bloque incompleto.
  const FEATURED_PINNED = ['ADORACIÓN', 'ACCIÓN DE GRACIAS', 'MISA', 'VOCACIONAL', 'ANIMACIÓN', 'ESPÍRITU SANTO'];
  const FEATURED_N = 6;
  const pinnedAvailable = FEATURED_PINNED.filter(t => counts[t]);
  const fillers = sortedTags.filter(t => !pinnedAvailable.includes(t));
  const featured = pinnedAvailable.concat(fillers).slice(0, FEATURED_N);
  const rest      = sortedTags.filter(t => !featured.includes(t));

  featuredWrap.innerHTML = featured.map(t => {
    const c = CAT_COLORS[t];
    const style = c ? ` style="background:${c.bg};color:${c.fg}"` : '';
    return `
    <button class="home-cat-card" data-tag="${esc(t)}"${style}>
      ${_catIconSvg(t)}
      <span class="hcc-name">${esc(toTitleCase(t))}</span>
      <span class="hcc-count">${counts[t]} canciones</span>
    </button>
  `;
  }).join('');

  const toggle = document.getElementById('home-cats-toggle');
  if (rest.length === 0) {
    if (toggle) toggle.style.display = 'none';
    restWrap.innerHTML = '';
    return;
  }
  if (toggle) {
    toggle.style.display = '';
    toggle.firstChild.textContent = `Ver las ${sortedTags.length} categorías `;
  }

  restWrap.innerHTML = rest.map(t => `
    <button class="home-cat-chip" data-tag="${esc(t)}">
      ${esc(toTitleCase(t))} <span class="hc-count">${counts[t]}</span>
    </button>
  `).join('');
}

function toggleAllCats() {
  const wrap   = document.getElementById('home-cat-chips');
  const toggle = document.getElementById('home-cats-toggle');
  if (!wrap || !toggle) return;
  const opening = wrap.hidden;
  wrap.hidden = !opening;
  toggle.classList.toggle('open', opening);
  if (toggle.firstChild) {
    const total = wrap.querySelectorAll('.home-cat-chip').length + document.querySelectorAll('#home-cats-featured .home-cat-card').length;
    toggle.firstChild.textContent = opening ? `Ocultar categorías ` : `Ver las ${total} categorías `;
  }
}

function goCat(tag) {
  // No depende de encontrar el chip ya pintado en #filter-bar (que puede no
  // existir todavía o estar desincronizado por cache vieja del service worker):
  // se aplica el filtro directo por estado y se sincroniza la UI después.
  tagFilt = tag;
  showView('songs');
  renderList();

  const chips = document.querySelectorAll('#filter-bar .chip[data-tag]');
  chips.forEach(c => c.classList.toggle('tag-on', c.dataset.tag === tag));
}

// Delegación de eventos para los botones de categoría del Home.
// IMPORTANTE: nunca usar onclick="goCat(...)" inline aquí — los tags llevan
// tildes y, peor, JSON.stringify(t) entre comillas dobles dentro de un
// atributo onclick="" (también con comillas dobles) corta el atributo a la
// mitad y deja el HTML del botón roto. data-tag + addEventListener es inmune
// a esto sin importar qué caracteres tenga el tag.
document.addEventListener('click', e => {
  const btn = e.target.closest('#home-cats-featured .home-cat-card, #home-cat-chips .home-cat-chip, .hero-chips .hero-chip');
  if (btn && btn.dataset.tag) goCat(btn.dataset.tag);
});

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════

function init() {
  try {
    // IMPORTANTE: leer el deep link ANTES de cualquier showView().
    // showView('home'/'songs'/'prayers') hace history.replaceState(null,'','/'),
    // lo que pisaría location.pathname antes de poder leerlo si se llamara primero.
    // Deep link: soporta /cancion/id (rutas reales), /setlist (modo presentación)
    // y #cancion/id o #id (legacy hash)
    const pathMatch    = location.pathname.match(/^\/cancion\/(.+)$/);
    const hashMatch    = location.hash.match(/^#(?:cancion\/)?(.+)$/);
    const isPresentUrl = /^\/setlist\/?$/.test(location.pathname);
    // Acceso a Admin por URL: en mobile no hay Ctrl+Shift+A (ni teclado
    // físico), así que /admin (o #admin) es la puerta de entrada — se
    // puede tipear o guardar como acceso directo en la pantalla de inicio.
    const isAdminUrl   = /^\/admin\/?$/.test(location.pathname) || /^#admin$/i.test(location.hash);
    const initId = pathMatch ? pathMatch[1].trim()
                 : hashMatch ? hashMatch[1].trim()
                 : null;
    const qs       = new URLSearchParams(location.search);
    const slParam  = qs.get('sl');
    const nameParam = qs.get('n');
    const idxParam  = qs.get('i');

    initState(SONGS_DATA);    // datos embebidos en songs_data.js
    buildTagChips();          // misc.js: pinta los chips de tags en el filtro
    buildChordToolbar();      // toolbar del editor
    renderList();             // lista inicial
    showView('home');         // vista de inicio (primero mostrar)
    buildPrayers();           // sección de oraciones (después de mostrar el DOM)
    buildHomeLatest();        // últimas 12 canciones añadidas, en carrusel de a 3
    buildHomeCats();          // chips de categorías

    if (isAdminUrl) adminAccess(); // pide contraseña y entra directo a Admin

    if (slParam) {
      // Cada entrada puede venir como "id" (formato viejo, sin tono) o
      // "id:sem:capo" (formato nuevo, cuando se compartió con tonos
      // ajustados). Se separa el id real del resto antes de validar
      // contra el catálogo de canciones.
      const parsed = slParam.split(',').map(raw => {
        const [id, semStr, capoStr] = raw.trim().split(':');
        return { id, sem: semStr ? parseInt(semStr, 10) || 0 : 0, capo: capoStr ? parseInt(capoStr, 10) || 0 : 0 };
      }).filter(p => songs.find(s => s.id === p.id));

      const ids = parsed.map(p => p.id);
      const sharedTones = {};
      parsed.forEach(p => { if (p.sem || p.capo) sharedTones[p.id] = { sem: p.sem, capo: p.capo }; });

      if (ids.length) {
        setlist = ids;
        renderSL();

        if (isPresentUrl) {
          // Link de "Compartir setlist": entra directo al modo presentación,
          // en la canción correcta (1ª por defecto, o la indicada por ?i=),
          // con los tonos que venían en el link (si los había).
          const startIdx = idxParam ? Math.max(0, parseInt(idxParam, 10) - 1) : 0;
          showView('songs');
          enterPresent(ids, startIdx, nameParam || '', sharedTones);
        } else {
          // Comportamiento legacy: setlist cargado en el panel lateral,
          // sin forzar ninguna canción en particular.
          showView('songs');
          toast(`Setlist cargado (${ids.length} canciones)`);
        }
      }
    }

    if (initId && !isPresentUrl) {
      const exists = songs.find(s => s.id === initId);
      if (exists) { showView('songs'); openSong(initId); }
    }

    // Mis Setlists: actualizar visibilidad del botón "Guardar" si hay algo en el setlist
    _updateSaveBtnVisibility();

  } catch (e) {
    console.error('[RUAH] Error al cargar:', e);
  }
}

// ═══════════════════════════════════════════════════════
// SEO: META DINÁMICO POR CANCIÓN
// ═══════════════════════════════════════════════════════

function updateMeta(s) {
  const title = toTitleCase(s.title);
  const artist = s.artist ? toTitleCase(s.artist) : '';
  const key = s.key || '';

  const pageTitle = artist
    ? `${title} — ${artist} | Letra y acordes | RUAH Cancionero`
    : `${title} | Letra y acordes | RUAH Cancionero`;

  const desc = artist
    ? `Letra y acordes de "${title}" de ${artist}${key ? ' (tono ' + key + ')' : ''}. Cancionero litúrgico RUAH.`
    : `Letra y acordes de "${title}"${key ? ' (tono ' + key + ')' : ''}. Cancionero litúrgico RUAH.`;

  const url = location.origin + '/cancion/' + s.id;

  document.title = pageTitle;
  _setMeta('name', 'description', desc);
  _setMeta('property', 'og:title', pageTitle);
  _setMeta('property', 'og:description', desc);
  _setMeta('property', 'og:url', url);
  _setMeta('property', 'og:type', 'article');
  _setMeta('name', 'twitter:title', pageTitle);
  _setMeta('name', 'twitter:description', desc);
  // Actualizar canonical dinámicamente
  const canon = document.getElementById('canonical-tag');
  if (canon) canon.setAttribute('href', url);
}

function resetMeta() {
  document.title = 'RUAH Cancionero — Letras y acordes de música litúrgica';
  _setMeta('name', 'description', 'Cancionero litúrgico para músicos y comunidades de fe. Más de 220 canciones con letras, acordes, transposición en tiempo real y setlists.');
  _setMeta('property', 'og:title', 'RUAH Cancionero — Letras y acordes de música litúrgica');
  _setMeta('property', 'og:description', 'Cancionero litúrgico para músicos y comunidades de fe. Más de 220 canciones con letras, acordes, transposición en tiempo real y setlists.');
  _setMeta('property', 'og:url', location.origin + '/');
  _setMeta('property', 'og:type', 'website');
  // Restaurar canonical a la raíz
  const canon = document.getElementById('canonical-tag');
  if (canon) canon.setAttribute('href', location.origin + '/');
}

// Meta SEO/Open Graph para el modo presentación de setlist.
// Se llama al entrar y en cada cambio de canción dentro de _presentGoTo(),
// así el link que viaja por WhatsApp muestra el nombre del setlist y
// (cuando hay una canción activa) cuál se está tocando en ese momento.
function updatePresentMeta(ids, name, currentSong) {
  const label = (name && name.trim()) ? name.trim() : 'Setlist';
  const n = ids.length;

  const pageTitle = `${label} (${n} canciones) | RUAH Cancionero`;

  const songList = ids
    .map(id => songs.find(s => s.id === id))
    .filter(Boolean)
    .map(s => s.title)
    .join(' · ');

  const desc = currentSong
    ? `Tocando: ${toTitleCase(currentSong.title)}. Setlist completo: ${songList}.`
    : `Setlist de ${n} canciones: ${songList}. Letra, acordes y transposición en tiempo real.`;

  const url = new URL(location.origin + '/setlist');
  url.searchParams.set('sl', ids.join(','));
  if (name && name.trim()) url.searchParams.set('n', name.trim());

  document.title = pageTitle;
  _setMeta('name', 'description', desc);
  _setMeta('property', 'og:title', pageTitle);
  _setMeta('property', 'og:description', desc);
  _setMeta('property', 'og:url', url.toString());
  _setMeta('property', 'og:type', 'website');
  _setMeta('name', 'twitter:title', pageTitle);
  _setMeta('name', 'twitter:description', desc);
  const canon = document.getElementById('canonical-tag');
  if (canon) canon.setAttribute('href', url.toString());
}

function _setMeta(attr, key, content) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function toTitleCase(str) {
  if (!str) return '';
  // \b\w no reconoce vocales acentuadas ni 'ñ' como parte de la palabra,
  // así que generaba mayúsculas en lugares random (ej: "jesús" -> "jEsús").
  // Usamos una clase de caracteres explícita con soporte para acentos.
  return str.toLowerCase().replace(/(^|[\s\-'"“‘(])([a-záéíóúñü])/gi, (m, sep, c) => sep + c.toUpperCase());
}

document.addEventListener('DOMContentLoaded', init);


/* ══════════════════════════════════════════
   MODAL CONTACTO
══════════════════════════════════════════ */
const CTM_CONFIG = {
  song: {
    mainLabel: '¿Qué canción sugerís?',
    mainPlaceholder: 'Nombre de la canción y artista…',
    msgLabel: 'Detalles adicionales (letra, acortes, tonalidad…)',
    msgPlaceholder: '¿Algo más que quieras contarnos?',
    subject: '[RUAH] Sugerencia de canción',
  },
  error: {
    mainLabel: '¿En qué pantalla o función ocurrió el error?',
    mainPlaceholder: 'Ej: "Al abrir la canción Kyrie", "El autoscroll se traba"…',
    msgLabel: '¿Qué pasó exactamente? ¿Se repite?',
    msgPlaceholder: 'Describí el error con el mayor detalle posible.',
    subject: '[RUAH] Reporte de error',
  },
  general: {
    mainLabel: 'Asunto',
    mainPlaceholder: 'Un título breve para tu mensaje…',
    msgLabel: 'Mensaje',
    msgPlaceholder: 'Escribí lo que quieras hacernos llegar.',
    subject: '[RUAH] Contacto general',
  },
};

let ctmType = 'song';

function openContactModal() {
  const modal = document.getElementById('contact-modal');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Reset
  ctmSetTypeByKey('song');
  document.getElementById('ctm-main').value = '';
  document.getElementById('ctm-msg').value = '';
}

function closeContactModal() {
  const modal = document.getElementById('contact-modal');
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

function ctmSetType(btn, type) {
  document.querySelectorAll('.ctm-type').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  ctmType = type;
  const cfg = CTM_CONFIG[type];
  document.getElementById('ctm-main-label').textContent = cfg.mainLabel;
  document.getElementById('ctm-main').placeholder = cfg.mainPlaceholder;
  document.getElementById('ctm-msg-label').textContent = cfg.msgLabel;
  document.getElementById('ctm-msg').placeholder = cfg.msgPlaceholder;
}

function ctmSetTypeByKey(type) {
  const btn = document.querySelector(`.ctm-type[data-type="${type}"]`);
  if (btn) ctmSetType(btn, type);
}

function ctmSend() {
  const cfg = CTM_CONFIG[ctmType];
  const main = document.getElementById('ctm-main').value.trim();
  const msg  = document.getElementById('ctm-msg').value.trim();

  if (!main && !msg) {
    toast('Completá al menos un campo antes de enviar.');
    document.getElementById('ctm-main').focus();
    return;
  }

  const bodyLines = [];
  if (main) bodyLines.push(`${cfg.mainLabel}\n${main}`);
  if (msg)  bodyLines.push(`\n${cfg.msgLabel}\n${msg}`);
  bodyLines.push('\n— Enviado desde RUAH Cancionero');

  const mailtoUrl =
    'mailto:ruah.cancionero@gmail.com' +
    '?subject=' + encodeURIComponent(cfg.subject) +
    '&body='    + encodeURIComponent(bodyLines.join('\n'));

  window.location.href = mailtoUrl;
  closeContactModal();
}

// Cerrar con Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('contact-modal').classList.contains('open')) {
    closeContactModal();
  }
});
