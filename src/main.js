// modules that only register event handlers are imported for their side effects
import './csv-export.js';
import './csv-import.js';
import './edit-rows.js';
import './help.js';
import './new-table.js';
import './sql-console.js';
import './structure.js';
import './table-actions.js';
import './tabs.js';
import './theme.js';
import { fillFilterCols, renderBadge, renderRows } from './data-view.js';
import { init } from './database.js';
import { lang, t, toggleLang } from './i18n.js';
import { renderHelp } from './help.js';
import { renderSchema } from './schema.js';
import { state } from './state.js';
import { renderStatus } from './status.js';
import { $ } from './util.js';

function applyI18n() {
  document.documentElement.lang = lang;
  document.body.dataset.dragText = t('dragHint');
  // data-i18n-args: arguments (JSON) of texts generated at run time, such as SQL results
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerHTML = t(el.dataset.i18n, ...JSON.parse(el.dataset.i18nArgs || '[]'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  // data-i18n-label: accessible name (aria-label) for controls with no visible text or just a symbol
  document.querySelectorAll('[data-i18n-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
  $('btn-lang').textContent = lang === 'en' ? 'ES' : 'EN';
  // the accessible name must contain the visible text (WCAG 2.5.3)
  $('btn-lang').setAttribute('aria-label', `${$('btn-lang').textContent} – ${t('langTooltip')}`);
  renderStatus();
  renderHelp();
  if (state.db) {
    renderSchema();
    if (state.current) { fillFilterCols(); renderBadge(); renderRows(); }
  }
}

$('btn-lang').addEventListener('click', () => {
  toggleLang();
  applyI18n();
});

applyI18n();
init();
