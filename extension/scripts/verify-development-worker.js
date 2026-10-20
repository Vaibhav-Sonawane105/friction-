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
let clock = 1000;
class WorkerDate extends Date { static now() { return clock; } }
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
const context = createContext({ console, URL, Date: WorkerDate, crypto: webcrypto, structuredClone, queueMicrotask, setTimeout, clearTimeout,
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
const popup = { id: 'test-extension', url: 'chrome-extension://test-extension/index.html' };
for (const [variant, count] of [['linear', 21], ['derivative', 30]]) {
  const changed = await send({ type: 'PF_DEV_CHALLENGE_CONTROL', operation: 'SET_COUNT', domain: 'example.com', count }, popup);
  if (!changed.success) throw new Error(`Built Level 2 count setup failed: ${JSON.stringify(changed)}`);
  const forced = await send({ type: 'PF_DEV_CHALLENGE_CONTROL', operation: 'PREPARE_CHALLENGE', domain: 'example.com', moduleId: 'equations', variant }, popup);
  if (!forced.success) throw new Error(`Built Level 2 variant setup failed: ${JSON.stringify(forced)}`);
  const question = await send({ type: 'GET_CHALLENGE' });
  if (!question.success || question.moduleId !== 'equations' || question.state.variant !== variant) throw new Error(`Built Level 2 selection failed: ${JSON.stringify(question)}`);
  const solution = local.pf_challenge_state.attempts[question.attemptId].state.answer;
  const action = answer => ({ type: 'CHALLENGE_ACTION', attemptId: question.attemptId, revision: question.revision, action: { type: 'submit', answer: String(answer) } });
  const wrong = await send(action(solution + 1));
  const restored = await send({ type: 'GET_CHALLENGE' });
  if (!wrong.success || wrong.completed || restored.attemptId !== question.attemptId || JSON.stringify(restored.state) !== JSON.stringify(question.state)) throw new Error('Built Level 2 did not retain the question after a wrong answer.');
  const result = await send(action(solution)), duplicate = await send(action(solution));
  if (!result.success || !result.completed || !duplicate.success || local.pf_blocked_domains[0].successfulUnlockCount !== count + 1) throw new Error('Built Level 2 completion did not count exactly once.');
}
for (const count of [31, 50]) {
  const changed = await send({ type: 'PF_DEV_CHALLENGE_CONTROL', operation: 'SET_COUNT', domain: 'example.com', count }, popup);
  const forced = await send({ type: 'PF_DEV_CHALLENGE_CONTROL', operation: 'PREPARE_CHALLENGE', domain: 'example.com', moduleId: 'tracking' }, popup);
  if (!changed.success || !forced.success) throw new Error('Built tracking controls failed.');
  let attempt = await send({ type: 'GET_CHALLENGE' });
  if (!attempt.success || attempt.moduleId !== 'tracking' || attempt.state.plan) throw new Error('Built tracking selection failed or exposed its plan too early.');
  const action = data => ({ type: 'CHALLENGE_ACTION', attemptId: attempt.attemptId, revision: attempt.revision, action: data });
  for (let i = 0; i < 3; i++) {
    attempt = await send(action({ type: 'start', mode: 'motion' }));
    if (!attempt.success || attempt.state.size !== i + 3) throw new Error('Built tracking round failed to start.');
    const plan = attempt.state.plan;
    let answer = plan.target;
    for (const [a,b] of plan.swaps) { if (answer === a) answer = b; else if (answer === b) answer = a; }
    const early = await send(action({ type: 'finish' }));
    if (early.success) throw new Error('Built tracking allowed an early motion finish.');
    clock += attempt.state.durationMs;
    attempt = await send(action({ type: 'finish' }));
    if (!attempt.success || attempt.state.plan) throw new Error('Built tracking failed to hide its plan at selection.');
    const request = action({ type: 'choose', index: answer });
    const result = await send(request), duplicate = await send(request);
    const final = i === 2;
    if (!result.success || !duplicate.success || result.completed !== final || result.state.completedRounds !== i + 1 ||
        JSON.stringify(duplicate.state) !== JSON.stringify(result.state) || local.pf_blocked_domains[0].successfulUnlockCount !== count + (final ? 1 : 0)) throw new Error('Built tracking completion did not count exactly once.');
    attempt = result;
  }
}
for (const count of [31, 50]) {
  const changed = await send({ type: 'PF_DEV_CHALLENGE_CONTROL', operation: 'SET_COUNT', domain: 'example.com', count }, popup);
  const forced = await send({ type: 'PF_DEV_CHALLENGE_CONTROL', operation: 'PREPARE_CHALLENGE', domain: 'example.com', moduleId: 'memory' }, popup);
  if (!changed.success || !forced.success) throw new Error('Built memory controls failed.');
  let attempt = await send({ type: 'GET_CHALLENGE' });
  if (!attempt.success || attempt.moduleId !== 'memory' || attempt.state.cards.length !== 12 || attempt.state.totalPairs !== 6 || attempt.state.cards.some(card => card.value !== null)) throw new Error('Built memory selection leaked hidden cards or failed.');
  const cards = local.pf_challenge_state.attempts[attempt.attemptId].state.cards;
  async function flip(index) {
    const request = { type: 'CHALLENGE_ACTION', attemptId: attempt.attemptId, revision: attempt.revision, action: { type: 'flip', index } };
    const result = await send(request), duplicate = await send(request);
    if (!result.success || !duplicate.success || JSON.stringify(result.state) !== JSON.stringify(duplicate.state)) throw new Error('Built memory duplicate action changed progress.');
    if (local.pf_blocked_domains[0].successfulUnlockCount !== count + (result.completed ? 1 : 0)) throw new Error('Built memory count did not advance exactly once.');
    if (!result.completed && !(await send({ type: 'CHECK_TAB_STATUS' })).shouldBlock) throw new Error('Built memory board unlocked early.');
    attempt = result;
  }
  const different = cards.findIndex(card => card !== cards[0]);
  await flip(0); await flip(different);
  const restored = await send({ type: 'GET_CHALLENGE' });
  if (JSON.stringify(restored.state) !== JSON.stringify(attempt.state)) throw new Error('Built memory did not restore a mismatch.');
  const partner = cards.findIndex((card, index) => index !== 0 && card === cards[0]);
  await flip(partner); await flip(0);
  if (attempt.state.pairsMatched !== 1 || attempt.state.cards[different].value !== null) throw new Error('Built memory mismatch recovery failed.');
  for (const shape of new Set(cards)) {
    const indices = cards.flatMap((card, index) => card === shape ? [index] : []);
    if (attempt.state.cards[indices[0]].matched) continue;
    await flip(indices[0]); await flip(indices[1]);
  }
  if (!attempt.completed || attempt.state.pairsMatched !== 6) throw new Error('Built memory board did not complete.');
}
for (const count of [31, 50]) {
  const changed = await send({ type: 'PF_DEV_CHALLENGE_CONTROL', operation: 'SET_COUNT', domain: 'example.com', count }, popup);
  const forced = await send({ type: 'PF_DEV_CHALLENGE_CONTROL', operation: 'PREPARE_CHALLENGE', domain: 'example.com', moduleId: 'attention' }, popup);
  if (!changed.success || !forced.success) throw new Error('Built attention controls failed.');
  let attempt = await send({ type: 'GET_CHALLENGE' });
  const matches = (tile, target) => tile.shape === target.shape && tile.color === target.color && tile.fill === target.fill;
  if (!attempt.success || attempt.moduleId !== 'attention' || attempt.state.tiles.length !== 12) throw new Error('Built attention selection failed.');
  for (const [stage, size] of [[1, 12], [2, 16], [3, 20]]) {
    if (attempt.state.stageNumber !== stage || attempt.state.tiles.length !== size) throw new Error('Built attention stage did not advance.');
    const action = index => ({ type: 'CHALLENGE_ACTION', attemptId: attempt.attemptId, revision: attempt.revision, action: { type: 'select', index } });
    const target = attempt.state.target;
    const nearIndices = [
      attempt.state.tiles.findIndex(tile => tile.shape === target.shape && tile.color !== target.color),
      attempt.state.tiles.findIndex(tile => tile.shape !== target.shape && tile.color === target.color),
      ...(stage === 3 ? [attempt.state.tiles.findIndex(tile => tile.shape === target.shape && tile.color === target.color && tile.fill !== target.fill)] : []),
    ];
    for (const index of nearIndices) {
      if (index < 0) throw new Error('Built attention is missing a required near-match distractor.');
      const wrong = await send(action(index));
      if (!wrong.success || JSON.stringify(wrong.state) !== JSON.stringify(attempt.state)) throw new Error('Built attention near match changed progress.');
    }
    const targets = attempt.state.tiles.flatMap((tile, index) => matches(tile, attempt.state.target) ? [index] : []);
    for (const [position, index] of targets.entries()) {
      const request = action(index), result = await send(request), duplicate = await send(request);
      const final = stage === 3 && position === targets.length - 1;
      if (!result.success || !duplicate.success || result.completed !== final || JSON.stringify(result.state) !== JSON.stringify(duplicate.state) ||
          local.pf_blocked_domains[0].successfulUnlockCount !== count + (final ? 1 : 0)) throw new Error('Built attention progress/completion was not saved exactly once.');
      if (!final) {
        const restored = await send({ type: 'GET_CHALLENGE' });
        if (JSON.stringify(restored.state) !== JSON.stringify(result.state) || !(await send({ type: 'CHECK_TAB_STATUS' })).shouldBlock) throw new Error('Built attention restoration failed or unlocked early.');
      }
      attempt = result;
    }
  }
}
console.log('Development worker verified: arithmetic, both Level 2 variants, tracking, memory and attention restore and complete exactly once, without DOM APIs or dynamic imports.');
