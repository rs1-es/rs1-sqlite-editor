import { loadPageSize } from './util.js';

/* Estado compartido de la aplicación */
export const state = {
  SQL: null,
  db: null,
  fileName: 'export.sqlite',
  savedSignature: null,   // firma de la BD en el último guardado/apertura (cambios sin guardar)
  objects: [],            // [{name, type}]
  current: null,          // {name, type}
  columns: [],            // columnas del objeto actual
  hasRowid: false,
  filterText: '',         // texto de búsqueda de la vista de datos
  filterCol: '',          // '' = todas las columnas
  page: 0,                // página actual (base 0) de la vista de datos
  pageSize: loadPageSize(),
  sortCol: null,          // columna por la que se ordena la vista de datos
  sortDir: 'ASC',
  addRowActive: false,    // fila "nuevo registro" en curso (aún sin insertar)
  addDraft: []            // valores escritos en la fila nueva
};
