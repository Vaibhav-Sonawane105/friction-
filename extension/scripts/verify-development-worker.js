import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createContext, SourceTextModule } from 'node:vm';
import { webcrypto } from 'node:crypto';

// Execute the emitted worker without DOM APIs and with MV3's dynamic-import restriction.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist-dev');
const local = { pf_blocked_domains: [{ domain: 'example.com', enabled: true, successfulUnlockCount: 0, difficultyLevel: 1 }] };
const session = {};
let onMessage;
const noopEvent = { addListener() {} };
const store = data => ({
  get(keys, callback) {
    const value = structuredClone(Object.fromEntries((typeof keys === 'string' ? [keys] : keys).map(key => [key, data[key]])));
    if (callback) queueMicrotask(() => callback(value));
    else return Promise.resolve(value);
  },
  set(values, callback) {
    Object.assign(data, structuredClone(values));
    if (callback) queueMicrotask(callback);
    else return Promise.resolve();
  },
});
const context = createContext({ console, URL, crypto: webcrypto, structuredClone, queueMicrotask, setTimeout, clearTimeout,
  fetch: async () => { throw new Error('Offline'); },
  chrome: {
    runtime: { id: 'test-extension', getURL: path => `chrome-extension://test-extension/${path}`, onMessage: { addListener(listener) { onMessage = listener; } } },
    storage: { local: store(local), session: store(session) },
    tabs: { get: async () => ({ id: 1, url: 'https://example.com/' }), query: async () => [], sendMessage: async () => {}, onRemoved: noopEvent, onUpdated: noopEvent },
    webNavigation: { getFrame: async () => ({ documentId: 'document-1' }), onCommitted: noopEvent },
    alarms: { onAlarm: noopEvent, get: async () => ({ name: 'pf_cloud_sync' }) },
  },
});
const modules = new Map();
async function load(url) {
  if (!modules.has(url)) {
    const source = await readFile(fileURLToPath(url), 'utf8');
    modules.set(url, new SourceTextModule(source, { context, identifier: url,
      initializeImportMeta(meta) { meta.url = url; },
      importModuleDynamically() { throw new Error('Dynamic import is not supported in a Manifest V3 service worker.'); },
    }));
  }
  return modules.get(url);
}
const main = await load(pathToFileURL(resolve(root, 'background.js')).href);
await main.link((specifier, module) => load(new URL(specifier, module.identifier).href));
await main.evaluate();
const sender = { id: 'test-extension', frameId: 0, tab: { id: 1 }, url: 'https://example.com/', documentId: 'document-1' };
const send = (message, source = sender) => new Promise(resolve => onMessage(message, source, resolve));
const status = await send({ type: 'CHECK_TAB_STATUS' });
if (!status.shouldBlock) throw new Error(`Built development worker failed to block: ${JSON.stringify(status)}`);
const attempt = await send({ type: 'GET_CHALLENGE' });
if (!attempt.success || !attempt.attemptId) throw new Error(`Built development worker failed to create a challenge: ${JSON.stringify(attempt)}`);
const saved = local.pf_challenge_state.attempts[attempt.attemptId];
const completed = await send({ type: 'CHALLENGE_ACTION', attemptId: attempt.attemptId, revision: attempt.revision, action: { type: 'submit', answer: String(saved.state.answer) } });
if (!completed.success || !completed.completed || local.pf_blocked_domains[0].successfulUnlockCount !== 1) throw new Error(`Built development worker failed completion: ${JSON.stringify(completed)}`);
const inspected = await send({ type: 'PF_DEV_CHALLENGE_CONTROL', operation: 'INSPECT', domain: 'example.com' }, { id: 'test-extension', url: 'chrome-extension://test-extension/index.html' });
if (!inspected.success || inspected.count !== 1) throw new Error(`Built development controls failed: ${JSON.stringify(inspected)}`);
console.log('Development worker verified: blocks, creates and completes a challenge, and serves controls without DOM APIs or dynamic imports.');
