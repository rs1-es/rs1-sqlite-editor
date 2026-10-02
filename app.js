'use strict';

const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/';
const PAGE_SIZE = 500;
const BLOB_TEXT = '[blob]';

const $ = id => document.getElementById(id);

let SQL = null;
let db = null;
let fileName = 'export.sqlite';
let originalData = null; // contenido original de la BD para detectar cambios sin guardar
let objects = [];            // [{name, type}]
let current = null;          // {name, type}
let columns = [];            // columnas del objeto actual
let page = 0;
let totalRows = 0;
let hasRowid = false;
let sortCol = null;          // columna por la que se ordena la vista de datos
let sortDir = 'ASC';
let addRowActive = false;    // fila "nuevo registro" en curso (aún sin insertar)
let addDraft = [];           // valores escritos en la fila nueva

const qi = n => '"' + String(n).replace(/"/g, '""') + '"';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- Internacionalización ---------- */

const I18N = {
  en: {
    ready: 'Ready. Open a .sqlite or .db file',
    wasmFail: 'Could not load sql.js (is there an internet connection?): {0}',
    loaded: '{0} loaded ({1} objects)',
    openFail: 'Could not open the file: {0}',
    tables: 'Tables',
    views: 'Views',
    noTables: 'No tables',
    noViews: 'No views',
    table: 'table',
    view: 'view',
    noRows: 'No rows.',
    pageInfo: 'Page {0} of {1} · {2} rows',
    cellUpdated: 'Cell updated.',
    rowAdded: 'Row added. Double-click a cell to edit it.',
    addFail: 'Could not insert the row: {0}',
    confirmAdd: 'Insert row',
    cancelAdd: 'Cancel',
    notNullHint: 'NOT NULL column: a value is required',
    confirmDelete: 'Delete this row?',
    rowDeleted: 'Row deleted.',
    executed: 'Executed. Rows affected: {0}',
    rowsAffected: 'Rows affected: {0}',
    resultN: 'Result {0} — {1} row(s)',
    sqlOk: 'Query executed. Changes are in memory; use Export to save them.',
    sqlError: 'Query error.',
    exported: 'Database exported as {0}',
    exportFail: 'Export error: {0}',
    exportCsv: 'Export CSV',
    csvTooltip: 'Download the current listing as a CSV file',
    csvExported: 'CSV exported as {0}',
    sortHint: 'Sort by this column',
    // HTML
    openBtn: 'Open database',
    exportBtn: 'Export',
    tabData: 'Data',
    tabSql: 'SQL',
    welcome1: 'Drop a <b>.sqlite / .db</b> file here or click <b>Open database</b>.',
    welcome2: 'Changes are kept in memory; use <b>Export</b> to download the modified database.',
    addRow: '+ Add row',
    readonlyNote: 'Read-only object: views and WITHOUT ROWID tables cannot be edited.',
    prev: 'Prev',
    next: 'Next',
    sqlPlaceholder: 'Write your SQL commands here, e.g.:\nSELECT * FROM table LIMIT 10;',
    runBtn: 'Run (Ctrl+Enter)',
    clearBtn: 'Clear',
    sqlHint: 'You can separate multiple statements with “;”.',
    footerInfo: 'This web page was created with the help of artificial intelligence. Contact: <a href="mailto:admin@rs1.es">admin@rs1.es</a>',
    privacyNote: '🔒 Your databases are processed entirely in your browser. No file is ever uploaded to any server.',
    unsavedWarning: 'If you leave without exporting, the changes made to the database will be lost.',
    dragHint: 'Drop the file to open the database',
    themeTooltip: 'Toggle dark / light mode',
  },
  es: {
    ready: 'Listo. Abre un archivo .sqlite o .db',
    wasmFail: 'No se pudo cargar sql.js (¿hay conexión a internet?): {0}',
    loaded: '{0} cargada ({1} objetos)',
    openFail: 'No se pudo abrir el archivo: {0}',
    tables: 'Tablas',
    views: 'Vistas',
    noTables: 'Sin tablas',
    noViews: 'Sin vistas',
    table: 'tabla',
    view: 'vista',
    noRows: 'Sin registros.',
    pageInfo: 'Página {0} de {1} · {2} filas',
    cellUpdated: 'Celda actualizada.',
    rowAdded: 'Registro añadido. Haz doble clic en una celda para editarla.',
    addFail: 'No se pudo insertar el registro: {0}',
    confirmAdd: 'Insertar registro',
    cancelAdd: 'Cancelar',
    notNullHint: 'Columna NOT NULL: hay que indicar un valor',
    confirmDelete: '¿Eliminar este registro?',
    rowDeleted: 'Registro eliminado.',
    executed: 'Ejecutado. Filas afectadas: {0}',
    rowsAffected: 'Filas afectadas: {0}',
    resultN: 'Resultado {0} — {1} fila(s)',
    sqlOk: 'Consulta ejecutada. Los cambios están en memoria; usa Exportar para guardarlos.',
    sqlError: 'Error en la consulta.',
    exported: 'Base exportada como {0}',
    exportFail: 'Error al exportar: {0}',
    exportCsv: 'Exportar CSV',
    csvTooltip: 'Descargar el listado actual como archivo CSV',
    csvExported: 'CSV exportado como {0}',
    sortHint: 'Ordenar por esta columna',
    // HTML
    openBtn: 'Abrir base de datos',
    exportBtn: 'Exportar',
    tabData: 'Datos',
    tabSql: 'SQL',
    welcome1: 'Arrastra un archivo <b>.sqlite / .db</b> aquí o pulsa <b>Abrir base de datos</b>.',
    welcome2: 'Los cambios se guardan en memoria; usa <b>Exportar</b> para descargar la base modificada.',
    addRow: '+ Añadir registro',
    readonlyNote: 'Objeto de solo lectura: las vistas y las tablas WITHOUT ROWID no se pueden editar.',
    prev: 'Anterior',
    next: 'Siguiente',
    sqlPlaceholder: 'Escribe aquí tus comandos SQL, por ejemplo:\nSELECT * FROM tabla LIMIT 10;',
    runBtn: 'Ejecutar (Ctrl+Enter)',
    clearBtn: 'Limpiar',
    sqlHint: 'Puedes separar varias sentencias con «;».',
    footerInfo: 'Esta página web ha sido creada con ayuda de la inteligencia artificial. Contacto: <a href="mailto:admin@rs1.es">admin@rs1.es</a>',
    privacyNote: '🔒 Tus bases de datos se procesan íntegramente en tu navegador. Ningún archivo se sube a ningún servidor.',
    unsavedWarning: 'Si sales sin exportar, se perderán los cambios efectuados en la base de datos.',
    dragHint: 'Suelta el archivo para abrir la base de datos',
    themeTooltip: 'Cambiar modo oscuro / claro',
  }
};

let lang = localStorage.getItem('rs1-lang') || 'en';
let lastStatus = null;

function t(key, ...args) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  args.forEach((a, i) => { s = s.split('{' + i + '}').join(a); });
  return s;
}

