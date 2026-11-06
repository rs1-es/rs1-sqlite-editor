import { $ } from './util.js';

/* Global keyboard shortcuts. Each one clicks the matching button, so it does nothing
   while that button is disabled or hidden (e.g. no database open yet). */

const click = id => {
  const b = $(id);
  if (!b || b.disabled || b.hidden || b.closest('[hidden]')) return false;
  b.click();
  return true;
};

// Ctrl/Cmd shortcuts (e.key) and Alt shortcuts (e.code, so they work with any layout / on macOS)
const CTRL = { o: 'btn-open', s: 'btn-export' };
const CTRL_SHIFT = { e: 'btn-export-csv' };
const ALT = { KeyN: 'btn-new-table', KeyI: 'btn-import-csv', KeyR: 'btn-add-row', Digit1: 'tab-data', Digit2: 'tab-sql' };

document.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.isComposing || document.querySelector('dialog[open]')) return;
  let id;
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    const key = e.key.toLowerCase();
    id = e.shiftKey ? CTRL_SHIFT[key] : CTRL[key];
  } else if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    id = ALT[e.code];
  }
  if (!id) return;
  e.preventDefault();   // also stops the browser's own "open file" / "save page"
  // leaving a cell being edited commits it first, as a real click on the button would
  if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
  click(id);
});
