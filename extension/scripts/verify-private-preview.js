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
for (const count of [0, 21, 31, 51]) {
  const selected = new Set();
  for (let sample = 0; sample < 4; sample++) {
    // Seed fixtures only in this external verifier; the distributed build has no count editor.
    local.pf_blocked_domains[0].successfulUnlockCount = count;
    local.pf_unlock_sessions = {};
    if (local.pf_challenge_state) {
      local.pf_challenge_state.attempts = {};
      local.pf_challenge_state.receipts = {};
    }
    let a = await send({
      type: 'GET_CHALLENGE'
    });
    if (!a.success || a.level !== [0, 21, 31, 51].indexOf(count) + 1) throw Error(JSON.stringify(a));
    const id = a.moduleId;
    if (!['maths', 'memory', 'route', 'ordering'].includes(id) || selected.has(id)) throw Error('Invalid rotation');
    selected.add(id);
    const saved = local.pf_challenge_state.attempts[a.attemptId].state;
    const actions = [];
    if (id === 'maths') for (const q of saved.questions) actions.push({
      type: 'submit',
      answer: String(q.answers?.[0] ?? q.answer)
    });
    if (id === 'memory') {
      for (const shape of new Set(saved.cards)) saved.cards.forEach((c, i) => {
        if (c === shape) actions.push({
          type: 'flip',
          index: i
        });
      });
    }
    if (id === 'route') {
      const {
        solveRoute
      } = await import('../src/challenges/modules/route/solver.js');
      const path = solveRoute(saved.board);
      actions.push(...path.slice(1).map(cell => ({
        type: 'extend',
        cell
      })), {
        type: 'submit'
      });
    }
    if (id === 'ordering') {
      const {
        brokenClueIds
      } = await import('../src/challenges/modules/ordering/clues.js');
      function solve(prefix, remaining) {
        if (!remaining.length) return brokenClueIds(prefix, saved.board.clues).length ? null : prefix;
        for (const item of remaining) {
          const win = solve([...prefix, item], remaining.filter(x => x !== item));
          if (win) return win;
        }
      }
      const row = [...saved.row],
        win = solve([], row);
      for (let to = 0; to < row.length; to++) {
        const from = row.indexOf(win[to]);
        if (from !== to) {
          actions.push({
            type: 'reorder',
            from,
            to
          });
          row.splice(to, 0, row.splice(from, 1)[0]);
        }
      }
      actions.push({
        type: 'submit'
      });
    }
    for (const [i, action] of actions.entries()) {
      const req = {
        type: 'CHALLENGE_ACTION',
        attemptId: a.attemptId,
        revision: a.revision,
        action
      };
      a = await send(req);
      if (!a.success) throw Error(JSON.stringify(a));
      if (i === 0) {
        const restored = await send({
          type: 'GET_CHALLENGE'
        });
        if (restored.attemptId !== a.attemptId || JSON.stringify(restored.state) !== JSON.stringify(a.state)) throw Error('Restore failed');
      }
      if (i === actions.length - 1) {
        const dup = await send(req);
        if (!dup.completed || !a.completed) throw Error('Completion failed');
      } else if (a.completed) throw Error('Unlocked early');
    }
    if (local.pf_blocked_domains[0].successfulUnlockCount !== count + 1) throw Error('Count mismatch');
  }
}
const manifestPath = resolve(root, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.name = 'Progressive Friction — Private Preview';
manifest.version_name = `${manifest.version} private preview`;
manifest.description = 'Private feedback build with maths, memory, route planning and logical ordering at all four levels.';
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Private preview verified: all 16 type/level combinations restore and complete exactly once; rotation works and developer controls are absent/rejected.');
