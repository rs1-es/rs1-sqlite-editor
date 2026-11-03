import { t } from './i18n.js';
import { setPageSize, sizeOptions } from './paging.js';
import { renderSchema } from './schema.js';
import { state } from './state.js';
import { switchTab } from './tabs.js';
import { updateUndoButtons } from './undo.js';
import { $, BLOB_TEXT, PAGE_SIZES, displayDefault, esc, qi, rescuePagerFocus } from './util.js';

/* ---------- Data view ---------- */

/* Reads the columns and detects rowid of the current object; updates the toolbar buttons */
export function loadObjectMeta() {
  try {
    const info = state.db.exec(`PRAGMA table_info(${qi(state.current.name)})`);
    state.columns = info.length ? info[0].values.map(r =>
      ({ name: r[1], type: r[2], notnull: r[3], dflt: r[4], pk: r[5] })) : [];
  } catch (e) {
    state.columns = [];
  }
  try {
    state.db.exec(`SELECT rowid FROM ${qi(state.current.name)} LIMIT 1`);
    state.hasRowid = true;
  } catch (e) {
    state.hasRowid = false;
  }
  if (state.sortCol && state.sortCol !== 'rowid' && !state.columns.some(c => c.name === state.sortCol)) state.sortCol = null;
  $('btn-add-row').hidden = state.current.type === 'view' || !state.hasRowid;
  updateUndoButtons();
  fillFilterCols();
  $('btn-structure').hidden = state.current.type === 'view';
  $('btn-rename').hidden = state.current.type === 'view';
  $('readonly-note').hidden = !(state.current.type === 'view' || !state.hasRowid);
}

/* Fills the search column selector (keeps the selection if it still exists) */
export function fillFilterCols() {
  const names = (state.hasRowid ? ['rowid'] : []).concat(state.columns.map(c => c.name));
  if (state.filterCol && !names.includes(state.filterCol)) state.filterCol = '';
  $('filter-col').innerHTML = `<option value="">${esc(t('filterAll'))}</option>` +
    names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  $('filter-col').value = state.filterCol;
}

export function renderBadge() {
  $('table-badge').textContent = t(state.current.type === 'view' ? 'view' : 'table');
}

export function showObject(name, type) {
  state.current = { name, type };
  state.filterText = '';
  state.filterCol = '';
  $('filter-input').value = '';
  state.page = 0;
  state.sortCol = null;
  state.sortDir = 'ASC';
  state.addRowActive = false;
  state.addDraft = [];
  loadObjectMeta();

  $('table-title').textContent = name;
  renderBadge();
  $('welcome').hidden = true;
  $('sql-view').hidden = true;
  $('table-view').hidden = false;
  switchTab('data');
  renderSchema();
  renderRows();
}

/* SELECT for the current listing (search + order). includeRowid: adds rowid as the first column */
export function buildListQuery(includeRowid) {
  const params = [];
  let where = '';
  if (state.filterText) {
    const target = state.filterCol
      ? [state.filterCol]
      : (state.hasRowid ? ['rowid'] : []).concat(state.columns.map(c => c.name));
    const like = '%' + state.filterText.replace(/[\\%_]/g, '\\$&') + '%';
    where = ' WHERE ' + target.map(n => {
      params.push(like);
      return `CAST(${n === 'rowid' && state.hasRowid ? 'rowid' : qi(n)} AS TEXT) LIKE ? ESCAPE '\\'`;
    }).join(' OR ');
  }
  const orderBy = state.sortCol
    ? ` ORDER BY ${state.sortCol === 'rowid' ? 'rowid' : qi(state.sortCol)} ${state.sortDir}` : '';
  return {
    sql: `SELECT ${includeRowid && state.hasRowid ? 'rowid, ' : ''}* FROM ${qi(state.current.name)}${where}${orderBy}`,
    countSql: `SELECT COUNT(*) FROM ${qi(state.current.name)}${where}`,
    params
  };
}

