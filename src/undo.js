import { dbSignature } from './database.js';
import { renderRows, showObject } from './data-view.js';
import { t } from './i18n.js';
import { state } from './state.js';
import { setStatus } from './status.js';
import { $, qi } from './util.js';

/* Undo / redo of row edits (cell edit, add row, delete row).
   Each entry stores the full image of the row before and after the change, so undoing
   is an UPDATE, INSERT or DELETE by rowid. The history is only trusted while the database
   is exactly as the last tracked operation left it (same object and same signature);
   any other change (SQL tab, structure, CSV import…) discards it. */

const MAX_HISTORY = 100;
let undoStack = [];
let redoStack = [];
let trackedDb = null;
let trackedSig = null;

function clearHistory() {
  undoStack = [];
  redoStack = [];
  updateUndoButtons();
}

// Drops the history if something changed the database outside of the tracked operations
function checkValid() {
  if (trackedDb !== state.db || dbSignature() !== trackedSig) {
    undoStack = [];
    redoStack = [];
    trackedDb = state.db;
    trackedSig = dbSignature();
  }
}

/* Runs fn (db.export(), which resets the change counter) without invalidating the history */
export function keepHistoryAcross(fn) {
  checkValid();
  const result = fn();
  trackedSig = dbSignature();
  updateUndoButtons();
  return result;
}

const tableCols = table =>
  state.db.exec(`PRAGMA table_info(${qi(table)})`)[0].values.map(r => r[1]);

function readRow(table, rowid) {
  const cols = tableCols(table);
  const res = state.db.exec(
    `SELECT ${cols.map(qi).join(', ')} FROM ${qi(table)} WHERE rowid = ?`, [rowid]);
  return res.length ? { cols, vals: res[0].values[0] } : null;
}

const totalChanges = () => state.db.exec('SELECT total_changes()')[0].values[0][0];

/* Runs `fn` (which performs one INSERT/UPDATE/DELETE of a single row) and records it.
   rowid is null for an INSERT (taken from last_insert_rowid()). */
export function trackRowChange(table, rowid, kind, fn) {
  checkValid();
  const before = rowid == null ? null : readRow(table, rowid);
  const c0 = totalChanges();
  fn();
  if (rowid == null) rowid = state.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  const after = readRow(table, rowid);
  // triggers or cascades touched more rows, or the primary key (rowid) changed: not undoable
  const ok = totalChanges() - c0 === 1 && (kind === 'delete' ? !after : !!after);
  if (ok) {
    undoStack.push({ table, rowid, before, after });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
  } else {
    undoStack = [];
    redoStack = [];
  }
  trackedSig = dbSignature();
  updateUndoButtons();
}

function applyImage(table, rowid, from, to) {
  const d = state.db;
  if (!to) {
    d.run(`DELETE FROM ${qi(table)} WHERE rowid = ?`, [rowid]);
  } else if (!from) {
    d.run(`INSERT INTO ${qi(table)} (rowid, ${to.cols.map(qi).join(', ')}) ` +
      `VALUES (?, ${to.cols.map(() => '?').join(', ')})`, [rowid, ...to.vals]);
  } else {
    d.run(`UPDATE ${qi(table)} SET ${to.cols.map(c => qi(c) + ' = ?').join(', ')} WHERE rowid = ?`,
      [...to.vals, rowid]);
  }
}

function move(from, to, backwards) {
  checkValid();
  const e = from.pop();
  if (!e) {
    setStatus(() => t(backwards ? 'nothingToUndo' : 'nothingToRedo'));
    updateUndoButtons();
    return;
  }
  try {
    if (backwards) applyImage(e.table, e.rowid, e.after, e.before);
    else applyImage(e.table, e.rowid, e.before, e.after);
  } catch (err) {
    clearHistory();
    setStatus(() => t('undoFail', err.message), true);
    return;
  }
  to.push(e);
  trackedSig = dbSignature();
  if (state.current && state.current.name === e.table && state.current.type === 'table') renderRows();
  else showObject(e.table, 'table');
  setStatus(() => t(backwards ? 'undone' : 'redone'));
  updateUndoButtons();
  // a button that just became disabled must not keep (and lose) keyboard focus
  const a = document.activeElement;
  if (a && a.disabled && (a.id === 'btn-undo' || a.id === 'btn-redo')) {
    $(backwards ? 'btn-redo' : 'btn-undo').focus();
  }
}

export const undo = () => move(undoStack, redoStack, true);
export const redo = () => move(redoStack, undoStack, false);

export function updateUndoButtons() {
  const editable = state.current && state.current.type === 'table' && state.hasRowid;
  const valid = trackedDb === state.db && dbSignature() === trackedSig;
  $('btn-undo').hidden = $('btn-redo').hidden = !editable;
  $('btn-undo').disabled = !valid || !undoStack.length;
  $('btn-redo').disabled = !valid || !redoStack.length;
}

$('btn-undo').addEventListener('click', undo);
$('btn-redo').addEventListener('click', redo);

document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || $('table-view').hidden) return;
  const key = e.key.toLowerCase();
  if (key !== 'z' && key !== 'y') return;
  // leave the browser's own undo for text fields, and ignore open dialogs
  const el = e.target;
  if (el.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('dialog[open]')) return;
  e.preventDefault();
  if (key === 'y' || e.shiftKey) redo(); else undo();
});
