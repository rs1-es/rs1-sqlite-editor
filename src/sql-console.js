import { downloadCsv } from './csv-export.js';
import { loadObjectMeta, renderRows } from './data-view.js';
import { t } from './i18n.js';
import { setPageSize, sizeOptions } from './paging.js';
import { refreshSchema } from './schema.js';
import { state } from './state.js';
import { setStatus } from './status.js';
import { $, BLOB_TEXT, PAGE_SIZES, esc, rescuePagerFocus } from './util.js';

/* ---------- SQL console ---------- */

/* After running SQL: refreshes the schema and the open table/view (it may have changed) */
function refreshAfterSql() {
  refreshSchema();
  if (state.current) {
    state.addRowActive = false;
    state.addDraft = [];
    loadObjectMeta();
    renderRows();
  }
}

function totalChanges() {
  return state.db.exec('SELECT total_changes()')[0].values[0][0];
}

function runSQL() {
  const sql = $('sql-input').value.trim();
  const out = $('sql-results');
  if (!sql) return;
  out.innerHTML = '';
  try {
    const before = totalChanges();
    const results = state.db.exec(sql);
    const modified = totalChanges() - before;
    if (!results.length) {
      out.innerHTML = `<p class="msg ok" data-i18n="executed" data-i18n-args="[${modified}]">` +
        `${esc(t('executed', modified))}</p>`;
    } else {
      results.forEach((r, i) => {
        const head = document.createElement('div');
        head.className = 'result-head';
        const h = document.createElement('h2');
        h.dataset.i18n = 'resultN';
        h.dataset.i18nArgs = JSON.stringify([i + 1, r.values.length]);
        h.textContent = t('resultN', i + 1, r.values.length);
        const csvBtn = document.createElement('button');
        csvBtn.className = 'csv-export';
        csvBtn.dataset.i18n = 'exportCsv';
        csvBtn.dataset.i18nTitle = 'csvTooltip';
        csvBtn.textContent = t('exportCsv');
        csvBtn.title = t('csvTooltip');
        csvBtn.addEventListener('click', () =>
          downloadCsv(`${t('queryFile')}_${i + 1}`, r.columns, r.values));
        head.appendChild(h);
        head.appendChild(csvBtn);
        out.appendChild(head);
        out.appendChild(buildResultTable(r.columns, r.values));
      });
      if (modified > 0) {
        const p = document.createElement('p');
        p.className = 'msg ok';
        p.dataset.i18n = 'rowsAffected';
        p.dataset.i18nArgs = JSON.stringify([modified]);
        p.textContent = t('rowsAffected', modified);
        out.appendChild(p);
      }
    }
    refreshAfterSql();
    setStatus(() => t('sqlOk'));
  } catch (e) {
    const p = document.createElement('p');
    p.className = 'msg error';
    p.textContent = e.message;
    out.appendChild(p);
    refreshAfterSql(); // statements before the error may have been applied
    setStatus(() => t('sqlError'), true);
  }
}

/* SQL results table with column sorting and client-side pagination
   (db.exec already returns all rows). Returns a container with the table and the pager. */
function buildResultTable(cols, rows) {
  const wrap = document.createElement('div');
  const table = document.createElement('table');
  const pager = document.createElement('nav');
  pager.className = 'pager';
  pager.dataset.i18nLabel = 'paginationLabel';
  pager.setAttribute('aria-label', t('paginationLabel'));
  // title and aria-label are kept in sync with the language by applyI18n (data-i18n-title / data-i18n-label)
  const pgAttrs = key => `data-i18n-title="${key}" data-i18n-label="${key}" title="${esc(t(key))}" aria-label="${esc(t(key))}"`;
  pager.innerHTML =
    `<button class="pg-first" ${pgAttrs('pageFirst')}>«</button>` +
    `<button class="pg-prev" ${pgAttrs('pagePrev')}>‹</button>` +
    `<span class="pager-info"></span>` +
    `<button class="pg-next" ${pgAttrs('pageNext')}>›</button>` +
    `<button class="pg-last" ${pgAttrs('pageLast')}>»</button>` +
    `<select class="pg-size" ${pgAttrs('pageSizeLabel')}>${sizeOptions()}</select>`;
  const q = sel => pager.querySelector(sel);
  let p = 0;
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
    const sorted = sortIdx === -1 ? rows
      : rows.slice().sort((x, y) => dir * cmp(x[sortIdx], y[sortIdx]));
    const pages = Math.max(1, Math.ceil(sorted.length / state.pageSize));
    p = Math.min(Math.max(p, 0), pages - 1);
    pager.hidden = sorted.length <= PAGE_SIZES[0];
    q('.pager-info').textContent = `${p + 1} / ${pages}`;
    q('.pg-first').disabled = q('.pg-prev').disabled = p === 0;
    q('.pg-last').disabled = q('.pg-next').disabled = p >= pages - 1;
    rescuePagerFocus(q('.pg-first'), q('.pg-prev'), q('.pg-next'), q('.pg-last'));
    q('.pg-size').value = state.pageSize;
    for (const row of sorted.slice(p * state.pageSize, (p + 1) * state.pageSize)) {
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
    th.dataset.i18nTitle = 'sortHint';
    th.title = t('sortHint');
    th.tabIndex = 0;
    th.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); th.click(); }
    });
    th.addEventListener('click', () => {
      dir = sortIdx === idx ? -dir : 1;
      sortIdx = idx;
      for (const [i, cell] of [...thead.cells].entries()) {
        cell.classList.toggle('sorted', i === idx);
        cell.classList.toggle('asc', i === idx && dir === 1);
        cell.classList.toggle('desc', i === idx && dir === -1);
        if (i === idx) cell.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
        else cell.removeAttribute('aria-sort');
      }
      p = 0;
      fillBody();
    });
    thead.appendChild(th);
  });

  const goTo = n => { p = n; fillBody(); wrap.scrollIntoView({ block: 'nearest' }); };
  q('.pg-first').addEventListener('click', () => goTo(0));
  q('.pg-prev').addEventListener('click', () => goTo(p - 1));
  q('.pg-next').addEventListener('click', () => goTo(p + 1));
  q('.pg-last').addEventListener('click', () => goTo(Infinity));
  q('.pg-size').addEventListener('change', e => {
    setPageSize(Number(e.target.value));
    p = 0;
    fillBody();
  });

  fillBody();
  wrap.append(table, pager);
  return wrap;
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
