import { showObject } from './data-view.js';
import { t } from './i18n.js';
import { refreshSchema } from './schema.js';
import { state } from './state.js';
import { setStatus } from './status.js';
import { $, esc, qi } from './util.js';

/* ---------- Visual table creator ---------- */

export const COL_TYPES = ['INTEGER', 'TEXT', 'REAL', 'NUMERIC', 'BLOB'];
const ntBody = $('nt-cols').tBodies[0];

function ntAddColumn(def = {}) {
  const tr = ntBody.insertRow();
  const type = def.type || 'TEXT';
  tr.innerHTML =
    `<td><input class="c-name" type="text" spellcheck="false" aria-label="${esc(t('colName'))}" value="${esc(def.name || '')}"></td>` +
    `<td><select class="c-type" aria-label="${esc(t('colType'))}">${COL_TYPES.map(x =>
      `<option${x === type ? ' selected' : ''}>${x}</option>`).join('')}</select></td>` +
    `<td><input class="c-pk" type="checkbox" aria-label="PRIMARY KEY"${def.pk ? ' checked' : ''}></td>` +
    `<td><input class="c-ai" type="checkbox" aria-label="AUTOINCREMENT"${def.ai ? ' checked' : ''}></td>` +
    `<td><input class="c-nn" type="checkbox" aria-label="NOT NULL"></td>` +
    `<td><input class="c-uq" type="checkbox" aria-label="UNIQUE"></td>` +
    `<td><input class="c-def" type="text" spellcheck="false" aria-label="${esc(t('defaultVal'))}"></td>` +
    `<td><button type="button" class="del c-rm" title="${esc(t('removeColumn'))}" aria-label="${esc(t('removeColumn'))}">✕</button></td>`;
}

function ntReadColumns() {
  return [...ntBody.rows].map(tr => ({
    name: tr.querySelector('.c-name').value.trim(),
    type: tr.querySelector('.c-type').value,
    pk: tr.querySelector('.c-pk').checked,
    ai: tr.querySelector('.c-ai').checked,
    nn: tr.querySelector('.c-nn').checked,
    uq: tr.querySelector('.c-uq').checked,
    def: tr.querySelector('.c-def').value.trim()
  }));
}

/* AUTOINCREMENT is only valid on a single INTEGER PRIMARY KEY column */
function ntSync() {
  const rows = [...ntBody.rows];
  const pkCount = rows.filter(tr => tr.querySelector('.c-pk').checked).length;
  for (const tr of rows) {
    const ai = tr.querySelector('.c-ai');
    const ok = pkCount === 1 && tr.querySelector('.c-pk').checked &&
      tr.querySelector('.c-type').value === 'INTEGER';
    ai.disabled = !ok;
    if (!ok) ai.checked = false;
  }
  $('nt-preview').textContent = ntBuildSql($('nt-name').value.trim() || '…',
    ntReadColumns().filter(c => c.name));
}

export function ntDefaultLiteral(c) {
  const v = c.def;
  if (/^[-+]?\d+(\.\d+)?$/.test(v) && c.type !== 'TEXT' && c.type !== 'BLOB') return v;
  if (/^(NULL|CURRENT_TIMESTAMP|CURRENT_DATE|CURRENT_TIME)$/i.test(v)) return v.toUpperCase();
  return "'" + v.replace(/'/g, "''") + "'";
}

function ntBuildSql(tableName, cols) {
  const pks = cols.filter(c => c.pk);
  const single = pks.length === 1;
  const lines = cols.map(c => {
    let s = qi(c.name) + ' ' + c.type;
    if (single && c.pk) {
      s += ' PRIMARY KEY';
      if (c.ai && c.type === 'INTEGER') s += ' AUTOINCREMENT';
    }
    if (c.nn) s += ' NOT NULL';
    if (c.uq && !c.pk) s += ' UNIQUE';
    if (c.def !== '') s += ' DEFAULT ' + ntDefaultLiteral(c);
    return s;
  });
  if (pks.length > 1) lines.push('PRIMARY KEY (' + pks.map(c => qi(c.name)).join(', ') + ')');
  return `CREATE TABLE ${qi(tableName)} (\n  ${lines.join(',\n  ')}\n);`;
}

function ntError(msg) {
  const el = $('nt-error');
  el.textContent = msg || '';
  el.hidden = !msg;
}

function openTableDialog() {
  if (!state.db) return;
  $('nt-name').value = '';
  ntBody.innerHTML = '';
  ntAddColumn({ name: 'id', type: 'INTEGER', pk: true, ai: true });
  ntAddColumn();
  ntError('');
  ntSync();
  $('table-dialog').showModal();
  $('nt-name').focus();
}

$('btn-new-table').addEventListener('click', openTableDialog);
$('nt-add-col').addEventListener('click', () => { ntAddColumn(); ntSync(); });
$('nt-cancel').addEventListener('click', () => $('table-dialog').close());
$('table-dialog').addEventListener('input', ntSync);
$('table-dialog').addEventListener('change', ntSync);

ntBody.addEventListener('click', e => {
  const rm = e.target.closest('button.c-rm');
  if (!rm) return;
  rm.closest('tr').remove();
  ntSync();
});

$('table-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('nt-name').value.trim();
  const cols = ntReadColumns().filter(c => c.name);
  if (!name) { ntError(t('needTableName')); return; }
  if (!cols.length) { ntError(t('needColumns')); return; }
  try {
    state.db.run(ntBuildSql(name, cols));
  } catch (err) {
    ntError(err.message);
    return;
  }
  $('table-dialog').close();
  refreshSchema();
  showObject(name, 'table');
  setStatus(() => t('tableCreated', name));
});
