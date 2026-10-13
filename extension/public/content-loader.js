/**
 * Progressive Friction - Content Script Loader
 * Dynamically imports the bundled ES module content script into the isolated world.
 */
(async () => {
  try {
    const src = chrome.runtime.getURL('content-main.js');
    await import(src);
  } catch (err) {
    console.error('[Progressive Friction] Loader error:', err);
  }
})();
