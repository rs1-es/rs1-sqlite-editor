import { $ } from './util.js';

/* Status bar. Success messages fade after a few seconds; errors stay until the user changes
   context (another tab, table or database) or a new message replaces them. When there is no
   message, a resting line (see setIdleProvider) is shown in a separate, non-announced element,
   so only real messages reach the screen reader. */

const MESSAGE_MS = 8000;

let lastStatus = null;
let timer = null;
let reannounce = null;
let idleProvider = () => '';
const listeners = [];

// callbacks run after every status update (any action that may have changed the database ends in one)
export function onStatusChange(fn) { listeners.push(fn); }

// the text shown while there is no message (summary of the open database)
export function setIdleProvider(fn) { idleProvider = fn; }

export function setStatus(source, isError = false) {
  lastStatus = { source, isError };
  clearTimeout(timer);
  // errors wait for the user; other messages go back to the resting line
  if (!isError) timer = setTimeout(clearStatus, MESSAGE_MS);
  renderStatus();
  listeners.forEach(fn => fn());
}

// Removes the current message (the resting line shows again). Used when the context changes.
export function clearStatus() {
  clearTimeout(timer);
  if (!lastStatus) return;
  lastStatus = null;
  renderStatus();
}

const currentMessage = () =>
  !lastStatus ? '' : typeof lastStatus.source === 'function' ? lastStatus.source() : lastStatus.source;

export function renderStatus() {
  const el = $('status');
  $('status-idle').textContent = idleProvider();
  clearTimeout(reannounce); // a pending re-announcement belongs to an older message
  if (!lastStatus) { el.textContent = ''; el.classList.remove('error'); return; }
  const msg = currentMessage();
  el.classList.toggle('error', lastStatus.isError);
  if (el.textContent === msg) {
    // the same message again: empty the live region first so assistive technology announces it anew
    el.textContent = '';
    reannounce = setTimeout(() => { el.textContent = currentMessage(); }, 50);
  } else {
    el.textContent = msg;
  }
}
