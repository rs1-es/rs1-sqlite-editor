import { state } from './state.js';
import { $ } from './util.js';

/* ---------- Tabs ---------- */

export function switchTab(tab, focusInput = true) {
  const isData = tab === 'data';
  for (const [id, on] of [['tab-data', isData], ['tab-sql', !isData]]) {
    $(id).classList.toggle('active', on);
    $(id).setAttribute('aria-selected', String(on));
    $(id).tabIndex = on ? 0 : -1;   // roving tabindex: only the selected tab is a tab stop
  }
  $('table-view').hidden = isData ? !state.current : true;
  $('sql-view').hidden = isData;
  $('sql-view').style.display = isData ? 'none' : 'flex';
  $('welcome').hidden = isData ? !!state.current : true;
  if (!isData && focusInput) $('sql-input').focus();
}

$('tab-data').addEventListener('click', () => switchTab('data'));
$('tab-sql').addEventListener('click', () => switchTab('sql'));

// arrow keys, Home and End move between tabs (ARIA tabs pattern); focus stays on the tab
$('main-tabs').addEventListener('keydown', e => {
  const target = { ArrowLeft: 'data', ArrowRight: 'sql', Home: 'data', End: 'sql' }[e.key];
  const btn = target && $('tab-' + target);
  if (!btn || btn.disabled) return;
  e.preventDefault();
  switchTab(target, false);
  btn.focus();
});
