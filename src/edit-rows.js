import { renderRows } from './data-view.js';
import { t } from './i18n.js';
import { state } from './state.js';
import { setStatus } from './status.js';
import { $, qi } from './util.js';

/* Cell editing (double click) */

const tableContainer = $('table-container');

tableContainer.addEventListener('dblclick', e => {
  const td = e.target.closest('td.cell');
  if (!td || td.dataset.locked || state.current.type !== 'table' || !state.hasRowid) return;
  td.dataset.original = td.textContent;
  td.dataset.originalHtml = td.innerHTML;
  td.contentEditable = 'true';
  td.focus();
  const range = document.createRange();
  range.selectNodeContents(td);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
});

tableContainer.addEventListener('keydown', e => {
  const td = e.target.closest('td.cell[contenteditable="true"]');
  if (!td) return;
  if (e.key === 'Enter') { e.preventDefault(); td.blur(); }
  if (e.key === 'Escape') { td.dataset.cancel = '1'; td.blur(); }
});

tableContainer.addEventListener('focusout', e => {
  const td = e.target.closest('td.cell[contenteditable="true"]');
  if (!td) return;
  td.contentEditable = 'false';
  const newVal = td.textContent;
  if (td.dataset.cancel) {
    delete td.dataset.cancel;
    td.innerHTML = td.dataset.originalHtml;
    return;
  }
  if (newVal === td.dataset.original) return;
  commitCell(td, newVal);
});

function commitCell(td, newVal) {
  const rowid = td.closest('tr').querySelector('button.del').dataset.rowid;
  const col = td.dataset.col;
  const colDef = state.columns.find(c => c.name === col);
  const emptyValue = colDef && colDef.notnull ? '' : null;
  try {
    state.db.run(
      `UPDATE ${qi(state.current.name)} SET ${qi(col)} = ? WHERE rowid = ?`,
      [newVal === '' ? emptyValue : newVal, Number(rowid)]);
    setStatus(() => t('cellUpdated'));
    renderRows();
  } catch (e) {
    setStatus(e.message, true);
    renderRows();
  }
}

/* Adding and deleting records */

$('btn-add-row').addEventListener('click', () => {
  if (!state.current || state.current.type !== 'table' || !state.hasRowid) return;
  if (state.addRowActive) {
    const first = tableContainer.querySelector('tr.add-row input');
    if (first) first.focus();
    return;
  }
  state.addRowActive = true;
  state.addDraft = [];
  state.page = Infinity; // the new row is shown at the end of the listing, on the last page
  renderRows();
  const row = tableContainer.querySelector('tr.add-row');
  if (row) {
    row.scrollIntoView({ block: 'nearest' });
    const first = row.querySelector('input');
    if (first) first.focus();
  }
});

function commitAddRow() {
  const inputs = [...tableContainer.querySelectorAll('tr.add-row input')];
  const cols = [];
  const vals = [];
  for (const inp of inputs) {
    if (inp.value !== '') {
      const c = state.columns[Number(inp.dataset.idx)];
      if (!c) continue;
      cols.push(qi(c.name));
      vals.push(inp.value);
    }
  }
  try {
    if (cols.length) {
      state.db.run(
        `INSERT INTO ${qi(state.current.name)} (${cols.join(', ')}) ` +
        `VALUES (${cols.map(() => '?').join(', ')})`, vals);
    } else {
      state.db.run(`INSERT INTO ${qi(state.current.name)} DEFAULT VALUES`);
    }
    state.addRowActive = false;
    state.addDraft = [];
    if (!state.sortCol && !state.filterText) state.page = Infinity;
    renderRows();
    if (!state.sortCol) tableContainer.scrollTop = tableContainer.scrollHeight;
    setStatus(() => t('rowAdded'));
  } catch (e) {
    // the draft row is kept with its values so they can be corrected
    setStatus(() => t('addFail', e.message), true);
  }
}

function cancelAddRow() {
  state.addRowActive = false;
  state.addDraft = [];
  renderRows();
}

tableContainer.addEventListener('input', e => {
  const inp = e.target.closest('tr.add-row input');
  if (inp) state.addDraft[Number(inp.dataset.idx)] = inp.value;
});

tableContainer.addEventListener('keydown', e => {
  const inp = e.target.closest('tr.add-row input');
  if (!inp) return;
  if (e.key === 'Enter') { e.preventDefault(); commitAddRow(); }
  else if (e.key === 'Escape') { e.preventDefault(); cancelAddRow(); }
});

tableContainer.addEventListener('click', e => {
  const addBtn = e.target.closest('button.confirm-add, button.cancel-add');
  if (addBtn) {
    if (addBtn.classList.contains('confirm-add')) commitAddRow();
    else cancelAddRow();
    return;
  }
  const th = e.target.closest('th.sortable');
  if (th) {
    const col = th.dataset.sort;
    if (state.sortCol === col) state.sortDir = state.sortDir === 'ASC' ? 'DESC' : 'ASC';
    else { state.sortCol = col; state.sortDir = 'ASC'; }
    state.page = 0;
    renderRows();
    return;
  }
  const btn = e.target.closest('button.del');
  if (!btn) return;
  if (!confirm(t('confirmDelete'))) return;
  try {
    state.db.run(`DELETE FROM ${qi(state.current.name)} WHERE rowid = ?`, [Number(btn.dataset.rowid)]);
    renderRows();
    setStatus(() => t('rowDeleted'));
  } catch (err) {
    setStatus(err.message, true);
  }
});
