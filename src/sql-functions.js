/* Custom SQL functions. SQLite's LIKE (and lower()) only ignore case for ASCII letters, so
   searching "AÑO" would not find "año". db.export() reopens the database and drops the
   functions, so register them again after every export. */

// case-insensitive for any alphabet; also unifies composed / decomposed accents (ñ = n + ◌̃)
export const fold = s => String(s).normalize('NFC').toLowerCase();

export const isAscii = s => !/[^\x00-\x7f]/.test(s);

export function registerSqlFunctions(db) {
  // rs1_contains(value, foldedNeedle): 1 if value contains the (already folded) needle
  db.create_function('rs1_contains', (value, needle) =>
    value !== null && value !== undefined && fold(value).includes(needle) ? 1 : 0);
}
