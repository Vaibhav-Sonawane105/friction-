import { vi } from 'vitest';

// Only the external Chrome boundary is simulated; background, storage and models are real.
export function createChromeHarness() {
  const harness = { local: {}, session: {}, tabs: {
    1: { id: 1, url: 'https://youtube.com/watch', active: true },
    2: { id: 2, url: 'https://youtube.com/', active: false },
  }, documents: { 1: 'doc-1', 2: 'doc-2' }, listeners: {}, notifications: [], failNextWrite: false };
  const clone = value => structuredClone(value);
  const event = name => ({ addListener: handler => { harness.listeners[name] = handler; } });
  const store = area => ({
    get(keys, callback) {
      const list = typeof keys === 'string' ? [keys] : keys;
      const value = clone(Object.fromEntries(list.map(key => [key, harness[area][key]])));
      if (callback) queueMicrotask(() => callback(value));
      else return Promise.resolve(value);
    },
    set(values, callback) {
      const save = () => {
        if (area === 'local' && harness.failNextWrite) { harness.failNextWrite = false; throw new Error('Storage unavailable'); }
        Object.assign(harness[area], clone(values));
      };
      if (!callback) return Promise.resolve().then(save);
      queueMicrotask(() => {
        try { save(); } catch (error) { harness.chrome.runtime.lastError = { message: error.message }; }
        try { callback(); } finally { delete harness.chrome.runtime.lastError; }
      });
    },
  });
  harness.chrome = {
    runtime: { id: 'extension', getURL: path => `chrome-extension://extension/${path}`, onMessage: event('message') },
    storage: { local: store('local'), session: store('session') },
    tabs: { get: async id => { if (!harness.tabs[id]) throw new Error('Tab closed'); return clone(harness.tabs[id]); },
      query: async () => clone(Object.values(harness.tabs)), sendMessage: async (tabId, message) => { harness.notifications.push({ tabId, ...clone(message) }); }, create: async () => ({}), remove: async () => {},
      onRemoved: event('removed'), onUpdated: event('updated') },
    webNavigation: { getFrame: async ({ tabId }) => ({ documentId: harness.documents[tabId] }), onCommitted: event('committed') },
    alarms: { onAlarm: event('alarm'), get: async () => ({ name: 'pf_cloud_sync' }) },
  };
  harness.sender = (id = 1) => ({ id: 'extension', tab: { id }, frameId: 0, documentId: harness.documents[id], url: harness.tabs[id]?.url });
  harness.popup = { id: 'extension', url: 'chrome-extension://extension/index.html' };
  harness.send = (message, sender = harness.sender()) => new Promise(resolve => harness.listeners.message(message, sender, resolve));
  harness.add = domain => harness.send({ type: 'MUTATE_STORAGE', operation: 'addBlockedDomain', args: [domain] }, harness.popup);
  harness.boot = async (development = true, controls = development) => {
    vi.resetModules(); harness.listeners = {};
    vi.stubGlobal('chrome', harness.chrome);
    vi.stubGlobal('__PF_CHALLENGE_DEV__', development);
    vi.stubGlobal('__PF_DEV_CONTROLS__', controls);
    vi.stubGlobal('fetch', () => Promise.reject(new Error('Offline')));
    return import('../background');
  };
  return harness;
}
