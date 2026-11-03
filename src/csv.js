export function toCsv(columns, rows) {
  const cell = v => {
    if (v === null || v === undefined || v instanceof Uint8Array) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [columns.map(cell).join(',')];
  for (const row of rows) lines.push(row.map(cell).join(','));
  return lines.join('\r\n') + '\r\n';
}

export function detectDelim(text) {
  const line = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0];
  const best = [',', ';', '\t'].map(d => [d, line.split(d).length]).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 1 ? best[0] : ',';
}

/* Analizador CSV (RFC 4180): comillas dobles, saltos de línea dentro de campos */
export function parseCsv(text, d) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"' && f === '') q = true;
    else if (c === d) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); rows.push(row); row = []; f = '';
    } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

/* INTEGER / REAL solo si todos los valores lo son (sin ceros a la izquierda); si no, TEXT */
export function csvInferType(values) {
  let ty = 'INTEGER', any = false;
  for (const v of values) {
    if (v === undefined || v === '') continue;
    any = true;
    const isInt = /^-?(0|[1-9]\d{0,14})$/.test(v);
    const isReal = /^-?(0|[1-9]\d*)\.\d+$/.test(v);
    if (!isInt && !isReal) return 'TEXT';
    if (isReal) ty = 'REAL';
  }
  return any ? ty : 'TEXT';
}
