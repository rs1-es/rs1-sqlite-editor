# RS1 SQLite Editor

Editor de bases de datos SQLite que funciona **por completo en el navegador**: los archivos
se procesan localmente con [sql.js](https://github.com/sql-js/sql.js) (SQLite compilado a
WebAssembly) y no se suben a ningún servidor.

Versión en línea: <https://sqlite.rs1.es>

## Funcionalidades

- Abrir una base (`.sqlite`, `.sqlite3`, `.db`, `.db3`, también arrastrando el archivo), crear
  una nueva y exportar la modificada. Los cambios viven en memoria hasta exportar.
- Ver tablas y vistas con paginación, orden por columna y búsqueda por texto (en todas las
  columnas o en una).
- Editar celdas con doble clic, añadir y borrar filas.
- Crear tablas con un diálogo, renombrarlas, eliminarlas y modificar su estructura.
- Pestaña SQL para ejecutar sentencias (Ctrl+Enter), con resultados ordenables y paginados.
- Importar CSV y exportar a CSV el listado actual o un resultado SQL.
- Interfaz en español e inglés, tema claro y oscuro, y diseño adaptado a pantallas pequeñas.

## Estructura

| Archivo | Descripción |
|---|---|
| `index.html` | Marcado de la página |
| `app.js` / `app.min.js` | Lógica de la aplicación (código fuente y versión minificada) |
| `styles.css` / `styles.min.css` | Estilos (código fuente y versión minificada) |
| `lib/` | `sql-wasm.js` y `sql-wasm.wasm` de sql.js, servidos desde el propio sitio |

`index.html` carga las versiones **minificadas**, así que tras editar `app.js` o `styles.css`
hay que regenerarlas.

## Ejecutar en local

Es una página estática, pero el `.wasm` no se carga desde `file://`; sirve la carpeta con
cualquier servidor HTTP:

```bash
python3 -m http.server 8000
# y abrir http://localhost:8000
```

## Minificar

Los archivos `.min` se generan a mano. Por ejemplo, para el JS con
[UglifyJS](https://github.com/mishoo/UglifyJS) sin renombrar variables:

```bash
uglifyjs app.js > app.min.js
```

Para `styles.min.css` puede usarse cualquier minificador de CSS.

## Créditos y licencias

- [sql.js](https://github.com/sql-js/sql.js) (incluido en `lib/`) tiene su propia licencia.
- Este proyecto se distribuye bajo la licencia [MIT](LICENSE). Los archivos de `lib/`
  mantienen la de sql.js.
