// webNavigation can omit extension-owned tabs from getFrame. For the exact
// standalone page, Chrome's extension context list also binds URL + document ID.
export async function isCurrentDocument(tabId, documentId, url) {
  const frame = await chrome.webNavigation.getFrame({
    tabId,
    frameId: 0
  });
  if (frame?.documentId === documentId) return true;
  if (!documentId || !chrome.runtime.getContexts || !url) return false;
  const dest = new URL(url),
    blocked = new URL(chrome.runtime.getURL('blocked.html'));
  if (dest.protocol !== blocked.protocol || dest.host !== blocked.host || dest.pathname !== blocked.pathname) return false;
  const active = await chrome.runtime.getContexts({
    contextTypes: ['TAB'],
    tabIds: [tabId],
    frameIds: [0],
    documentIds: [documentId],
    documentUrls: [url]
  });
  return active.some(c => c.documentId === documentId && c.tabId === tabId && c.frameId === 0 && c.documentUrl === url);
}
