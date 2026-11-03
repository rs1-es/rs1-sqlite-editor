import { loadObjectMeta, renderRows } from './data-view.js';
import { t } from './i18n.js';
import { COL_TYPES, ntDefaultLiteral } from './new-table.js';
import { state } from './state.js';
import { setStatus } from './status.js';
import { $, displayDefault, esc, qi } from './util.js';

/* ---------- Structure: columns and indexes ---------- */

function structError(msg) {
  const el = $('struct-error');
  el.textContent = msg || '';
  el.hidden = !msg;
}

/* Header cell; an empty label (actions column) is kept for screen readers only */
function headerCell(x) {
  return x ? `<th>${esc(x)}</th>` : `<th><span class="sr-only">${esc(t('rowActions'))}</span></th>`;
}

function renderStructure() {
  const tbl = state.current.name;
  $('struct-title').textContent = t('structTitle', tbl);
  structError('');

  let h = '<div class="tbl-scroll"><table class="data"><thead><tr>' +
    [t('colName'), t('colType'), 'PK', 'NN', t('defaultVal'), '']
      .map(headerCell).join('') + '</tr></thead><tbody>';
  for (const c of state.columns) {
    h += `<tr><td>${esc(c.name)}</td><td>${esc(c.type || '')}</td>` +
      `<td>${c.pk ? '✓' : ''}</td><td>${c.notnull ? '✓' : ''}</td>` +
      `<td>${esc(displayDefault(c.dflt))}</td><td class="nowrap">` +
      `<button type="button" data-act="rn-col" data-col="${esc(c.name)}" title="${esc(t('renameBtn'))}" aria-label="${esc(t('renameBtn'))}">✎</button> ` +
      `<button type="button" class="del" data-act="drop-col" data-col="${esc(c.name)}" title="${esc(t('dropBtn'))}" aria-label="${esc(t('dropBtn'))}">✕</button>` +
      '</td></tr>';
  }
  $('struct-cols').innerHTML = h + '</tbody></table></div>';

  const il = state.db.exec(`PRAGMA index_list(${qi(tbl)})`);
  const idxs = il.length ? il[0].values : [];
  if (!idxs.length) {
    $('struct-idx').innerHTML = `<p class="muted">${esc(t('noIndexes'))}</p>`;
  } else {
    let ih = '<div class="tbl-scroll"><table class="data"><thead><tr>' +
      [t('idxName'), t('idxCols'), t('idxUnique'), '']
        .map(headerCell).join('') + '</tr></thead><tbody>';
    for (const r of idxs) {
      const info = state.db.exec(`PRAGMA index_info(${qi(r[1])})`);
      const cols = (info.length ? info[0].values : []).map(x => x[2] === null ? '(expr)' : x[2]).join(', ');
      ih += `<tr><td>${esc(r[1])}</td><td>${esc(cols)}</td><td>${r[2] ? '✓' : ''}</td><td class="nowrap">` +
        (r[3] === 'c'
          ? `<button type="button" class="del" data-act="drop-idx" data-idx="${esc(r[1])}" title="${esc(t('dropBtn'))}" aria-label="${esc(t('dropBtn'))}">✕</button>`
          : `<span class="muted">${esc(t('idxAuto'))}</span>`) + '</td></tr>';
    }
    $('struct-idx').innerHTML = ih + '</tbody></table></div>';
  }

  $('struct-newidx').innerHTML = '<div class="inline-form">' +
    `<input type="text" id="si-name" spellcheck="false" placeholder="${esc(t('indexNameOpt'))}">` +
    state.columns.map(c => `<label class="check inline"><input type="checkbox" class="si-col" value="${esc(c.name)}">${esc(c.name)}</label>`).join('') +
    '<label class="check inline"><input type="checkbox" id="si-uq">UNIQUE</label>' +
    `<button type="button" data-act="add-idx">${esc(t('createIndexBtn'))}</button></div>`;
}

/* Runs a structure statement; refreshes the view if it succeeds */
function structRun(sql) {
  try {
    state.db.run(sql);
  } catch (err) {
    structError(err.message);
    return false;
  }
  state.addRowActive = false;
  state.addDraft = [];
  loadObjectMeta();
  renderRows();
  renderStructure();
  setStatus(() => t('structUpdated'));
  return true;
}

$('sc-type').innerHTML = COL_TYPES.map(x => `<option>${x}</option>`).join('');

$('btn-structure').addEventListener('click', () => {
  if (!state.current || state.current.type !== 'table') return;
  renderStructure();
  $('struct-dialog').showModal();
});
$('struct-close').addEventListener('click', () => $('struct-dialog').close());

$('struct-dialog').addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const tbl = state.current.name;
  const col = b.dataset.col;
  switch (b.dataset.act) {
    case 'rn-col': {
      const n = prompt(t('renameColPrompt'), col);
      if (n === null || !n.trim() || n.trim() === col) return;
      structRun(`ALTER TABLE ${qi(tbl)} RENAME COLUMN ${qi(col)} TO ${qi(n.trim())}`);
      break;
    }
    case 'drop-col':
      if (confirm(t('confirmDropCol', col))) structRun(`ALTER TABLE ${qi(tbl)} DROP COLUMN ${qi(col)}`);
      break;
    case 'drop-idx':
      if (confirm(t('confirmDropIdx', b.dataset.idx))) structRun(`DROP INDEX ${qi(b.dataset.idx)}`);
      break;
    case 'add-col': {
      const name = $('sc-name').value.trim();
      if (!name) { structError(t('needColName')); return; }
      const c = { type: $('sc-type').value, def: $('sc-def').value.trim() };
      let sql = `ALTER TABLE ${qi(tbl)} ADD COLUMN ${qi(name)} ${c.type}`;
      if ($('sc-nn').checked) sql += ' NOT NULL';
      if (c.def !== '') sql += ' DEFAULT ' + ntDefaultLiteral(c);
      if (structRun(sql)) {
        $('sc-name').value = '';
        $('sc-def').value = '';
        $('sc-nn').checked = false;
      }
      break;
    }
    case 'add-idx': {
      const cols = [...document.querySelectorAll('#struct-newidx .si-col:checked')].map(x => x.value);
      if (!cols.length) { structError(t('needIndexCols')); return; }
      const name = $('si-name').value.trim() || `idx_${tbl}_${cols.join('_')}`;
      structRun(`CREATE ${$('si-uq').checked ? 'UNIQUE ' : ''}INDEX ${qi(name)} ON ${qi(tbl)} (${cols.map(qi).join(', ')})`);
      break;
    }
  }
});
