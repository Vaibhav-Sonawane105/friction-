import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createContext, SourceTextModule } from 'node:vm';
import { webcrypto } from 'node:crypto';

// Execute the emitted worker without DOM APIs and with MV3's dynamic-import restriction.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist-dev');
const local = {
  pf_blocked_domains: [{
    domain: 'example.com',
    enabled: true,
    successfulUnlockCount: 0,
    difficultyLevel: 1
  }]
};
const session = {};
let onMessage;
let clock = 1000;
class WorkerDate extends Date {
  static now() {
    return clock;
  }
}
const noopEvent = {
  addListener() {}
};
const store = data => ({
  get(keys, callback) {
    const value = structuredClone(Object.fromEntries((typeof keys === 'string' ? [keys] : keys).map(key => [key, data[key]])));
    if (callback) queueMicrotask(() => callback(value));else return Promise.resolve(value);
  },
  set(values, callback) {
    Object.assign(data, structuredClone(values));
    if (callback) queueMicrotask(callback);else return Promise.resolve();
  }
});
const context = createContext({
  console,
  URL,
  Date: WorkerDate,
  crypto: webcrypto,
  structuredClone,
  queueMicrotask,
  setTimeout,
  clearTimeout,
  fetch: async () => {
    throw new Error('Offline');
  },
  chrome: {
    runtime: {
      id: 'test-extension',
      getURL: path => `chrome-extension://test-extension/${path}`,
      onMessage: {
        addListener(listener) {
          onMessage = listener;
        }
      }
    },
    storage: {
      local: store(local),
      session: store(session)
    },
    tabs: {
      get: async () => ({
        id: 1,
        url: 'https://example.com/'
      }),
      query: async () => [],
      sendMessage: async () => {},
      onRemoved: noopEvent,
      onUpdated: noopEvent
    },
    webNavigation: {
      getFrame: async () => ({
        documentId: 'document-1'
      }),
      onCommitted: noopEvent
    },
    alarms: {
      onAlarm: noopEvent,
      get: async () => ({
        name: 'pf_cloud_sync'
      })
    }
  }
});
const modules = new Map();
async function load(url) {
  if (!modules.has(url)) {
    const source = await readFile(fileURLToPath(url), 'utf8');
    modules.set(url, new SourceTextModule(source, {
      context,
      identifier: url,
      initializeImportMeta(meta) {
        meta.url = url;
      },
      importModuleDynamically() {
        throw new Error('Dynamic import is not supported in a Manifest V3 service worker.');
      }
    }));
  }
  return modules.get(url);
}
const main = await load(pathToFileURL(resolve(root, 'background.js')).href);
await main.link((specifier, module) => load(new URL(specifier, module.identifier).href));
await main.evaluate();
const sender = {
  id: 'test-extension',
  frameId: 0,
  tab: {
    id: 1
  },
  url: 'https://example.com/',
  documentId: 'document-1'
};
const send = (message, source = sender) => new Promise(resolve => onMessage(message, source, resolve));
const status = await send({
  type: 'CHECK_TAB_STATUS'
});
if (!status.shouldBlock) throw new Error(`Built development worker failed to block: ${JSON.stringify(status)}`);
const popup = {
  id: 'test-extension',
  url: 'chrome-extension://test-extension/index.html'
};
async function control(operation, args) {
  const r = await send({
    type: 'PF_DEV_CHALLENGE_CONTROL',
    domain: 'example.com',
    operation,
    ...args
  }, popup);
  if (!r.success) throw Error(JSON.stringify(r));
}
for (const count of [0, 21, 31, 51]) {
  for (const id of ['maths', 'memory', 'route', 'ordering']) {
    await control('SET_COUNT', {
      count
    });
    await control('PREPARE_CHALLENGE', {
      moduleId: id
    });
    let a = await send({
      type: 'GET_CHALLENGE'
    });
    if (!a.success || a.moduleId !== id) throw Error(JSON.stringify(a));
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
console.log('Development worker verified all 16 type/level combinations, restoration and exactly-once completion.');
