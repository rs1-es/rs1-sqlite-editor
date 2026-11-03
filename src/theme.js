import { $ } from './util.js';

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
