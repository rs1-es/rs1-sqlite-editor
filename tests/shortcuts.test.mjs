// End-to-end test of the keyboard shortcuts (src/shortcuts.js).
// Run: npm run build && npm test   (needs playwright and a Chromium install)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };

// tiny static server, so the test needs nothing but node
const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, r));
const url = `http://localhost:${server.address().port}/index.html`;

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', d => d.accept());   // the "New database" name prompt

let failed = 0;
const check = (name, ok) => { console.log(ok ? 'PASS' : 'FAIL', name); if (!ok) failed++; };
const happens = (event, ms = 1500) => page.waitForEvent(event, { timeout: ms }).then(() => true, () => false);
const download = (ms = 3000) => page.waitForEvent('download', { timeout: ms }).then(d => d.suggestedFilename(), () => null);
const press = k => page.keyboard.press(k);
const dialogOpen = () => page.evaluate(() => !!document.querySelector('dialog[open]'));
const selected = id => page.$eval('#' + id, e => e.getAttribute('aria-selected') === 'true');

try {
  await page.goto(url);
  await page.waitForFunction(() => !document.getElementById('btn-new').disabled);

  // no database yet
  let chooser = happens('filechooser'); await press('Control+o');
  check('Ctrl+O opens the file chooser', await chooser);
  let dl = download(800); await press('Control+s');
  check('Ctrl+S does nothing without a database', (await dl) === null);

  // new database
  await page.click('#btn-new');
  await page.waitForFunction(() => !document.getElementById('btn-export').disabled);
  dl = download(); await press('Control+s');
  check('Ctrl+S exports the database', /\.sqlite$/.test(await dl));

  await press('Alt+n');
  check('Alt+N opens the new table dialog', await dialogOpen());
  dl = download(800); await press('Control+s');
  check('shortcuts are ignored while a dialog is open', (await dl) === null);
  await press('Escape');
  check('dialog closes', !(await dialogOpen()));

  chooser = happens('filechooser'); await press('Alt+i');
  check('Alt+I opens the CSV file chooser', await chooser);

  await press('Alt+2'); check('Alt+2 shows the SQL tab', await selected('tab-sql'));
  await press('Alt+1'); check('Alt+1 shows the Data tab', await selected('tab-data'));

  // a table with one row
  await press('Alt+2');
  await page.fill('#sql-input', "CREATE TABLE t(a,b); INSERT INTO t VALUES(1,'x');");
  await press('Control+Enter');
  await press('Alt+1');
  await page.click('li[data-name="t"] button');
  await page.waitForSelector('#table-view tbody tr');

  dl = download(); await press('Control+Shift+E');
  check('Ctrl+Shift+E exports the listing as CSV', (await dl) === 't.csv');

  const rows = () => page.locator('#table-view tbody tr').count();
  const before = await rows(); await press('Alt+r');
  await page.waitForFunction(n => document.querySelectorAll('#table-view tbody tr').length > n, before);
  check('Alt+R adds a row', (await rows()) > before);

  check('no page errors', errors.length === 0);
} catch (e) {
  console.error(e); failed++;
} finally {
  await browser.close();
  server.close();
}
process.exit(failed ? 1 : 0);
