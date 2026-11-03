import { $ } from './util.js';

let lastStatus = null;

export function setStatus(source, isError = false) {
  lastStatus = { source, isError };
  renderStatus();
}

export function renderStatus() {
  const el = $('status');
  if (!lastStatus) { el.textContent = ''; el.classList.remove('error'); return; }
  const msg = typeof lastStatus.source === 'function' ? lastStatus.source() : lastStatus.source;
  el.textContent = msg;
  el.classList.toggle('error', lastStatus.isError);
}
