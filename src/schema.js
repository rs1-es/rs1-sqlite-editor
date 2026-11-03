import { showObject } from './data-view.js';
import { t } from './i18n.js';
import { state } from './state.js';
import { $, esc } from './util.js';

/* ---------- Schema (tables and views) ---------- */

export function refreshSchema() {
  const res = state.db.exec(
    "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') " +
    "AND name NOT LIKE 'sqlite_%' ORDER BY lower(name)");
  state.objects = res.length ? res[0].values.map(r => ({ name: r[0], type: r[1] })) : [];

  if (state.current && !state.objects.some(o => o.name === state.current.name && o.type === state.current.type)) {
    state.current = null;
    state.addRowActive = false;
    state.addDraft = [];
    $('table-view').hidden = true;
    $('welcome').hidden = !$('sql-view').hidden;
  }
  renderSchema();
}

export function renderSchema() {
  const tables = state.objects.filter(o => o.type === 'table');
  const views = state.objects.filter(o => o.type === 'view');
  const item = o => {
    const active = state.current && state.current.name === o.name;
    return `<li data-name="${esc(o.name)}" data-type="${o.type}" class="${active ? 'active' : ''}">` +
      `<button type="button" class="obj"${active ? ' aria-current="true"' : ''}>` +
      `<span class="icon" aria-hidden="true">${o.type === 'view' ? '👁' : '🗄'}</span>${esc(o.name)}</button></li>`;
  };

  $('schema-list').innerHTML =
    `<h2>${esc(t('tables'))} (${tables.length})</h2><ul>` +
    (tables.length ? tables.map(item).join('') : `<li class="empty">${esc(t('noTables'))}</li>`) +
    `</ul><h2>${esc(t('views'))} (${views.length})</h2><ul>` +
    (views.length ? views.map(item).join('') : `<li class="empty">${esc(t('noViews'))}</li>`) +
    '</ul>';
}

$('schema-list').addEventListener('click', e => {
  const li = e.target.closest('li[data-name]');
  if (li) {
    showObject(li.dataset.name, li.dataset.type);
    $('sidebar').classList.remove('open');
    // the list was re-rendered: keep keyboard focus on the selected item, or move it to the
    // content when the sidebar is hidden (small screens)
    const btn = $('schema-list').querySelector('li.active button');
    if (btn) btn.focus();
    if (!btn || document.activeElement !== btn) $('main').focus();
  }
});

$('btn-menu').addEventListener('click', () => $('sidebar').classList.toggle('open'));
