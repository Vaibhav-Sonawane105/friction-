import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createContext, SourceTextModule } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { verifyProductionBuild } from './verify-production-build.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist-preview');
await verifyProductionBuild(root);
const local = { pf_blocked_domains: [{ domain: 'example.com', enabled: true, successfulUnlockCount: 0, difficultyLevel: 1 }] };
const session = {};
let onMessage;
const event = { addListener() {} };
const store = data => ({
  get(keys, callback) {
    const value = structuredClone(Object.fromEntries((typeof keys === 'string' ? [keys] : keys).map(key => [key, data[key]])));
    if (callback) queueMicrotask(() => callback(value)); else return Promise.resolve(value);
  },
  set(values, callback) {
    Object.assign(data, structuredClone(values));
    if (callback) queueMicrotask(callback); else return Promise.resolve();
  },
});
// Only Chrome APIs are simulated. Execute the actual emitted worker with MV3 restrictions.
const context = createContext({ console, URL, crypto: webcrypto, structuredClone, queueMicrotask, setTimeout, clearTimeout,
  fetch: async () => { throw new Error('Offline'); },
  chrome: {
    runtime: { id: 'preview', getURL: path => `chrome-extension://preview/${path}`, onMessage: { addListener(listener) { onMessage = listener; } } },
    storage: { local: store(local), session: store(session) },
    tabs: { get: async () => ({ id: 1, url: 'https://example.com/' }), query: async () => [], sendMessage: async () => {}, onRemoved: event, onUpdated: event },
    webNavigation: { getFrame: async () => ({ documentId: 'document-1' }), onCommitted: event },
    alarms: { onAlarm: event, get: async () => ({ name: 'pf_cloud_sync' }) },
  },
});
const modules = new Map();
async function load(url) {
  if (!modules.has(url)) modules.set(url, new SourceTextModule(await readFile(fileURLToPath(url), 'utf8'), {
    context, identifier: url, initializeImportMeta(meta) { meta.url = url; },
    importModuleDynamically() { throw new Error('MV3 worker cannot use dynamic imports.'); },
  }));
  return modules.get(url);
}
const main = await load(pathToFileURL(resolve(root, 'background.js')).href);
await main.link((specifier, module) => load(new URL(specifier, module.identifier).href));
await main.evaluate();
const sender = { id: 'preview', frameId: 0, tab: { id: 1 }, url: 'https://example.com/', documentId: 'document-1' };
const popup = { id: 'preview', url: 'chrome-extension://preview/index.html' };
const send = (message, source = sender) => new Promise(resolve => onMessage(message, source, resolve));
if (!(await send({ type: 'CHECK_TAB_STATUS' })).shouldBlock) throw new Error('Preview failed to block.');
for (const operation of ['SET_COUNT', 'PREPARE_CHALLENGE', 'RESET_CHALLENGE', 'INSPECT']) {
  const result = await send({ type: 'PF_DEV_CHALLENGE_CONTROL', operation, domain: 'example.com', count: 31, moduleId: 'tracking' }, popup);
  if (result.success) throw new Error(`Preview accepted developer operation ${operation}.`);
}
// These fixtures belong only to this external verifier, never to the distributed extension.
for (const [count, expected] of [[0, 'arithmetic'], [20, 'arithmetic'], [21, 'equations'], [30, 'equations'], [31, null], [50, null], [51, 'unavailable']]) {
  local.pf_blocked_domains[0].successfulUnlockCount = count;
  local.pf_unlock_sessions = {};
  if (local.pf_challenge_state) { local.pf_challenge_state.attempts = {}; local.pf_challenge_state.receipts = {}; }
  const question = await send({ type: 'GET_CHALLENGE' });
  if (expected === 'unavailable') {
    if (question.success || !/Level 4.*unavailable/.test(question.error)) throw new Error('Preview changed the approved Level 4 limit.');
    continue;
  }
  if (!question.success || (expected ? question.moduleId !== expected : !['tracking', 'memory', 'attention'].includes(question.moduleId))) {
    throw new Error(`Preview selected the wrong module at count ${count}.`);
  }
  const restored = await send({ type: 'GET_CHALLENGE' });
  if (restored.attemptId !== question.attemptId || JSON.stringify(restored.state) !== JSON.stringify(question.state)) throw new Error('Preview rerolled a saved challenge.');
  if (question.level <= 2) {
    const saved = local.pf_challenge_state.attempts[question.attemptId];
    const action = { type: 'CHALLENGE_ACTION', attemptId: question.attemptId, revision: question.revision,
      action: { type: 'submit', answer: String(saved.state.answer) } };
    const completed = await send(action), duplicate = await send(action);
    if (!completed.completed || !duplicate.completed || local.pf_blocked_domains[0].successfulUnlockCount !== count + 1) throw new Error('Preview completion did not count exactly once.');
  }
}
const manifestPath = resolve(root, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.name = 'Progressive Friction — Private Preview';
manifest.version_name = `${manifest.version} private preview`;
manifest.description = 'Private feedback build with arithmetic, equations and mini-games. Level 4 is not yet available.';
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Private preview verified: Levels 1–3 restore, counts advance once, developer controls are absent/rejected, and Level 4 stays unavailable.');
