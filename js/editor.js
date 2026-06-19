/**
 * editor.js — FIAT
 * Lógica del editor de canciones + sistema de tags.
 */

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(window._tt);
  window._tt = setTimeout(() => t.classList.remove('on'), 2300);
}

// ── Tag picker ────────────────────────────────────────────

function buildTagPicker(selectedTags) {
  const wrap = document.getElementById('tag-picker');
  wrap.innerHTML = '';
  edTags = [...(selectedTags || [])];

  // Botones de tags existentes
  ALL_TAGS.forEach(tag => _appendTagBtn(wrap, tag));

  // Botón "+" para crear tag nuevo
  const addBtn = document.createElement('button');
  addBtn.className = 'tag-add-btn';
  addBtn.type = 'button';
  addBtn.title = 'Crear nueva etiqueta';
  addBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
         width="11" height="11"><line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
    Nueva etiqueta`;
  addBtn.onclick = () => _showNewTagInput(wrap, addBtn);
  wrap.appendChild(addBtn);
}

function _appendTagBtn(wrap, tag) {
  const btn = document.createElement('button');
  btn.className = 'tag-pick-btn' + (edTags.includes(tag) ? ' on' : '');
  btn.textContent = tag;
  btn.type = 'button';
  btn.onclick = () => {
    if (edTags.includes(tag)) {
      edTags = edTags.filter(t => t !== tag);
      btn.classList.remove('on');
    } else {
      edTags.push(tag);
      btn.classList.add('on');
    }
  };
  // Insertar antes del botón "+"
  const addBtn = wrap.querySelector('.tag-add-btn');
  wrap.insertBefore(btn, addBtn || null);
  return btn;
}

function _showNewTagInput(wrap, addBtn) {
  // Evitar duplicar el input
  if (wrap.querySelector('.tag-new-input')) return;

  addBtn.style.display = 'none';

  const input = document.createElement('input');
  input.className = 'tag-new-input';
  input.type = 'text';
  input.placeholder = 'Nombre…';
  input.maxLength = 30;
  input.autocomplete = 'off';

  const confirm = document.createElement('button');
  confirm.className = 'tag-new-ok';
  confirm.type = 'button';
  confirm.textContent = 'Agregar';

  const cancel = document.createElement('button');
  cancel.className = 'tag-new-cancel';
  cancel.type = 'button';
  cancel.textContent = '✕';

  const cleanup = () => {
    input.remove();
    confirm.remove();
    cancel.remove();
    addBtn.style.display = '';
  };

  const doCreate = () => {
    const val = input.value.trim().toUpperCase();
    if (!val) { input.focus(); return; }
    if (ALL_TAGS.includes(val)) {
      toast(`La etiqueta "${val}" ya existe`);
      cleanup();
      return;
    }
    // Agregar a ALL_TAGS y persistir
    ALL_TAGS.push(val);
    ALL_TAGS.sort();
    try { localStorage.setItem(LS_TAGS_KEY, JSON.stringify(ALL_TAGS)); } catch(e) {}

    // Reconstruir el picker con el nuevo tag seleccionado
    edTags.push(val);
    buildTagPicker(edTags);

    // Actualizar los chips de la lista (filter-bar)
    buildTagChips();

    toast(`Etiqueta "${val}" creada ✓`);
  };

  confirm.onclick  = doCreate;
  cancel.onclick   = cleanup;
  input.onkeydown  = e => {
    if (e.key === 'Enter') { e.preventDefault(); doCreate(); }
    if (e.key === 'Escape') cleanup();
  };

  wrap.insertBefore(input,   addBtn);
  wrap.insertBefore(confirm, addBtn);
  wrap.insertBefore(cancel,  addBtn);
  setTimeout(() => input.focus(), 0);
}

// ── Inserción de sección en textarea ─────────────────────

function edIns(tag) {
  const ta     = document.getElementById('ed-content');
  const start  = ta.selectionStart;
  const before = ta.value.slice(0, start);
  const after  = ta.value.slice(ta.selectionEnd);
  const ins    = (before.endsWith('\n') || !before ? '' : '\n') + tag + '\n';
  ta.value = before + ins + after;
  ta.selectionStart = ta.selectionEnd = start + ins.length;
  ta.focus();
  edPreviewUpdate();
}

// ── Abrir / cerrar editor ─────────────────────────────────

function editorOpen(id) {
  edSongId = id;
  if (id) {
    const s = songs.find(x => x.id === id);
    if (!s) return;
    document.getElementById('editor-title-disp').textContent = s.title;
    document.getElementById('ed-title').value    = s.title;
    document.getElementById('ed-artist').value   = s.artist    || '';
    document.getElementById('ed-composer').value = s.composer  || '';
    document.getElementById('ed-key').value      = s.key       || '';
    document.getElementById('ed-spotify').value  = s.spotify   || '';
    document.getElementById('ed-youtube').value  = s.youtube   || '';
    document.getElementById('ed-content').value  = s.content   || '';
    document.getElementById('ed-del-btn').style.display = 'inline-flex';
    buildTagPicker(s.tags || []);
  } else {
    document.getElementById('editor-title-disp').textContent = 'Nueva canción';
    ['ed-title','ed-artist','ed-composer','ed-key','ed-spotify','ed-youtube','ed-content']
      .forEach(id => document.getElementById(id).value = '');
    document.getElementById('ed-del-btn').style.display = 'none';
    buildTagPicker([]);
  }
  document.getElementById('song-editor').style.display = 'flex';
  document.getElementById('ed-title').focus();
  edPreviewUpdate();
}

function editorClose() {
  document.getElementById('song-editor').style.display = 'none';
}

function toggleEdPreview() {
  // kept for backward compat — preview is now always visible
}
