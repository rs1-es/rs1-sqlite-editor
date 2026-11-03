import { state } from './state.js';
import { $ } from './util.js';

/* ---------- Pestañas ---------- */

export function switchTab(tab) {
  const isData = tab === 'data';
  $('tab-data').classList.toggle('active', isData);
  $('tab-sql').classList.toggle('active', !isData);
  $('table-view').hidden = isData ? !state.current : true;
  $('sql-view').hidden = isData;
  $('sql-view').style.display = isData ? 'none' : 'flex';
  $('welcome').hidden = isData ? !!state.current : true;
  if (!isData) $('sql-input').focus();
}

$('tab-data').addEventListener('click', () => switchTab('data'));
$('tab-sql').addEventListener('click', () => switchTab('sql'));