function setStatus(source, isError = false) {
  lastStatus = { source, isError };
  renderStatus();
}

function renderStatus() {
  const el = $('status');
  if (!lastStatus) { el.textContent = ''; el.classList.remove('error'); return; }
  const msg = typeof lastStatus.source === 'function' ? lastStatus.source() : lastStatus.source;
  el.textContent = msg;
  el.classList.toggle('error', lastStatus.isError);
}

function applyI18n() {
  document.documentElement.lang = lang;
  document.body.dataset.dragText = t('dragHint');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  $('btn-lang').textContent = lang === 'en' ? 'ES' : 'EN';
  renderStatus();
  if (db) {
    renderSchema();
    if (current) renderRows();
  }
}

$('btn-lang').addEventListener('click', () => {
  lang = lang === 'en' ? 'es' : 'en';
  localStorage.setItem('rs1-lang', lang);
  applyI18n();
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('btn-theme').textContent = theme === 'dark' ? '☀️' : '🌙';
}

applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

$('btn-theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('rs1-theme', next);
  applyTheme(next);
});

/* ---------- Inicialización ---------- */

async function init() {
  try {
    SQL = await initSqlJs({ locateFile: f => CDN + f });
    setStatus(() => t('ready'));
  } catch (e) {
    setStatus(() => t('wasmFail', e.message), true);
  }
}

