import { importCsvFile } from './csv-import.js';
import { t } from './i18n.js';
import { refreshSchema } from './schema.js';
import { saveBlob } from './save.js';
import { state } from './state.js';
import { onStatusChange, setIdleProvider, setStatus } from './status.js';
import { switchTab } from './tabs.js';
import { keepHistoryAcross } from './undo.js';
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
  updateUnsavedIndicator();
  $('welcome').hidden = false;
  $('table-view').hidden = true;
  $('sql-view').hidden = true;
}

// confirmed: the user was already asked (Open button, before the file picker)
function openFile(file, confirmed = false) {
  if (!confirmed && hasUnsavedChanges() && !confirm(t('confirmDiscard'))) return Promise.resolve();
  return file.arrayBuffer().then(buf => {
    try {
      const data = new Uint8Array(buf);
      const newDb = new state.SQL.Database(data);
      // checks that it is a valid database before replacing the current one
      newDb.exec('SELECT 1 FROM sqlite_master LIMIT 1');
      useDatabase(newDb, file.name || 'base.sqlite');
      setStatus(() => t(state.objects.length === 1 ? 'loadedOne' : 'loaded', state.fileName, state.objects.length));
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

$('btn-open').addEventListener('click', () => {
  if (hasUnsavedChanges() && !confirm(t('confirmDiscard'))) return;
  $('file-input').click();
});
$('file-input').addEventListener('change', e => {
  if (e.target.files[0]) openFile(e.target.files[0], true);
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

$('btn-export').addEventListener('click', async () => {
  try {
    const wasDirty = hasUnsavedChanges();
    // db.export() reopens the database, which resets SQLite's change counter: tell the undo
    // history, and keep in mind that the signature is no longer comparable with the old one
    const data = keepHistoryAcross(() => state.db.export());
    const sig = dbSignature();
    const blob = new Blob([data], { type: 'application/x-sqlite3' });
    const r = await saveBlob(blob, state.fileName, 'application/x-sqlite3', ['.sqlite', '.sqlite3', '.db', '.db3']);
    if (r.status === 'cancelled') {
      // nothing was saved: if there were changes, they must keep counting as unsaved even
      // though the change counter was reset by the export
      if (wasDirty) state.savedSignature = UNSAVED;
      setStatus(() => t('saveCancelled'));
      return;
    }
    state.savedSignature = sig; // what was exported counts as saved
    setStatus(() => t(r.status === 'saved' ? 'exported' : 'downloadStarted', r.name));
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

const UNSAVED = '!unsaved'; // never equal to a real signature
const BASE_TITLE = document.title;

/* Shows whether there are changes that have not been exported: badge next to the database
   name, highlighted Export button and a mark in the tab title (never colour alone) */
export function updateUnsavedIndicator() {
  const dirty = !!state.db && hasUnsavedChanges();
  $('db-unsaved').hidden = !dirty;
  const b = $('btn-export');
  b.classList.toggle('dirty', dirty);
  if (dirty) {
    b.title = t('unsavedTip');
    b.setAttribute('aria-label', `${t('exportBtn')} – ${t('unsavedBadge')}`); // keeps the visible text in the name
  } else {
    b.title = t('exportBtn');
    b.removeAttribute('aria-label');
  }
  document.title = dirty ? '• ' + BASE_TITLE : BASE_TITLE;
}

onStatusChange(updateUnsavedIndicator);

// resting line of the status bar: summary of the open database
setIdleProvider(() => {
  if (!state.db) return t('ready');
  const n = state.objects.length;
  return t(n === 1 ? 'idleDbOne' : 'idleDb', state.fileName, n) + (hasUnsavedChanges() ? t('idleUnsaved') : '');
});

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
