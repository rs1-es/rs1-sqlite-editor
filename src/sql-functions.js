/* Custom SQL functions. SQLite's LIKE (and lower()) only ignore case for ASCII letters, and
   never ignore accents. db.export() reopens the database and drops the functions, so
   register them again after every export. */

const NON_ASCII = /[^\x00-\x7f]/;

// Search key: lower case, without accents (é = e, ü = u), for any alphabet. The ñ keeps its
// tilde because in Spanish it is a different letter ("año" is not "ano"). Composed and
// decomposed forms of the same letter give the same key.
export function fold(s) {
  s = String(s);
  if (!NON_ASCII.test(s)) return s.toLowerCase(); // fast path: most data is plain ASCII
  return s.normalize('NFD')
    .replace(/([nN])\u0303|[\u0300-\u036f]/g, (m, n) => (n ? m : ''))
    .normalize('NFC')
    .toLowerCase();
}

// true when LIKE gives the same result as the folded search: the term has no letters at all
export const needsNoFolding = s => !/\p{L}/u.test(s);

export function registerSqlFunctions(db) {
  // rs1_contains(value, foldedNeedle): 1 if value contains the (already folded) needle
  db.create_function('rs1_contains', (value, needle) =>
    value !== null && value !== undefined && fold(value).includes(needle) ? 1 : 0);
}
