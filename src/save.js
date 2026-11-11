/* Saves a Blob as a file. With the File System Access API (Chromium browsers) the browser
   tells us whether the user saved or cancelled. Elsewhere a normal download is started, and
   nothing can be known about what happens after that (it may even be cancelled in a dialog).
   Resolves to { status: 'saved' | 'cancelled' | 'started', name }. */
export async function saveBlob(blob, name, mime, extensions) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ accept: { [mime.split(';')[0]]: extensions } }]
      });
      const w = await handle.createWritable();
      await w.write(blob);
      await w.close();
      return { status: 'saved', name: handle.name };
    } catch (e) {
      if (e && e.name === 'AbortError') return { status: 'cancelled', name };
      if (e && e.name !== 'SecurityError' && e.name !== 'NotAllowedError') throw e;
      // picker not available here (e.g. no user activation): use a normal download
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return { status: 'started', name };
}