function openFile(file) {
  return file.arrayBuffer().then(buf => {
    try {
      if (db) db.close();
      originalData = new Uint8Array(buf);
      db = new SQL.Database(originalData);
      fileName = file.name || 'base.sqlite';
      current = null;
      $('btn-export').disabled = false;
      $('tab-data').disabled = false;
      $('tab-sql').disabled = false;
      refreshSchema();
      $('sidebar').classList.add('open');
      switchTab('data');
      $('welcome').hidden = false;
      $('table-view').hidden = true;
      $('sql-view').hidden = true;
      setStatus(() => t('loaded', fileName, objects.length));
    } catch (e) {
      setStatus(() => t('openFail', e.message), true);
    }
  });
}

/* ---------- Esquema (tablas y vistas) ---------- */

function refreshSchema() {
  const res = db.exec(
    "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') " +
    "AND name NOT LIKE 'sqlite_%' ORDER BY lower(name)");
  objects = res.length ? res[0].values.map(r => ({ name: r[0], type: r[1] })) : [];

  if (current && !objects.some(o => o.name === current.name && o.type === current.type)) {
    current = null;
    addRowActive = false;
    addDraft = [];
    $('table-view').hidden = true;
    $('welcome').hidden = false;
  }
  renderSchema();
}

function renderSchema() {
  const tables = objects.filter(o => o.type === 'table');
  const views = objects.filter(o => o.type === 'view');
  const item = o =>
    `<li data-name="${esc(o.name)}" data-type="${o.type}" ` +
    `class="${current && current.name === o.name ? 'active' : ''}">` +
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

/* ---------- Vista de datos ---------- */

function showObject(name, type) {
  current = { name, type };
  page = 0;
  sortCol = null;
  sortDir = 'ASC';
  addRowActive = false;
  addDraft = [];
  try {
    const info = db.exec(`PRAGMA table_info(${qi(name)})`);
    columns = info.length ? info[0].values.map(r =>
      ({ name: r[1], type: r[2], notnull: r[3], dflt: r[4] })) : [];
  } catch (e) {
    columns = [];
  }
  try {
    db.exec(`SELECT rowid FROM ${qi(name)} LIMIT 1`);
    hasRowid = true;
  } catch (e) {
    hasRowid = false;
  }
  totalRows = db.exec(`SELECT COUNT(*) FROM ${qi(name)}`)[0].values[0][0];

  $('table-title').textContent = name;
  $('table-badge').textContent = t(type === 'view' ? 'view' : 'table');
  $('btn-add-row').hidden = type === 'view' || !hasRowid;
  $('readonly-note').hidden = !(type === 'view' || !hasRowid);
  $('welcome').hidden = true;
  $('sql-view').hidden = true;
  $('table-view').hidden = false;
  switchTab('data');
  renderSchema();
  renderRows();
}

function renderRows() {
  const container = $('table-container');
  const editable = current.type === 'table' && hasRowid;

  try {
    const orderBy = sortCol
      ? ` ORDER BY ${sortCol === 'rowid' ? 'rowid' : qi(sortCol)} ${sortDir}` : '';
    const res = db.exec(
      `SELECT ${hasRowid ? 'rowid, ' : ''}* FROM ${qi(current.name)}${orderBy} ` +
      `LIMIT ${PAGE_SIZE} OFFSET ${page * PAGE_SIZE}`);
    const rows = res.length ? res[0].values : [];

    const thClass = col =>
      'sortable' + (sortCol === col ? ` sorted ${sortDir === 'ASC' ? 'asc' : 'desc'}` : '');

    let html = '<table class="data"><thead><tr>';
    if (hasRowid) {
      html += `<th class="${thClass('rowid')}" data-sort="rowid" title="${esc(t('sortHint'))}">` +
        `rowid<span class="sort-arrow"></span></th>`;
    }
    for (const c of columns) {
      html += `<th class="${thClass(c.name)}" data-sort="${esc(c.name)}" title="${esc(t('sortHint'))}">` +
        `${esc(c.name)}<small>${esc(c.type || '')}</small><span class="sort-arrow"></span></th>`;
    }
    html += editable ? '<th></th></tr></thead><tbody>' : '</tr></thead><tbody>';

    for (const row of rows) {
      let i = 0;
      html += '<tr>';
      if (hasRowid) html += `<td class="rowid">${row[i++]}</td>`;
      for (const c of columns) {
        const v = row[i++];
        if (v === null || v === undefined) {
          html += `<td class="cell" data-col="${esc(c.name)}"><span class="null">NULL</span></td>`;
        } else if (v instanceof Uint8Array) {
          html += `<td class="cell" data-col="${esc(c.name)}"><span class="blob">${BLOB_TEXT} (${v.length} B)</span></td>`;
        } else {
          html += `<td class="cell" data-col="${esc(c.name)}" ${editable ? '' : 'data-locked="1"'}>${esc(v)}</td>`;
        }
      }
      if (editable) {
        html += `<td><button class="del" data-rowid="${row[0]}" title="Eliminar registro">✕</button></td>`;
      }
      html += '</tr>';
    }

    if (addRowActive && editable) {
      html += '<tr class="add-row">';
      if (hasRowid) html += '<td class="rowid">+</td>';
      columns.forEach((c, i) => {
        const req = c.notnull && c.dflt == null;
        const ph = req ? '' : displayDefault(c.dflt);
        html += `<td class="cell add-cell${req ? ' req' : ''}">` +
          `<input data-idx="${i}" value="${esc(addDraft[i] || '')}"` +
          (ph ? ` placeholder="${esc(ph)}"` : '') +
          (req ? ` title="${esc(t('notNullHint'))}" aria-required="true"` : '') +
          '></td>';
      });
      html += `<td class="add-actions">` +
        `<button class="confirm-add" title="${esc(t('confirmAdd'))}">✓</button>` +
        `<button class="cancel-add" title="${esc(t('cancelAdd'))}">✕</button></td>`;
      html += '</tr>';
    }

    html += rows.length ? '</tbody></table>' : `</tbody></table><p class="muted">${esc(t('noRows'))}</p>`;
    container.innerHTML = html;

    const pages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    $('page-info').textContent = t('pageInfo', page + 1, pages, totalRows);
    $('btn-prev').disabled = page === 0;
    $('btn-next').disabled = page >= pages - 1;
  } catch (e) {
    container.innerHTML = `<p class="error">${esc(e.message)}</p>`;
  }
}

/* Edición de celdas (doble clic) */

const tableContainer = $('table-container');

tableContainer.addEventListener('dblclick', e => {
  const td = e.target.closest('td.cell');
  if (!td || td.dataset.locked || current.type !== 'table' || !hasRowid) return;
  td.dataset.original = td.textContent;
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
    td.innerHTML = newVal ? esc(newVal) : '<span class="null">NULL</span>';
    return;
  }
  if (newVal === td.dataset.original) return;
  commitCell(td, newVal);
});

