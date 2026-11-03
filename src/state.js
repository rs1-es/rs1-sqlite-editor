import { loadPageSize } from './util.js';

/* Shared application state */
export const state = {
  SQL: null,
  db: null,
  fileName: 'export.sqlite',
  savedSignature: null,   // DB signature at the last save/open (unsaved changes)
  objects: [],            // [{name, type}]
  current: null,          // {name, type}
  columns: [],            // columns of the current object
  hasRowid: false,
  filterText: '',         // search text of the data view
  filterCol: '',          // '' = all columns
  page: 0,                // current page (0-based) of the data view
  pageSize: loadPageSize(),
  sortCol: null,          // column the data view is sorted by
  sortDir: 'ASC',
  addRowActive: false,    // "new record" row in progress (not inserted yet)
  addDraft: []            // values typed in the new row
};
