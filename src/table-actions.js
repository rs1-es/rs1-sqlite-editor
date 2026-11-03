import { showObject } from './data-view.js';
import { t } from './i18n.js';
import { refreshSchema } from './schema.js';
import { state } from './state.js';
import { setStatus } from './status.js';
import { $, qi } from './util.js';

/* ---------- Rename and drop tables / views ---------- */

$('btn-rename').addEventListener('click', () => {
  if (!state.current || state.current.type !== 'table') return;
  let n = prompt(t('renamePrompt'), state.current.name);
  if (n === null) return;
  n = n.trim();
  if (!n || n === state.current.name) return;
  try {
    state.db.run(`ALTER TABLE ${qi(state.current.name)} RENAME TO ${qi(n)}`);
  } catch (e) {
    setStatus(e.message, true);
    return;
  }
  refreshSchema();
  showObject(n, 'table');
  setStatus(() => t('tableRenamed', n));
});

$('btn-drop').addEventListener('click', () => {
  if (!state.current) return;
  const { name, type } = state.current;
  if (!confirm(t(type === 'view' ? 'confirmDropView' : 'confirmDropTable', name))) return;
  try {
    state.db.run(`DROP ${type === 'view' ? 'VIEW' : 'TABLE'} ${qi(name)}`);
  } catch (e) {
    setStatus(e.message, true);
    return;
  }
  refreshSchema();
  setStatus(() => t('objectDropped', name));
});