function commitCell(td, newVal) {
  const rowid = td.closest('tr').querySelector('button.del').dataset.rowid;
  const col = td.dataset.col;
  try {
    db.run(
      `UPDATE ${qi(current.name)} SET ${qi(col)} = ? WHERE rowid = ?`,
      [newVal === '' ? null : newVal, Number(rowid)]);
    setStatus(() => t('cellUpdated'));
    renderRows();
  } catch (e) {
    setStatus(e.message, true);
    renderRows();
  }
}

/* Añadir y eliminar registros */

$('btn-add-row').addEventListener('click', () => {
  if (!current || current.type !== 'table' || !hasRowid) return;
  if (addRowActive) {
    const first = tableContainer.querySelector('tr.add-row input');
    if (first) first.focus();
    return;
  }
  addRowActive = true;
  addDraft = [];
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
      const c = columns[Number(inp.dataset.idx)];
      if (!c) continue;
      cols.push(qi(c.name));
      vals.push(inp.value);
    }
  }
  try {
    if (cols.length) {
      db.run(
        `INSERT INTO ${qi(current.name)} (${cols.join(', ')}) ` +
        `VALUES (${cols.map(() => '?').join(', ')})`, vals);
    } else {
      db.run(`INSERT INTO ${qi(current.name)} DEFAULT VALUES`);
    }
    addRowActive = false;
    addDraft = [];
    totalRows++;
    page = Math.floor((totalRows - 1) / PAGE_SIZE);
    renderRows();
    setStatus(() => t('rowAdded'));
  } catch (e) {
    // la fila de borrador se mantiene con los valores para poder corregirlos
    setStatus(() => t('addFail', e.message), true);
  }
}

