import { state } from './state.js';
import { $, PAGE_SIZES } from './util.js';

export const sizeOptions = () => PAGE_SIZES.map(n => `<option value="${n}">${n}</option>`).join('');

export function setPageSize(n) {
  state.pageSize = n;
  try { localStorage.setItem('rs1-page-size', n); } catch (err) { /* no storage */ }
  $('pg-size').value = n;
}
