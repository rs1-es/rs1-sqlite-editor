import { importCsvFile } from './csv-import.js';
import { t } from './i18n.js';
import { refreshSchema } from './schema.js';
import { state } from './state.js';
import { setStatus } from './status.js';
import { switchTab } from './tabs.js';
import { $ } from './util.js';

const SQLJS_PATH = 'lib/'; // folder with sql-wasm.js and sql-wasm.wasm (hosted on this server)

/* ---------- Initialization ---------- */

export async function init() {
  try {
    state.SQL = await initSqlJs({ locateFile: f => SQLJS_PATH + f });
    $('btn-new').disabled = false;
    $('btn-import-csv').disabled = false;
    setStatus(() => t('ready'));
  } catch (e) {
    setStatus(() => t('wasmFail', e.message), true);
  }
}

/* Makes a database (opened or new) the active one and resets the interface */
export function useDatabase(newDb, name) {
  if (state.db) state.db.close();
  state.db = newDb;
  state.savedSignature = dbSignature();
  state.fileName = name;
  $('db-name-text').textContent = name;
  $('db-name').title = name;
  $('db-name').hidden = false;
  state.current = null;
  state.addRowActive = false;
  state.addDraft = [];
  $('btn-export').disabled = false;
  $('btn-new-table').disabled = false;
  $('btn-import-csv').disabled = false;
  $('tab-data').disabled = false;
  $('tab-sql').disabled = false;
  refreshSchema();
  $('sidebar').classList.add('open');
  switchTab('data');
  $('welcome').hidden = false;
  $('table-view').hidden = true;
  $('sql-view').hidden = true;
}

function openFile(file) {
  return file.arrayBuffer().then(buf => {
    try {
      const data = new Uint8Array(buf);
      const newDb = new state.SQL.Database(data);
      // checks that it is a valid database before replacing the current one
      newDb.exec('SELECT 1 FROM sqlite_master LIMIT 1');
      useDatabase(newDb, file.name || 'base.sqlite');
      setStatus(() => t('loaded', state.fileName, state.objects.length));
    } catch (e) {
      setStatus(() => t('openFail', e.message), true);
    }
  });
}

/* ---------- New database ---------- */

export function makeEmptyDb() {
  const newDb = new state.SQL.Database();
  // Creating and dropping a temporary table forces the file to have a valid
  // SQLite header even if the user exports it without having created anything.
  newDb.run('CREATE TABLE _tmp(x); DROP TABLE _tmp;');
  return newDb;
}

function newDatabase() {
  if (!state.SQL) return;
  if (hasUnsavedChanges() && !confirm(t('confirmDiscard'))) return;
  let name = prompt(t('newDbPrompt'), t('newDbDefault'));
  if (name === null) return;
  name = name.trim().replace(/[\\/:*?"<>|]/g, '_') || t('newDbDefault');
  if (!/\.(sqlite3?|db3?)$/i.test(name)) name += '.sqlite';
  try {
    useDatabase(makeEmptyDb(), name);
    setStatus(() => t('newDbCreated', name));
  } catch (e) {
    setStatus(() => t('newDbFail', e.message), true);
  }
}

$('btn-new').addEventListener('click', newDatabase);

/* ---------- Open and export ---------- */

$('btn-open').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', e => {
  if (e.target.files[0]) openFile(e.target.files[0]);
  e.target.value = '';
});

document.addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('dragging'); });
document.addEventListener('dragleave', e => { if (e.target === document.documentElement) document.body.classList.remove('dragging'); });
document.addEventListener('drop', e => {
  e.preventDefault();
  document.body.classList.remove('dragging');
  const file = e.dataTransfer.files[0];
  if (file) { if (/\.(csv|tsv|txt)$/i.test(file.name)) importCsvFile(file); else openFile(file); }
});

$('btn-export').addEventListener('click', () => {
  try {
    const data = state.db.export();
    state.savedSignature = dbSignature(); // what was exported counts as saved
    const blob = new Blob([data], { type: 'application/x-sqlite3' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = state.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus(() => t('exported', state.fileName));
  } catch (e) {
    setStatus(() => t('exportFail', e.message), true);
  }
});

/* ---------- Unsaved changes warning ---------- */

/* Cheap signature of the DB state: rows modified by INSERT/UPDATE/DELETE,
   schema version (DDL) and user_version. Avoids exporting the whole DB to compare. */
export function dbSignature(d = state.db) {
  try {
    const r = d.exec(
      'SELECT total_changes(), (SELECT schema_version FROM pragma_schema_version), ' +
      '(SELECT user_version FROM pragma_user_version)');
    return r[0].values[0].join('|');
  } catch (e) {
    return null; // unknown: it will be treated as "with changes"
  }
}

function hasUnsavedChanges() {
  if (!state.db || state.savedSignature === null) return false;
  const sig = dbSignature();
  return sig === null || sig !== state.savedSignature;
}

window.addEventListener('beforeunload', e => {
  if (hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = t('unsavedWarning');
    return e.returnValue;
  }
});
