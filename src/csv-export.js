import { toCsv } from './csv.js';
import { buildListQuery } from './data-view.js';
import { t } from './i18n.js';
import { saveBlob } from './save.js';
import { state } from './state.js';
import { setStatus } from './status.js';
import { $ } from './util.js';

/* ---------- CSV export ---------- */

export async function downloadCsv(name, columns, rows) {
  const blob = new Blob(['\uFEFF' + toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' });
  try {
    const r = await saveBlob(blob, name.replace(/[\\/:*?"<>|]/g, '_') + '.csv', 'text/csv', ['.csv']);
    if (r.status === 'cancelled') setStatus(() => t('saveCancelled'));
    else setStatus(() => t(r.status === 'saved' ? 'csvExported' : 'downloadStarted', r.name));
  } catch (e) {
    setStatus(() => t('exportFail', e.message), true);
  }
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
