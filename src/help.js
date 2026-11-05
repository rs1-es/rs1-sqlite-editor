import { lang, t } from './i18n.js';
import { $, esc } from './util.js';

/* "How to use" dialog. Items are plain text; `Key` (backticks) is shown as a keyboard key. */

const HELP = {
  en: [
    { title: 'Getting started', items: [
      'Click **Open database** or drop a `.sqlite`, `.sqlite3`, `.db` or `.db3` file anywhere on the page.',
      'Click **New database** to start from an empty one.',
      'Everything runs in your browser: your files are never uploaded.'] },
    { title: 'Saving your work', items: [
      'Changes are kept in memory only. Click **Export** to download the modified database.',
      'The page warns you if you close it, open another database or create a new one while there are changes you have not exported.'] },
    { title: 'Browsing data', items: [
      'Pick a table or view in the list on the left (the `☰` button shows it on small screens).',
      'Click a column header (or press `Enter` on it) to sort; click again to reverse the order.',
      'Use the search box to filter rows, in all columns or in one you choose.',
      'Use the pager under the table to change page, and choose how many rows to show per page.'] },
    { title: 'Editing cells', items: [
      '**Double-click** a cell to edit it, or move to it with the arrow keys and press `Enter` or `F2`.',
      '`Enter` saves the change and `Esc` cancels it.',
      'Press `Delete` on a selected cell to set it to NULL (not allowed in NOT NULL columns).',
      'Leaving a cell empty stores NULL, unless the column is NOT NULL.',
      'Views, BLOB values and WITHOUT ROWID tables are read-only.'] },
    { title: 'Adding and deleting rows', items: [
      'Click **+ Add row**: a new line appears at the end of the table. Fill in the fields and press `Enter` or ✓ to insert it; `Esc` or ✕ cancels.',
      'Click the ✕ at the end of a row to delete it (you will be asked to confirm).'] },
    { title: 'Undo and redo', items: [
      'Use the **Undo** and **Redo** buttons, or `Ctrl+Z` and `Ctrl+Y`, to revert edits, added rows and deleted rows.',
      'The history is cleared when the database is changed in another way (SQL tab, table structure, CSV import…).'] },
    { title: 'Tables', items: [
      '**+ New table** creates a table with the columns you define.',
      '**Structure** lets you add, rename and drop columns and manage indexes.',
      '**Rename** and **Drop** change or delete the table. Dropping cannot be undone.'] },
    { title: 'CSV', items: [
      '**Import CSV** (or drop a `.csv` file on the page) loads the data into a new table or an existing one.',
      '**Export CSV** downloads the current listing, or an SQL result, as a CSV file.'] },
    { title: 'SQL tab', items: [
      'Write one or more statements and press `Ctrl+Enter` (or **Run**).',
      'Results are shown in tables that can be sorted and paged. Statements that change data show the rows affected.'] },
    { title: 'Keyboard', items: [
      'In a table: arrow keys move between cells; `Home` / `End` go to the start / end of the row, `Ctrl+Home` / `Ctrl+End` to the first / last cell.',
      '`PageUp` / `PageDown` go to the first / last row of the page.',
      'In the Data / SQL tabs and the dialogs: `Tab` moves forward, `Esc` closes a dialog.',
      '`Ctrl+O` opens a database, `Ctrl+S` exports it and `Ctrl+Shift+E` exports the current listing as CSV.',
      '`Alt+N` creates a new table, `Alt+I` imports a CSV, `Alt+R` adds a row, and `Alt+1` / `Alt+2` switch to the Data / SQL tab.'] }
  ],
  es: [
    { title: 'Primeros pasos', items: [
      'Pulsa **Abrir base de datos** o arrastra un archivo `.sqlite`, `.sqlite3`, `.db` o `.db3` a cualquier parte de la página.',
      'Pulsa **Nueva base de datos** para empezar con una vacía.',
      'Todo se ejecuta en tu navegador: tus archivos nunca se suben a ningún servidor.'] },
    { title: 'Guardar tu trabajo', items: [
      'Los cambios solo se guardan en memoria. Pulsa **Exportar** para descargar la base modificada.',
      'La página avisa si la cierras, abres otra base o creas una nueva habiendo cambios sin exportar.'] },
    { title: 'Ver datos', items: [
      'Elige una tabla o vista en la lista de la izquierda (el botón `☰` la muestra en pantallas pequeñas).',
      'Pulsa el encabezado de una columna (o `Enter` sobre él) para ordenar; púlsalo de nuevo para invertir el orden.',
      'Usa el cuadro de búsqueda para filtrar filas, en todas las columnas o en la que elijas.',
      'Usa el paginador bajo la tabla para cambiar de página y elegir cuántas filas mostrar por página.'] },
    { title: 'Editar celdas', items: [
      '**Haz doble clic** en una celda para editarla, o muévete con las flechas y pulsa `Enter` o `F2`.',
      '`Enter` guarda el cambio y `Esc` lo cancela.',
      'Pulsa `Supr` sobre una celda seleccionada para ponerla a NULL (no se permite en columnas NOT NULL).',
      'Dejar una celda vacía guarda NULL, salvo que la columna sea NOT NULL.',
      'Las vistas, los valores BLOB y las tablas WITHOUT ROWID son de solo lectura.'] },
    { title: 'Añadir y borrar registros', items: [
      'Pulsa **+ Añadir registro**: aparece una línea al final de la tabla. Rellena los campos y pulsa `Enter` o ✓ para insertarla; `Esc` o ✕ la cancela.',
      'Pulsa la ✕ al final de una fila para borrarla (te pedirá confirmación).'] },
    { title: 'Deshacer y rehacer', items: [
      'Usa los botones **Deshacer** y **Rehacer**, o `Ctrl+Z` y `Ctrl+Y`, para revertir ediciones, registros añadidos y registros borrados.',
      'El historial se borra cuando la base cambia de otra forma (pestaña SQL, estructura de tablas, importación de CSV…).'] },
    { title: 'Tablas', items: [
      '**+ Nueva tabla** crea una tabla con las columnas que definas.',
      '**Estructura** permite añadir, renombrar y borrar columnas, y gestionar índices.',
      '**Renombrar** y **Eliminar** cambian o borran la tabla. Eliminarla no se puede deshacer.'] },
    { title: 'CSV', items: [
      '**Importar CSV** (o arrastrar un archivo `.csv` a la página) carga los datos en una tabla nueva o en una existente.',
      '**Exportar CSV** descarga el listado actual, o un resultado SQL, como archivo CSV.'] },
    { title: 'Pestaña SQL', items: [
      'Escribe una o más sentencias y pulsa `Ctrl+Enter` (o **Ejecutar**).',
      'Los resultados se muestran en tablas que se pueden ordenar y paginar. Las sentencias que modifican datos muestran las filas afectadas.'] },
    { title: 'Teclado', items: [
      'En una tabla: las flechas mueven entre celdas; `Inicio` / `Fin` van al principio / final de la fila, `Ctrl+Inicio` / `Ctrl+Fin` a la primera / última celda.',
      '`Re Pág` / `Av Pág` van a la primera / última fila de la página.',
      'En las pestañas Datos / SQL y en los diálogos: `Tab` avanza y `Esc` cierra un diálogo.',
      '`Ctrl+O` abre una base de datos, `Ctrl+S` la exporta y `Ctrl+Shift+E` exporta el listado actual como CSV.',
      '`Alt+N` crea una tabla nueva, `Alt+I` importa un CSV, `Alt+R` añade un registro y `Alt+1` / `Alt+2` cambian a la pestaña Datos / SQL.'] }
  ]
};

// escapes the text, then turns **bold** and `key` into markup
const fmt = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/`(.+?)`/g, '<kbd>$1</kbd>');

export function renderHelp() {
  const sections = HELP[lang] || HELP.en;
  $('help-body').innerHTML = sections.map(s =>
    `<h3>${esc(s.title)}</h3><ul>${s.items.map(i => `<li>${fmt(i)}</li>`).join('')}</ul>`).join('');
  $('help-title').textContent = t('helpTitle');
}

let opener = null;

function openHelp() {
  opener = document.activeElement;
  renderHelp();
  $('help-dialog').showModal();
  $('help-body').scrollTop = 0;
}

$('btn-help').addEventListener('click', openHelp);
$('btn-help-link').addEventListener('click', openHelp);
$('help-close').addEventListener('click', () => $('help-dialog').close());
// give focus back to whatever opened the dialog
$('help-dialog').addEventListener('close', () => { if (opener && opener.isConnected) opener.focus(); });
