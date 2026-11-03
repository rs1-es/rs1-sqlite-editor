export const BLOB_TEXT = '[blob]';

export const $ = id => document.getElementById(id);

export const PAGE_SIZES = [50, 100, 250, 500];
export function loadPageSize() {
  try {
    const n = Number(localStorage.getItem('rs1-page-size'));
    return PAGE_SIZES.includes(n) ? n : 100;
  } catch (e) { return 100; }
}
export const qi = n => '"' + String(n).replace(/"/g, '""') + '"';
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Default value (from PRAGMA table_info) to show as a hint */
export function displayDefault(d) {
  if (d === null || d === undefined) return '';
  const s = String(d);
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  return s.toUpperCase() === 'NULL' ? '' : s;
}

/* A pager button that becomes disabled while focused would drop keyboard focus:
   move it to the button that now leads back into the page range. */
export function rescuePagerFocus(first, prev, next, last) {
  const a = document.activeElement;
  if (![first, prev, next, last].includes(a) || !a.disabled) return;
  const target = (a === first || a === prev) ? next : prev;
  if (!target.disabled) target.focus();
}
