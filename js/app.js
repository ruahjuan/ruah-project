/**
 * app.js — FIAT
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

  const newPath = '/cancion/' + id;
  if (location.pathname !== newPath) history.pushState({ song: id }, '', newPath);
  updateMeta(s);

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
}

function openYoutube() {
  const btn = document.getElementById('dot-yt-btn');
  if (btn && btn.dataset.ytUrl) window.open(btn.dataset.ytUrl, '_blank');
}

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
  document.getElementById('pill-print').classList.toggle('on', printMode);
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

function toggleAutoscroll() {
  const btn = document.getElementById('btn-scroll');
  if (_scrollInterval) {
    clearInterval(_scrollInterval);
    _scrollInterval = null;
    btn.classList.remove('on');
    btn.title = 'Autoscroll';
  } else {
    const detail = document.getElementById('detail');
    _scrollInterval = setInterval(() => {
      detail.scrollTop += scrollSpeed;
      // Parar si llegó al final
      if (detail.scrollTop + detail.clientHeight >= detail.scrollHeight - 2) {
        clearInterval(_scrollInterval);
        _scrollInterval = null;
        btn.classList.remove('on');
      }
    }, 50);
    btn.classList.add('on');
    btn.title = 'Detener scroll';
  }
}

function changeScrollSpeed(dir) {
  scrollSpeed = Math.min(5, Math.max(0.5, scrollSpeed + dir * 0.5));
  document.getElementById('scroll-spd').textContent = scrollSpeed.toFixed(1) + '×';
}

// Pausar autoscroll al abrir otra canción
function _pauseAutoscroll() {
  if (_scrollInterval) {
    clearInterval(_scrollInterval);
    _scrollInterval = null;
    const btn = document.getElementById('btn-scroll');
    if (btn) btn.classList.remove('on');
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
  btn.textContent = chordNotation === 'american' ? 'A–B–C' : 'Do–Re';
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
  toast('Agregada al setlist ✓');
  // En mobile, abrir el sheet automáticamente para que el usuario lo vea
  const sheet = document.getElementById('mobile-sl-sheet');
  if (sheet && window.innerWidth < 768 && !sheet.classList.contains('open')) {
    sheet.classList.add('open');
  }
}

function removeFromSL(id) {
  setlist = setlist.filter(x => x !== id);
  renderSL();
}

function clearSL() {
  setlist = [];
  renderSL();
  // Limpiar parámetro ?sl= de la URL sin recargar
  const url = new URL(location.href);
  if (url.searchParams.has('sl')) {
    url.searchParams.delete('sl');
    history.replaceState(null, '', url.pathname);
  }
}

function shareSetlist() {
  if (!setlist.length) { toast('El setlist está vacío'); return; }

  // Construir URL con ?sl=id1,id2,...
  const url = new URL(location.href);
  url.searchParams.set('sl', setlist.join(','));
  url.hash = '';
  const shareUrl = url.toString();

  // Texto plano para clipboard/share
  const text = setlist.map((id, i) => {
    const s = songs.find(x => x.id === id);
    return s ? `${i + 1}. ${s.title}${s.key ? ' (' + s.key + ')' : ''}` : '';
  }).filter(Boolean).join('\n');

  const shareData = {
    title: 'RUAH · Setlist',
    text: 'Setlist:\n' + text,
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
  const html = !setlist.length
    ? '<div class="sl-empty">Sin canciones aún.</div>'
    : setlist.map((id, i) => {
        const s = songs.find(x => x.id === id);
        if (!s) return '';
        return `<div class="sl-row" onclick="openSong('${id}')">` +
               `<span class="sl-num">${i + 1}</span>` +
               `<span style="flex:1;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.title)}</span>` +
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

// ═══════════════════════════════════════════════════════
// FILTROS Y BÚSQUEDA
// ═══════════════════════════════════════════════════════

function setFilt(f, btn) {
  filt = f;
  document.querySelectorAll('#ctrl-bar .pill').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderList();
}

function setSort(s, el) {
  sortMode = s;
  randomOrder = null;
  document.querySelectorAll('#filter-bar .chip[data-sort]').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  renderList();
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
}

function doSearch() {
  renderList();
}

// ═══════════════════════════════════════════════════════
// NAVEGACIÓN DE VISTAS
// ═══════════════════════════════════════════════════════

function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
  document.getElementById('v-' + v).classList.add('on');
  document.getElementById('nb-' + v).classList.add('on');
  if (v === 'admin') adminRenderTable();
  const hb = document.getElementById('hamburger');
  if (hb) hb.style.display = 'none';
  if (v === 'home' || v === 'songs' || v === 'prayers') {
    history.replaceState(null, '', '/');
    resetMeta();
  }
}

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
  const url  = location.origin + location.pathname + '#' + s.id;
  const text = s.title + (s.artist ? ' — ' + s.artist : '');
  if (navigator.share) {
    navigator.share({ title: 'RUAH · ' + s.title, text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).catch(() => {});
    toast('Enlace copiado');
  }
}

// Navegación con botón Atrás / Adelante del navegador
function handleNavigation() {
  // Soporta rutas reales /cancion/id (History API) y hash legacy #cancion/id o #id
  const pathMatch = location.pathname.match(/^\/cancion\/(.+)$/);
  const hashMatch = location.hash.match(/^#(?:cancion\/)?(.+)$/);
  const songId = pathMatch ? pathMatch[1].trim()
               : hashMatch ? hashMatch[1].trim()
               : null;
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
// HOME — Stats, Canción de la semana, Categorías
// ═══════════════════════════════════════════════════════

function buildHomeStats() {
  const nSongs    = songs.length;
  const allTags   = new Set(songs.flatMap(s => s.tags || []));
  const nPrayers  = (typeof PRAYERS !== 'undefined') ? PRAYERS.length : 5;

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('stat-songs',   nSongs);
  el('stat-tags',    allTags.size);
  el('stat-prayers', nPrayers);
}

function buildSotW() {
  if (!songs.length) return;

  // Determinar canción de la semana: rotar por número de semana del año
  const now       = new Date();
  const startYear = new Date(now.getFullYear(), 0, 1);
  const weekNum   = Math.floor((now - startYear) / (7 * 24 * 3600 * 1000));
  const s         = songs[weekNum % songs.length];

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('sotw-title',  s.title);
  el('sotw-artist', s.artist || '—');

  const tagsEl = document.getElementById('sotw-tags');
  if (tagsEl) {
    tagsEl.innerHTML = (s.tags || [])
      .map(t => `<span class="sotw-tag">${esc(t)}</span>`)
      .join('');
  }

  const btn = document.getElementById('sotw-btn');
  if (btn) btn.onclick = () => { showView('songs'); openSong(s.id); };
}

function buildHomeCats() {
  const wrap = document.getElementById('home-cat-chips');
  if (!wrap) return;

  const allTags = [...new Set(songs.flatMap(s => s.tags || []))].sort();
  wrap.innerHTML = allTags
    .map(t => `<button class="home-cat-chip" onclick="goCat(${JSON.stringify(t)})">${esc(t)}</button>`)
    .join('');
}

function goCat(tag) {
  showView('songs');
  // Activar el chip de tag correspondiente en la vista canciones
  const chips = document.querySelectorAll('#filter-bar .chip[data-tag]');
  chips.forEach(c => {
    const isTarget = c.dataset.tag === tag;
    c.classList.toggle('on', isTarget);
    if (isTarget) setTag(tag, c);
  });
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════

function init() {
  try {
    initState(SONGS_DATA);    // datos embebidos en songs_data.js
    buildTagChips();          // misc.js: pinta los chips de tags en el filtro
    buildChordToolbar();      // toolbar del editor
    renderList();             // lista inicial
    showView('home');         // vista de inicio (primero mostrar)
    buildPrayers();           // sección de oraciones (después de mostrar el DOM)
    buildHomeStats();         // stats: canciones, categorías, oraciones
    buildSotW();              // canción de la semana
    buildHomeCats();          // chips de categorías

    // Setlist compartido: ?sl=id1,id2,...
    const slParam = new URLSearchParams(location.search).get('sl');
    if (slParam) {
      const ids = slParam.split(',').map(x => x.trim()).filter(x => songs.find(s => s.id === x));
      if (ids.length) {
        setlist = ids;
        renderSL();
        showView('songs');
        toast(`Setlist cargado (${ids.length} canciones)`);
      }
    }

    // Deep link: soporta /cancion/id (rutas reales) y #cancion/id o #id (legacy hash)
    const pathMatch = location.pathname.match(/^\/cancion\/(.+)$/);
    const hashMatch = location.hash.match(/^#(?:cancion\/)?(.+)$/);
    const initId = pathMatch ? pathMatch[1].trim()
                 : hashMatch ? hashMatch[1].trim()
                 : null;
    if (initId) {
      const exists = songs.find(s => s.id === initId);
      if (exists) { showView('songs'); openSong(initId); }
    }
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
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
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
