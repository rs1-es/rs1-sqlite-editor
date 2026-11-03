// los módulos que solo registran manejadores de eventos se importan por sus efectos
import './csv-export.js';
import './csv-import.js';
import './edit-rows.js';
import './new-table.js';
import './sql-console.js';
import './structure.js';
import './table-actions.js';
import './tabs.js';
import './theme.js';
import { fillFilterCols, renderBadge, renderRows } from './data-view.js';
import { init } from './database.js';
import { lang, t, toggleLang } from './i18n.js';
import { renderSchema } from './schema.js';
import { state } from './state.js';
import { renderStatus } from './status.js';
import { $ } from './util.js';

function applyI18n() {
  document.documentElement.lang = lang;
  document.body.dataset.dragText = t('dragHint');
  // data-i18n-args: argumentos (JSON) de textos que se generan al ejecutar, como los resultados SQL
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerHTML = t(el.dataset.i18n, ...JSON.parse(el.dataset.i18nArgs || '[]'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  $('btn-lang').textContent = lang === 'en' ? 'ES' : 'EN';
  renderStatus();
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
