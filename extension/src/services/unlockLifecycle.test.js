import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let local, session, tabs, documents, listeners, storage, failNextWrite;
const clone = value => structuredClone(value);
const popup = { id: 'extension', url: 'chrome-extension://extension/index.html' };
const sender = (id = 1) => ({ id: 'extension', tab: { id }, frameId: 0,
  documentId: documents[id], url: tabs[id]?.url });
const send = (message, source = sender()) => new Promise(resolve => {
  expect(listeners.message(message, source, resolve)).toBe(true);
});
const add = domain => send({ type: 'MUTATE_STORAGE', operation: 'addBlockedDomain', args: [domain] }, popup);
const complete = (id = 1) => send({ type: 'COMPLETE_UNLOCK', domain: 'youtube.com' }, sender(id));
const count = async () => (await storage.getBlockedDomains()).find(item => item.domain === 'youtube.com')?.successfulUnlockCount;

async function boot() {
  vi.resetModules(); listeners = {};
  const event = name => ({ addListener: callback => { listeners[name] = callback; } });
  vi.stubGlobal('chrome', {
    runtime: { id: 'extension', getURL: path => `chrome-extension://extension/${path}`,
      onMessage: event('message') },
    storage: {
      local: {
        get: (keys, callback) => queueMicrotask(() => callback(clone(Object.fromEntries(keys.map(key => [key, local[key]]))))),
        set: (values, callback) => queueMicrotask(() => {
          if (failNextWrite) {
            failNextWrite = false;
            chrome.runtime.lastError = { message: 'Storage unavailable' };
            try { callback(); } finally { delete chrome.runtime.lastError; }
          } else { Object.assign(local, clone(values)); callback(); }
        }),
      },
      session: { get: async key => clone({ [key]: session[key] }),
        set: async values => { Object.assign(session, clone(values)); } },
    },
    tabs: {
      get: async id => { if (!tabs[id]) throw new Error('Tab closed'); return clone(tabs[id]); },
      query: async () => Object.values(tabs).map(clone), sendMessage: vi.fn(async () => {}),
      create: vi.fn(async () => ({})), remove: vi.fn(async () => {}),
      onRemoved: event('removed'), onUpdated: event('updated'),
    },
    webNavigation: { onCommitted: event('committed'), getFrame: async ({ tabId }) => ({ documentId: documents[tabId] }) },
    alarms: { onAlarm: event('alarm'), get: async () => ({ name: 'pf_cloud_sync' }) },
  });
  await import('../background'); storage = await import('./storage');
}

beforeEach(async () => {
  local = {}; session = {}; failNextWrite = false;
  tabs = { 1: { id: 1, url: 'https://youtube.com/watch' }, 2: { id: 2, url: 'https://youtube.com/' } };
  documents = { 1: 'doc-1', 2: 'doc-2' };
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Offline'))));
  await boot(); expect((await add('youtube.com')).success).toBe(true);
});
afterEach(() => vi.unstubAllGlobals());

