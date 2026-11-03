import { csvInferType, detectDelim, parseCsv } from './csv.js';
import { showObject } from './data-view.js';
import { dbSignature, makeEmptyDb, useDatabase } from './database.js';
import { t } from './i18n.js';
import { refreshSchema } from './schema.js';
import { state } from './state.js';
import { setStatus } from './status.js';
import { $, esc, qi } from './util.js';

/* ---------- Importar CSV ---------- */

let csvText = '';
let csvBase = '';
let csvRows = [];

function csvError(msg) {
  const el = $('csv-error');
  el.textContent = msg || '';
  el.hidden = !msg;
}

function csvUpdate() {
  const sel = $('csv-delim').value;
  csvRows = parseCsv(csvText, sel === 'auto' ? detectDelim(csvText) : sel === 'tab' ? '\t' : sel);
  const header = $('csv-header').checked;
  const width = csvRows.reduce((m, r) => Math.max(m, r.length), 0);
  $('csv-newname-wrap').hidden = $('csv-target').value !== '';
  $('csv-info').textContent = csvRows.length
    ? t('csvInfo', csvRows.length - (header ? 1 : 0), width) : t('csvEmpty');
  $('csv-preview').innerHTML = '<table class="data">' + csvRows.slice(0, 6).map((r, i) =>
    '<tr>' + r.map(c => header && i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`).join('') + '</tr>'
  ).join('') + '</table>';
  csvError('');
}

export function importCsvFile(file) {
  if (!state.SQL) return;
  file.text().then(txt => {
    csvText = txt;
    csvBase = file.name.replace(/\.[^.]*$/, '');
    const tables = state.objects.filter(o => o.type === 'table');
    $('csv-target').innerHTML = `<option value="">${esc(t('csvNewTable'))}</option>` +
      tables.map(o => `<option value="${esc(o.name)}">${esc(o.name)}</option>`).join('');
    if (state.current && state.current.type === 'table') $('csv-target').value = state.current.name;
    $('csv-newname').value = csvBase;
    $('csv-delim').value = 'auto';
    $('csv-header').checked = true;
    csvUpdate();
    $('csv-dialog').showModal();
  }).catch(err => setStatus(() => t('csvReadFail', err.message), true));
}

$('btn-import-csv').addEventListener('click', () => $('csv-input').click());
$('csv-input').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (f) importCsvFile(f);
});
$('csv-dialog').addEventListener('change', csvUpdate);
$('csv-cancel').addEventListener('click', () => $('csv-dialog').close());

$('csv-form').addEventListener('submit', e => {
  e.preventDefault();
  const header = $('csv-header').checked;
  const data = header ? csvRows.slice(1) : csvRows;
  if (!data.length) { csvError(t('csvEmpty')); return; }
  const width = csvRows.reduce((m, r) => Math.max(m, r.length), 0);
  const names = header ? csvRows[0].map(x => x.trim()) : [];
  const target = $('csv-target').value;
  let table, cols, map, createSql = null;

  if (!target) {
    table = $('csv-newname').value.trim();
    if (!table) { csvError(t('needTableName')); return; }
    const seen = new Set();
    cols = Array.from({ length: width }, (_, i) => {
      const base = names[i] || 'column' + (i + 1);
      let n = base, k = 2;
      while (seen.has(n.toLowerCase())) n = base + '_' + k++;
      seen.add(n.toLowerCase());
      return n;
    });
    map = cols.map((_, i) => i);
    createSql = `CREATE TABLE ${qi(table)} (` +
      cols.map((n, i) => qi(n) + ' ' + csvInferType(data.map(r => r[i]))).join(', ') + ')';
  } else {
    table = target;
    const info = state.db.exec(`PRAGMA table_info(${qi(table)})`)[0].values.map(r => r[1]);
    cols = [];
    map = [];
    info.forEach((n, i) => {
      const j = header ? names.findIndex(x => x.toLowerCase() === n.toLowerCase()) : (i < width ? i : -1);
      if (j >= 0) { cols.push(n); map.push(j); }
    });
    if (!cols.length) { csvError(t('csvNoMatch')); return; }
  }

  // Sin base abierta: se crea una nueva, pero solo se activa si la importación sale bien
  let pending = null, baseSig = null;
  if (!state.db) {
    try { pending = makeEmptyDb(); } catch (err) { csvError(t('newDbFail', err.message)); return; }
    baseSig = dbSignature(pending);
  }
  const d = pending || state.db;

  let st = null;
  try {
    d.run('BEGIN');
    if (createSql) d.run(createSql);
    st = d.prepare(`INSERT INTO ${qi(table)} (${cols.map(c => qi(c)).join(', ')}) ` +
      `VALUES (${cols.map(() => '?').join(', ')})`);
    for (const r of data) st.run(map.map(i => (r[i] === undefined || r[i] === '' ? null : r[i])));
    st.free();
    st = null;
    d.run('COMMIT');
  } catch (err) {
    if (st) { try { st.free(); } catch (_) { /* ya liberado */ } }
    try { d.run('ROLLBACK'); } catch (_) { /* sin transacción activa */ }
    if (pending) pending.close();
    csvError(t('importFail', err.message));
    return;
  }
  $('csv-dialog').close();
  if (pending) {
    useDatabase(pending, (csvBase.replace(/[\\/:*?"<>|]/g, '_') || 'database') + '.sqlite');
    state.savedSignature = baseSig; // los datos importados aún no se han exportado
  }
  refreshSchema();
  showObject(table, 'table');
  setStatus(() => t('csvImported', data.length, table));
});
