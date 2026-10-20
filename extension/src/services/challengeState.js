import { getLevel } from '../challenges/progression';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0;
const invalid = () => { throw new Error('Unsupported or invalid saved challenge state. Saved data was preserved.'); };

export function validateChallengeState(state) {
  if (!object(state) || state.schemaVersion !== 1 || !object(state.domains) || !object(state.attempts) || !object(state.receipts)) invalid();
  for (const domain of Object.values(state.domains)) if (!object(domain) || !text(domain.generation) || typeof domain.enabled !== 'boolean') invalid();
  for (const [id, attempt] of Object.entries(state.attempts)) {
    if (!object(attempt) || attempt.id !== id || !text(attempt.domain) || !text(attempt.generation) || !text(attempt.epoch) ||
        !['tab','domain'].includes(attempt.persistence) || !(Number.isInteger(attempt.tabId) && attempt.tabId >= 0 || attempt.persistence === 'domain' && attempt.tabId === null) ||
        ![1,2,3,4].includes(attempt.level) || !Number.isSafeInteger(attempt.count) || attempt.count < 0 ||
        !text(attempt.moduleId) || !Number.isSafeInteger(attempt.moduleVersion) || attempt.moduleVersion < 1 ||
        !Number.isSafeInteger(attempt.revision) || attempt.revision < 0 || !['active','completed'].includes(attempt.status) ||
        !object(attempt.state) || (attempt.developmentTest !== undefined && typeof attempt.developmentTest !== 'boolean')) invalid();
  }
  for (const [id, receipt] of Object.entries(state.receipts)) {
    const attempt = state.attempts[id];
    if (!object(receipt) || receipt.attemptId !== id || !attempt || attempt.status !== 'completed' || !object(receipt.result)) invalid();
  }
}

export function invalidateDomain(state, domain) {
  validateChallengeState(state);
  const next = structuredClone(state);
  if (Object.hasOwn(next.domains, domain)) next.domains[domain].generation = crypto.randomUUID();
  for (const [id, attempt] of Object.entries(next.attempts)) if (attempt.domain === domain) {
    delete next.attempts[id]; delete next.receipts[id];
  }
  return next;
}

export function migrateChallengeState({ domains, stored, epoch }) {
  if (!Array.isArray(domains) || !text(epoch)) invalid();
  if (stored !== undefined) validateChallengeState(stored);
  const next = stored === undefined ? { schemaVersion: 1, domains: {}, attempts: {}, receipts: {} } : structuredClone(stored);
  const configured = new Set();
  for (const entry of domains) {
    getLevel(entry.successfulUnlockCount);
    if (!text(entry.domain)) invalid();
    configured.add(entry.domain);
    const enabled = entry.enabled !== false;
    const previous = Object.hasOwn(next.domains, entry.domain) ? next.domains[entry.domain] : null;
    // Use defineProperty so imported keys cannot mutate an object's prototype.
    Object.defineProperty(next.domains, entry.domain, { enumerable: true, configurable: true, writable: true,
      value: { generation: previous && previous.enabled === enabled ? previous.generation : crypto.randomUUID(), enabled } });
  }
  for (const domain of Object.keys(next.domains)) if (!configured.has(domain)) delete next.domains[domain];
  for (const [id, attempt] of Object.entries(next.attempts)) {
    const entry = Object.hasOwn(next.domains, attempt.domain) ? next.domains[attempt.domain] : null;
    if (attempt.moduleId === 'patterns' || !entry?.enabled || entry.generation !== attempt.generation || attempt.epoch !== epoch && attempt.persistence === 'tab') {
      delete next.attempts[id]; delete next.receipts[id];
    } else if (attempt.epoch !== epoch) {
      if (attempt.status === 'completed') { delete next.attempts[id]; delete next.receipts[id]; }
      else { attempt.epoch = epoch; attempt.tabId = null; delete attempt.owner; }
    }
  }
  return next;
}

export function sanitizeProductionState(state, sessions) {
  validateChallengeState(state);
  const challengeState = structuredClone(state);
  for (const [id, attempt] of Object.entries(challengeState.attempts)) if (attempt.developmentTest) {
    delete challengeState.attempts[id]; delete challengeState.receipts[id];
  }
  return { challengeState, sessions: Object.fromEntries(Object.entries(sessions).filter(([, session]) => !session.developmentTest)) };
}