describe('production unlock message lifecycle', () => {
  it('counts simultaneous duplicate completions in one tab exactly once', async () => {
    const results = await Promise.all([complete(), complete(), complete()]);
    expect(results.every(result => result.success)).toBe(true);
    expect(await count()).toBe(1);
    expect(results.filter(result => result.alreadyUnlocked)).toHaveLength(2);
  });
  it('retains both updates when two tabs unlock concurrently', async () => {
    await Promise.all([complete(1), complete(2)]);
    expect(await count()).toBe(2);
    expect(Object.keys(await storage.getUnlockSessions())).toEqual(['1', '2']);
  });
  it('serializes a settings change with unlock completion without losing either', async () => {
    await Promise.all([complete(), add('reddit.com')]);
    expect(await count()).toBe(1);
    expect((await storage.getBlockedDomains()).map(item => item.domain)).toEqual(['youtube.com', 'reddit.com']);
  });
  it('does not unlock a second tab when the first completes', async () => {
    await complete();
    expect((await send({ type: 'CHECK_TAB_STATUS' }, sender(2))).shouldBlock).toBe(true);
  });
  it('preserves access and count through refresh and same-domain navigation', async () => {
    await complete();
    for (const url of ['https://youtube.com/new', 'https://music.youtube.com/', 'https://www.youtube.com/']) {
      tabs[1].url = url;
      expect((await send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(false);
    }
    expect(await count()).toBe(1);
  });
  it.each(['https://google.com/', 'https://notyoutube.com/', 'about:blank', 'chrome://newtab/'])(
    'expires access after background navigation to %s even without a content script', async url => {
      await complete(); tabs[1].url = url;
      listeners.updated(1, { url });
      // A subsequent message is a barrier through the same production queue.
      await send({ type: 'CHECK_TAB_STATUS' });
      tabs[1].url = 'https://youtube.com/';
      expect((await send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(true);
      expect(await count()).toBe(1);
    });
  it('handles committed navigation separately from URL update notifications', async () => {
    await complete(); tabs[1].url = 'about:blank';
    listeners.committed({ tabId: 1, frameId: 0, url: 'about:blank' });
    await send({ type: 'CHECK_TAB_STATUS' });
    expect(await storage.getUnlockSessions()).toEqual({});
  });
  it('ignores iframe navigation for the top-level unlock session', async () => {
    await complete();
    listeners.committed({ tabId: 1, frameId: 2, url: 'https://google.com/' });
    expect((await send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(false);
  });
  it('cleans closed-tab access and does not reuse it for a new tab', async () => {
    await complete(); delete tabs[1]; listeners.removed(1);
    await send({ type: 'CHECK_TAB_STATUS' }, sender(2));
    expect((await storage.getUnlockSessions())['1']).toBeUndefined();
    tabs[1] = { id: 1, url: 'https://youtube.com/' }; documents[1] = 'new-doc';
    expect((await send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(true);
  });
  it('rejects completion from a replaced document', async () => {
    const old = sender(); documents[1] = 'new-doc';
    expect((await send({ type: 'COMPLETE_UNLOCK', domain: 'youtube.com' }, old)).success).toBe(false);
    expect(await count()).toBe(0);
  });
  it.each([
    { id: 'other-extension', frameId: 0, tab: { id: 1 } },
    { id: 'extension', frameId: 1, tab: { id: 1 } },
    { id: 'extension', frameId: 0 },
  ])('rejects an invalid completion sender %j', async source => {
    expect((await send({ type: 'COMPLETE_UNLOCK', domain: 'youtube.com' }, source)).success).toBe(false);
    expect(await count()).toBe(0);
  });
  it('rejects a late completion after the tab leaves its domain', async () => {
    tabs[1].url = 'https://google.com/';
    expect((await complete()).success).toBe(false); expect(await count()).toBe(0);
  });
  it('rejects legacy split-count messages', async () => {
    expect((await send({ type: 'UNLOCK_DOMAIN', domain: 'youtube.com' })).success).toBe(false);
    expect(await count()).toBe(0);
  });
  it('rejects content-script settings mutations', async () => {
    expect((await send({ type: 'MUTATE_STORAGE', operation: 'removeBlockedDomain', args: ['youtube.com'] })).success).toBe(false);
    expect(await count()).toBe(0);
  });
  it('does not partially save access or progression on a failed write, and retries once', async () => {
    failNextWrite = true;
    expect((await complete()).success).toBe(false);
    expect(await count()).toBe(0); expect(await storage.getUnlockSessions()).toEqual({});
    expect((await complete()).success).toBe(true);
    await complete(); expect(await count()).toBe(1);
  });
  it('invalidates access on removal and does not revive it on re-add', async () => {
    await complete();
    await send({ type: 'MUTATE_STORAGE', operation: 'removeBlockedDomain', args: ['youtube.com'] }, popup);
    await add('youtube.com');
    expect((await send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(true);
    expect(await count()).toBe(0);
  });
  it('invalidates access when disabling and re-enabling a domain', async () => {
    await complete();
    for (let i = 0; i < 2; i++) await send({ type: 'MUTATE_STORAGE', operation: 'toggleDomainEnabled', args: ['youtube.com'] }, popup);
    expect((await send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(true);
    expect(await count()).toBe(1);
  });
  it('preserves access through an actual module re-import with session storage retained', async () => {
    await complete(); await boot();
    expect((await send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(false);
    expect(await count()).toBe(1);
  });
  it('expires access after browser restart or extension reload but preserves progression', async () => {
    await complete(); session = {}; await boot();
    expect((await send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(true);
    expect(await count()).toBe(1);
  });
  it('expires old sessions without a browser-lifetime epoch', async () => {
    local.pf_unlock_sessions = { 1: { domain: 'youtube.com', unlockedAt: Date.now() } };
    expect((await send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(true);
  });
  it('completes the local flow while fetch is unavailable', async () => {
    expect((await complete()).success).toBe(true);
    expect(await count()).toBe(1); expect(fetch).not.toHaveBeenCalled();
  });
});
