import { showObject } from './data-view.js';
import { t } from './i18n.js';
import { state } from './state.js';
import { $, esc } from './util.js';

/* ---------- Esquema (tablas y vistas) ---------- */

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
  const item = o =>
    `<li data-name="${esc(o.name)}" data-type="${o.type}" ` +
    `class="${state.current && state.current.name === o.name ? 'active' : ''}">` +
    `<span class="icon">${o.type === 'view' ? '👁' : '🗄'}</span>${esc(o.name)}</li>`;

  $('schema-list').innerHTML =
    `<h3>${esc(t('tables'))} (${tables.length})</h3><ul>` +
    (tables.length ? tables.map(item).join('') : `<li class="empty">${esc(t('noTables'))}</li>`) +
    `</ul><h3>${esc(t('views'))} (${views.length})</h3><ul>` +
    (views.length ? views.map(item).join('') : `<li class="empty">${esc(t('noViews'))}</li>`) +
    '</ul>';
}

$('schema-list').addEventListener('click', e => {
  const li = e.target.closest('li[data-name]');
  if (li) {
    showObject(li.dataset.name, li.dataset.type);
    $('sidebar').classList.remove('open');
  }
});

$('btn-menu').addEventListener('click', () => $('sidebar').classList.toggle('open'));
