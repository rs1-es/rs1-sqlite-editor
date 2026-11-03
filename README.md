# RS1 SQLite Editor

A SQLite database editor that runs **entirely in the browser**: files are processed locally
with [sql.js](https://github.com/sql-js/sql.js) (SQLite compiled to WebAssembly) and are never
uploaded to any server.

Live version: <https://sqlite.rs1.es>

## Features

- Open a database (`.sqlite`, `.sqlite3`, `.db`, `.db3`, drag and drop also works), create a
  new one and export the modified file. Changes are kept in memory until you export.
- Browse tables and views with pagination, column sorting and text search (across all
  columns or a single one).
- Edit cells by double-clicking, add and delete rows.
- Create tables with a dialog, rename them, drop them and change their structure.
- SQL tab to run statements (Ctrl+Enter), with sortable, paginated results.
- Import CSV, and export the current listing or an SQL result to CSV.
- Spanish and English interface, light and dark themes, and a layout adapted to small screens.

## Project structure

| File | Description |
|---|---|
| `index.html` | Page markup |
| `src/` | Application source, as ES modules (entry point: `src/main.js`) |
| `app.min.js` | Application bundle generated from `src/` (what `index.html` loads) |
| `styles.css` / `styles.min.css` | Styles (source and minified version) |
| `package.json` | Build scripts (`npm run build`) |
| `lib/` | sql.js `sql-wasm.js` and `sql-wasm.wasm`, served from the site itself |

`index.html` loads the **generated** `app.min.js` and `styles.min.css`, so after editing `src/` or
`styles.css` you need to regenerate them (see [Building](#building)).

## Running locally

It is a static page, but the `.wasm` file does not load from `file://`; serve the folder with
any HTTP server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Building

`app.min.js` is bundled and minified from `src/` with [esbuild](https://esbuild.github.io/), and
`styles.min.css` is minified with [clean-css](https://github.com/clean-css/clean-css). You need
Node.js:

```bash
npm install      # once
npm run build    # regenerates app.min.js and styles.min.css
```

You can also run `npm run build:js` or `npm run build:css` separately, and `npm run serve`
starts the local server described above.

## Source modules

| Module | Responsibility |
|---|---|
| `main.js` | Entry point: applies the language and starts the app |
| `state.js` | Shared mutable state (`state.db`, `state.current`, `state.page`…) |
| `util.js` | DOM and SQL-quoting helpers, constants |
| `i18n.js` / `status.js` / `theme.js` | Translations, status bar, light/dark theme |
| `database.js` | Open, create and export databases, drag and drop, unsaved-changes warning |
| `schema.js` / `tabs.js` | Table and view list in the sidebar, Data/SQL tabs |
| `data-view.js` / `paging.js` | Table browser: rows, sorting, search, pagination |
| `edit-rows.js` | Cell editing and adding/deleting rows |
| `sql-console.js` | SQL tab and its paginated results |
| `csv.js` | Pure CSV functions (parse, serialize, type inference) |
| `csv-export.js` / `csv-import.js` | CSV export and the import dialog |
| `new-table.js` / `structure.js` / `table-actions.js` | Create tables, edit columns and indexes, rename and drop |

## Credits and licenses

- [sql.js](https://github.com/sql-js/sql.js) (bundled in `lib/`) is distributed under the MIT
  license; the full notice is in [THIRD_PARTY.md](THIRD_PARTY.md).
- This project is distributed under the [MIT license](LICENSE). The files in `lib/` keep their
  own license.