function cancelAddRow() {
  addRowActive = false;
  addDraft = [];
  renderRows();
}

/* Valor por defecto (según PRAGMA table_info) para mostrar como pista */
function displayDefault(d) {
  if (d === null || d === undefined) return '';
  const s = String(d);
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  return s.toUpperCase() === 'NULL' ? '' : s;
}

tableContainer.addEventListener('input', e => {
  const inp = e.target.closest('tr.add-row input');
  if (inp) addDraft[Number(inp.dataset.idx)] = inp.value;
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
    if (sortCol === col) sortDir = sortDir === 'ASC' ? 'DESC' : 'ASC';
    else { sortCol = col; sortDir = 'ASC'; }
    renderRows();
    return;
  }
  const btn = e.target.closest('button.del');
  if (!btn) return;
  if (!confirm(t('confirmDelete'))) return;
  try {
    db.run(`DELETE FROM ${qi(current.name)} WHERE rowid = ?`, [Number(btn.dataset.rowid)]);
    totalRows--;
    page = Math.min(page, Math.max(0, Math.ceil(totalRows / PAGE_SIZE) - 1));
    renderRows();
    setStatus(() => t('rowDeleted'));
  } catch (err) {
    setStatus(err.message, true);
  }
});

$('btn-prev').addEventListener('click', () => { if (page > 0) { page--; renderRows(); } });
$('btn-next').addEventListener('click', () => {
  if (page < Math.ceil(totalRows / PAGE_SIZE) - 1) { page++; renderRows(); }
});

/* ---------- Consola SQL ---------- */

function runSQL() {
  const sql = $('sql-input').value.trim();
  const out = $('sql-results');
  if (!sql) return;
  out.innerHTML = '';
  try {
    const results = db.exec(sql);
    const modified = db.getRowsModified();
    if (!results.length) {
      out.innerHTML = `<p class="msg ok">${esc(t('executed', modified))}</p>`;
    } else {
      results.forEach((r, i) => {
        const head = document.createElement('div');
        head.className = 'result-head';
        const h = document.createElement('h4');
        h.textContent = t('resultN', i + 1, r.values.length);
        const csvBtn = document.createElement('button');
        csvBtn.className = 'csv-btn';
        csvBtn.textContent = 'CSV';
        csvBtn.title = t('csvTooltip');
        csvBtn.addEventListener('click', () =>
          downloadCsv(`consulta_${i + 1}`, r.columns, r.values));
        head.appendChild(h);
        head.appendChild(csvBtn);
        out.appendChild(head);
        out.appendChild(buildResultTable(r.columns, r.values));
      });
      const p = document.createElement('p');
      p.className = 'msg ok';
      p.textContent = t('rowsAffected', modified);
      out.appendChild(p);
    }
    refreshSchema();
    setStatus(() => t('sqlOk'));
  } catch (e) {
    const p = document.createElement('p');
    p.className = 'msg error';
    p.textContent = e.message;
    out.appendChild(p);
    setStatus(() => t('sqlError'), true);
  }
}

/* ---------- Exportación CSV ---------- */