export function renderRows() {
  const container = $('table-container');
  const editable = state.current.type === 'table' && state.hasRowid;

  try {
    const q = buildListQuery(true);
    const matches = state.db.exec(q.countSql, q.params)[0].values[0][0];
    const pages = Math.max(1, Math.ceil(matches / state.pageSize));
    state.page = Math.min(Math.max(state.page, 0), pages - 1);
    const res = state.db.exec(`${q.sql} LIMIT ${state.pageSize} OFFSET ${state.page * state.pageSize}`, q.params);
    const rows = res.length ? res[0].values : [];
    renderPager(matches, rows.length, pages);

    const thClass = col =>
      'sortable' + (state.sortCol === col ? ` sorted ${state.sortDir === 'ASC' ? 'asc' : 'desc'}` : '');

    // sortable headers are keyboard-focusable and expose the current sort to assistive technology
    const sortAttrs = col => 'tabindex="0"' + (state.sortCol === col
      ? ` aria-sort="${state.sortDir === 'ASC' ? 'ascending' : 'descending'}"` : '');

    let html = `<table class="data" aria-label="${esc(state.current.name)}"><thead><tr>`;
    if (state.hasRowid) {
      html += `<th class="${thClass('rowid')}" data-sort="rowid" ${sortAttrs('rowid')} title="${esc(t('sortHint'))}">` +
        `rowid<span class="sort-arrow"></span></th>`;
    }
    for (const c of state.columns) {
      html += `<th class="${thClass(c.name)}" data-sort="${esc(c.name)}" ${sortAttrs(c.name)} title="${esc(t('sortHint'))}">` +
        `${esc(c.name)}<small>${esc(c.type || '')}</small><span class="sort-arrow"></span></th>`;
    }
    html += editable
      ? `<th><span class="sr-only">${esc(t('rowActions'))}</span></th></tr></thead><tbody>`
      : '</tr></thead><tbody>';

    for (const row of rows) {
      let i = 0;
      html += '<tr>';
      if (state.hasRowid) html += `<td class="rowid">${row[i++]}</td>`;
      for (const c of state.columns) {
        const v = row[i++];
        if (v === null || v === undefined) {
          html += `<td class="cell" tabindex="-1" data-col="${esc(c.name)}"><span class="null">NULL</span></td>`;
        } else if (v instanceof Uint8Array) {
          html += `<td class="cell" tabindex="-1" data-col="${esc(c.name)}" data-locked="1"><span class="blob">${BLOB_TEXT} (${v.length} B)</span></td>`;
        } else {
          html += `<td class="cell" tabindex="-1" data-col="${esc(c.name)}" ${editable ? '' : 'data-locked="1"'}>${esc(v)}</td>`;
        }
      }
      if (editable) {
        html += `<td><button class="del" data-rowid="${row[0]}" title="${esc(t('deleteRow'))}" aria-label="${esc(t('deleteRow'))}">✕</button></td>`;
      }
      html += '</tr>';
    }

    if (state.addRowActive && editable) {
      html += '<tr class="add-row">';
      if (state.hasRowid) html += '<td class="rowid">+</td>';
      state.columns.forEach((c, i) => {
        const req = c.notnull && c.dflt == null;
        const ph = req ? '' : displayDefault(c.dflt);
        html += `<td class="cell add-cell${req ? ' req' : ''}">` +
          `<input data-idx="${i}" aria-label="${esc(c.name)}" value="${esc(state.addDraft[i] || '')}"` +
          (ph ? ` placeholder="${esc(ph)}"` : '') +
          (req ? ` title="${esc(t('notNullHint'))}" aria-required="true"` : '') +
          '></td>';
      });
      html += `<td class="add-actions">` +
        `<button class="confirm-add" title="${esc(t('confirmAdd'))}" aria-label="${esc(t('confirmAdd'))}">✓</button>` +
        `<button class="cancel-add" title="${esc(t('cancelAdd'))}" aria-label="${esc(t('cancelAdd'))}">✕</button></td>`;
      html += '</tr>';
    }

    html += rows.length ? '</tbody></table>'
      : `</tbody></table><p class="muted">${esc(t(state.filterText ? 'noMatches' : 'noRows'))}</p>`;
    container.innerHTML = html;
    applyCellFocus(container);

  } catch (e) {
    $('row-count').textContent = '';
    $('pager').hidden = true;
    container.innerHTML = `<p class="error">${esc(e.message)}</p>`;
  }
}

// Roving tabindex: only one body cell is in the tab order; optionally give it focus again
function applyCellFocus(container) {
  const trs = container.querySelectorAll('tbody tr:not(.add-row)');
  if (!trs.length) return;
  const r = Math.min(state.cellPos.r, trs.length - 1);
  const cells = trs[r].querySelectorAll('td.cell');
  if (!cells.length) return;
  const td = cells[Math.min(state.cellPos.c, cells.length - 1)];
  td.tabIndex = 0;
  if (state.refocusCell) td.focus();
  state.refocusCell = false;
}

/* Pagination */

function renderPager(matches, shown, pages) {
  if (matches) {
    const from = state.page * state.pageSize + 1;
    const to = from + shown - 1;
    $('row-count').textContent = state.filterText
      ? t('rowCountFiltered', from, to, matches,
          state.db.exec(`SELECT COUNT(*) FROM ${qi(state.current.name)}`)[0].values[0][0])
      : t('rowCount', from, to, matches);
  } else {
    $('row-count').textContent = '';
  }
  // with a single page at the smallest size there is nothing to paginate
  $('pager').hidden = matches <= PAGE_SIZES[0];
  $('pager-info').textContent = `${state.page + 1} / ${pages}`;
  $('pg-first').disabled = $('pg-prev').disabled = state.page === 0;
  $('pg-last').disabled = $('pg-next').disabled = state.page >= pages - 1;
  rescuePagerFocus($('pg-first'), $('pg-prev'), $('pg-next'), $('pg-last'));
}

function goToPage(n) {
  state.page = n;
  renderRows();
  $('table-container').scrollTop = 0;
}

$('pg-first').addEventListener('click', () => goToPage(0));
$('pg-prev').addEventListener('click', () => goToPage(state.page - 1));
$('pg-next').addEventListener('click', () => goToPage(state.page + 1));
$('pg-last').addEventListener('click', () => goToPage(Infinity));

$('pg-size').innerHTML = sizeOptions();
$('pg-size').value = state.pageSize;
$('pg-size').addEventListener('change', e => {
  setPageSize(Number(e.target.value));
  state.page = 0;
  if (state.current) renderRows();
});

/* Search / filtering */

let filterTimer = null;
$('filter-input').addEventListener('input', e => {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(() => {
    state.filterText = e.target.value.trim();
    state.page = 0;
    if (state.current) renderRows();
  }, 200);
});
$('filter-input').addEventListener('keydown', e => {
  if (e.key === 'Escape' && e.target.value) {
    e.target.value = '';
    clearTimeout(filterTimer);
    state.filterText = '';
    state.page = 0;
    if (state.current) renderRows();
  }
});
$('filter-col').addEventListener('change', e => {
  state.filterCol = e.target.value;
  state.page = 0;
  if (state.filterText && state.current) renderRows();
});
