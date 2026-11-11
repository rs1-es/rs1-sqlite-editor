import { $ } from './util.js';

let lastStatus = null;
const listeners = [];

// callbacks run after every status update (any action that may have changed the database ends in one)
export function onStatusChange(fn) { listeners.push(fn); }

export function setStatus(source, isError = false) {
  lastStatus = { source, isError };
  renderStatus();
  listeners.forEach(fn => fn());
}

export function renderStatus() {
  const el = $('status');
  if (!lastStatus) { el.textContent = ''; el.classList.remove('error'); return; }
  const msg = typeof lastStatus.source === 'function' ? lastStatus.source() : lastStatus.source;
  el.textContent = msg;
  el.classList.toggle('error', lastStatus.isError);
}