function toCsv(columns, rows) {
  const cell = v => {
    if (v === null || v === undefined || v instanceof Uint8Array) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [columns.map(cell).join(',')];
  for (const row of rows) lines.push(row.map(cell).join(','));
  return lines.join('\r\n') + '\r\n';
}

function downloadCsv(name, columns, rows) {
  const blob = new Blob(['\uFEFF' + toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name.replace(/[\\/:*?"<>|]/g, '_') + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  setStatus(() => t('csvExported', a.download));
}

/* Listado de la tabla o vista actual (todas las filas) */
$('btn-export-csv').addEventListener('click', () => {
  if (!current) return;
  try {
    const res = db.exec(`SELECT * FROM ${qi(current.name)}`);
    if (!res.length) { setStatus(() => t('noRows')); return; }
    downloadCsv(current.name, res[0].columns, res[0].values);
  } catch (e) {
    setStatus(() => t('exportFail', e.message), true);
  }
});

function buildResultTable(cols, rows) {
  const table = document.createElement('table');
  table.className = 'data';
  const thead = table.createTHead().insertRow();
  let sortIdx = -1;
  let dir = 1;

  const cmp = (a, b) => {
    const aNull = a === null || a === undefined;
    const bNull = b === null || b === undefined;
    if (aNull || bNull) return aNull && bNull ? 0 : (aNull ? -1 : 1);
    if (a instanceof Uint8Array || b instanceof Uint8Array) return 0;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), undefined,
      { numeric: true, sensitivity: 'base' });
  };

  const fillBody = () => {
    const old = table.tBodies[0];
    if (old) old.remove();
    const tbody = table.createTBody();
    const data = sortIdx === -1 ? rows
      : rows.slice().sort((x, y) => dir * cmp(x[sortIdx], y[sortIdx]));
    for (const row of data) {
      const tr = tbody.insertRow();
      for (const v of row) {
        const td = tr.insertCell();
        if (v === null || v === undefined) {
          td.innerHTML = '<span class="null">NULL</span>';
        } else if (v instanceof Uint8Array) {
          td.innerHTML = `<span class="blob">${BLOB_TEXT} (${v.length} B)</span>`;
        } else {
          td.textContent = v;
        }
      }
    }
  };

  cols.forEach((c, idx) => {
    const th = document.createElement('th');
    th.textContent = c;
    th.classList.add('sortable');
    th.title = t('sortHint');
    th.addEventListener('click', () => {
      dir = sortIdx === idx ? -dir : 1;
      sortIdx = idx;
      for (const [i, cell] of [...thead.cells].entries()) {
        cell.classList.toggle('sorted', i === idx);
        cell.classList.toggle('asc', i === idx && dir === 1);
        cell.classList.toggle('desc', i === idx && dir === -1);
      }
      fillBody();
    });
    thead.appendChild(th);
  });

  fillBody();
  return table;
}

$('btn-run').addEventListener('click', runSQL);

$('btn-clear-sql').addEventListener('click', () => {
  $('sql-input').value = '';
  $('sql-results').innerHTML = '';
  $('sql-input').focus();
});
$('sql-input').addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runSQL(); }
});

/* ---------- Pestañas ---------- */

function switchTab(tab) {
  const isData = tab === 'data';
  $('tab-data').classList.toggle('active', isData);
  $('tab-sql').classList.toggle('active', !isData);
  $('table-view').hidden = isData ? !current : true;
  $('sql-view').hidden = isData;
  $('sql-view').style.display = isData ? 'none' : 'flex';
  $('welcome').hidden = isData ? !!current : true;
  if (!isData) $('sql-input').focus();
}

$('tab-data').addEventListener('click', () => switchTab('data'));
$('tab-sql').addEventListener('click', () => switchTab('sql'));

/* ---------- Abrir y exportar ---------- */

$('btn-open').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', e => {
  if (e.target.files[0]) openFile(e.target.files[0]);
  e.target.value = '';
});

document.addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('dragging'); });
document.addEventListener('dragleave', e => { if (e.target === document.documentElement) document.body.classList.remove('dragging'); });
document.addEventListener('drop', e => {
  e.preventDefault();
  document.body.classList.remove('dragging');
  const file = e.dataTransfer.files[0];
  if (file) openFile(file);
});

$('btn-export').addEventListener('click', () => {
  try {
    const data = db.export();
    originalData = data; // lo exportado cuenta como guardado
    const blob = new Blob([data], { type: 'application/x-sqlite3' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus(() => t('exported', fileName));
  } catch (e) {
    setStatus(() => t('exportFail', e.message), true);
  }
});

/* ---------- Aviso de cambios sin guardar ---------- */

function hasUnsavedChanges() {
  if (!db || !originalData) return false;
  const cur = db.export();
  if (cur.length !== originalData.length) return true;
  for (let i = 0; i < cur.length; i++) {
    if (cur[i] !== originalData[i]) return true;
  }
  return false;
}

window.addEventListener('beforeunload', e => {
  if (hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = t('unsavedWarning');
    return e.returnValue;
  }
});

applyI18n();
init();
