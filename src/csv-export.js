import { toCsv } from './csv.js';
import { buildListQuery } from './data-view.js';
import { t } from './i18n.js';
import { state } from './state.js';
import { setStatus } from './status.js';
import { $ } from './util.js';

/* ---------- CSV export ---------- */

export function downloadCsv(name, columns, rows) {
  const blob = new Blob(['\uFEFF' + toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name.replace(/[\\/:*?"<>|]/g, '_') + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  setStatus(() => t('csvExported', a.download));
}

/* Listing of the current table or view (all rows) */
$('btn-export-csv').addEventListener('click', () => {
  if (!state.current) return;
  try {
    const q = buildListQuery(false);
    const res = state.db.exec(q.sql, q.params);
    if (!res.length) { setStatus(() => t(state.filterText ? 'noMatches' : 'noRows')); return; }
    downloadCsv(state.current.name, res[0].columns, res[0].values);
  } catch (e) {
    setStatus(() => t('exportFail', e.message), true);
  }
});
