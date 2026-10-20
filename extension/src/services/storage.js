/**
 * Storage Service for Progressive Friction Extension
 * Handles local persistence via chrome.storage.local with browser localStorage fallback.
 */

import { normalizeDomain, isValidDomain } from '../utils/domain';
import { sameConfig, websiteConfig } from './syncModel';
import { migrateChallengeState, sanitizeProductionState, validateChallengeState } from './challengeState';

export const FREE_TIER_DOMAIN_LIMIT = 2;

const STORAGE_KEYS = {
  BLOCKED_DOMAINS: 'pf_blocked_domains',
  UNLOCK_SESSIONS: 'pf_unlock_sessions',
  CHALLENGE_STATE: 'pf_challenge_state',
};

// In-memory or localStorage fallback for development outside Chrome extension environment
function isChromeStorageAvailable() {
  return (
    typeof chrome !== 'undefined' &&
    Boolean(chrome.storage?.local)
  );
}

async function getFromStorage(key, defaultValue = undefined) {
  if (isChromeStorageAvailable()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime?.lastError) return reject(new Error(chrome.runtime.lastError.message));
        resolve(result[key] !== undefined ? result[key] : defaultValue);
      });
    });
  }

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

async function setToStorage(key, value) {
  if (isChromeStorageAvailable()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime?.lastError) return reject(new Error(chrome.runtime.lastError.message));
        resolve(true);
      });
    });
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    throw new Error('Could not save extension settings. Please try again.');
  }
}

/**
 * Retrieves all configured blocked domains.
 * @returns {Promise<Array<{ domain: string, enabled: boolean, difficultyLevel: number, successfulUnlockCount: number, createdAt: number }>>}
 */
export async function getBlockedDomains() {
  const list = await getFromStorage(STORAGE_KEYS.BLOCKED_DOMAINS, []);
  return Array.isArray(list) ? list : [];
}

/**
 * Adds a new domain to the block list.
 * Respects FREE_TIER_DOMAIN_LIMIT.
 */
async function addBlockedDomainLocal(rawDomain) {
  const domain = normalizeDomain(rawDomain);
  if (!isValidDomain(domain)) {
    throw new Error('Please enter a valid website domain.');
  }

  const existing = await getBlockedDomains();

  if (existing.some((item) => item.domain === domain)) {
    throw new Error(`${domain} is already on your restricted list.`);
  }

  if (existing.length >= FREE_TIER_DOMAIN_LIMIT) {
    throw new Error(`Free plan limit reached (max ${FREE_TIER_DOMAIN_LIMIT} websites).`);
  }

  const newEntry = {
    domain,
    enabled: true,
    difficultyLevel: 1,
    successfulUnlockCount: 0,
    createdAt: Date.now(),
  };

  const updated = [...existing, newEntry];
  await setToStorage(STORAGE_KEYS.BLOCKED_DOMAINS, updated);
  return newEntry;
}

/**
 * Removes a domain from the block list.
 */
async function removeBlockedDomainLocal(domainToRemove) {
  const domain = normalizeDomain(domainToRemove);
  const existing = await getBlockedDomains();
  const updated = existing.filter((item) => item.domain !== domain);
  const sessions = await getUnlockSessions();
  for (const [tabId, session] of Object.entries(sessions)) {
    if (session.domain === domain) delete sessions[tabId];
  }
  await setValues({ [STORAGE_KEYS.BLOCKED_DOMAINS]: updated, [STORAGE_KEYS.UNLOCK_SESSIONS]: sessions });
  return updated;
}

/**
 * Toggles enabled status of a domain.
 */
async function toggleDomainEnabledLocal(domainToToggle) {
  const domain = normalizeDomain(domainToToggle);
  const existing = await getBlockedDomains();
  const updated = existing.map((item) =>
    item.domain === domain ? { ...item, enabled: !item.enabled } : item
  );
  const sessions = await getUnlockSessions();
  for (const [tabId, session] of Object.entries(sessions)) {
    if (session.domain === domain) delete sessions[tabId];
  }
  await setValues({ [STORAGE_KEYS.BLOCKED_DOMAINS]: updated, [STORAGE_KEYS.UNLOCK_SESSIONS]: sessions });
  return updated;
}

/**
 * Increments difficulty and successful unlock count for a website after a correct challenge.
 */
async function recordSuccessfulUnlockLocal(domain) {
  const normalized = normalizeDomain(domain);
  const existing = await getBlockedDomains();

  let targetItem = null;
  const updated = existing.map((item) => {
    if (item.domain === normalized) {
      const nextLevel = Math.min(10, (item.difficultyLevel || 1) + 1);
      const nextCount = (item.successfulUnlockCount || 0) + 1;
      targetItem = {
        ...item,
        difficultyLevel: nextLevel,
        successfulUnlockCount: nextCount,
        lastUnlockedAt: Date.now(),
      };
      return targetItem;
    }
    return item;
  });

  if (targetItem) {
    await setToStorage(STORAGE_KEYS.BLOCKED_DOMAINS, updated);
  }

  return targetItem;
}

/**
 * Retrieves per-tab unlock session state.
 */
export async function getUnlockSessions() {
  const sessions = await getFromStorage(STORAGE_KEYS.UNLOCK_SESSIONS, {});
  const epoch = await getSessionEpoch();
  return Object.fromEntries(Object.entries(sessions || {}).filter(([, session]) => session.epoch === epoch &&
    (typeof __PF_CHALLENGE_DEV__ !== 'undefined' && __PF_CHALLENGE_DEV__ || !session.developmentTest)));
}

/**
 * Sets a tab session as unlocked for a given domain.
 */
async function setTabUnlockedLocal(tabId, domain) {
  const normalized = normalizeDomain(domain);
  const sessions = await getUnlockSessions();
  sessions[String(tabId)] = {
    domain: normalized,
    unlockedAt: Date.now(),
    epoch: await getSessionEpoch(),
  };
  await setToStorage(STORAGE_KEYS.UNLOCK_SESSIONS, sessions);
}

/**
 * Clears an unlock session for a specific tab.
 */
async function clearTabSessionLocal(tabId) {
  const sessions = await getUnlockSessions();
  if (sessions[String(tabId)]) {
    delete sessions[String(tabId)];
    await setToStorage(STORAGE_KEYS.UNLOCK_SESSIONS, sessions);
  }
}


let backgroundWriter = false;
let mutationTail = Promise.resolve();
let epochPromise;

export function enableBackgroundWriter() {
  backgroundWriter = true;
}

async function getSessionEpoch() {
  if (!globalThis.chrome?.storage?.session) return 'preview';
  if (!epochPromise) {
    epochPromise = (async () => {
      const stored = await chrome.storage.session.get('pf_session_epoch');
      if (stored.pf_session_epoch) return stored.pf_session_epoch;
      const epoch = crypto.randomUUID();
      await chrome.storage.session.set({ pf_session_epoch: epoch });
      return epoch;
    })().catch((error) => { epochPromise = null; throw error; });
  }
  return epochPromise;
}

function mutate(operation, args) {
  if (!backgroundWriter && globalThis.chrome?.runtime?.sendMessage) {
    return chrome.runtime.sendMessage({ type: 'MUTATE_STORAGE', operation, args }).then((response) => {
      if (!response?.success) throw new Error(response?.error || 'Could not save extension state.');
      return response.result;
    });
  }
  const result = mutationTail.then(() => storageOperations[operation](...args));
  mutationTail = result.catch(() => {});
  return result;
}

// One storage.set commits both values so unlock retries cannot count twice.
async function completeUnlockLocal(tabId, domain) {
  const sessions = await getUnlockSessions();
  const normalized = normalizeDomain(domain);
  if (sessions[String(tabId)]?.domain === normalized) return { alreadyUnlocked: true };
  const domains = await getBlockedDomains();
  const entry = domains.find((item) => item.domain === normalized && item.enabled !== false);
  if (!entry) throw new Error('This website is no longer restricted.');
  const record = {
    ...entry,
    difficultyLevel: Math.min(10, (entry.difficultyLevel || 1) + 1),
    successfulUnlockCount: (entry.successfulUnlockCount || 0) + 1,
    lastUnlockedAt: Date.now(),
  };
  sessions[String(tabId)] = { domain: normalized, unlockedAt: Date.now(), epoch: await getSessionEpoch() };
  const values = {
    [STORAGE_KEYS.BLOCKED_DOMAINS]: domains.map((item) => item.domain === normalized ? record : item),
    [STORAGE_KEYS.UNLOCK_SESSIONS]: sessions,
  };
  await setValues(values);
  return { record };
}

export const storageOperations = {
  addBlockedDomain: addBlockedDomainLocal,
  removeBlockedDomain: removeBlockedDomainLocal,
  toggleDomainEnabled: toggleDomainEnabledLocal,
  completeUnlock: completeUnlockLocal,
  replaceWebsiteConfig: async (expected, incoming) => {
    const existing = await getBlockedDomains();
    if (!sameConfig(existing, expected)) throw new Error('Local list changed during sync. Retrying shortly.');
    const config = websiteConfig(incoming);
    const updated = config.map((item) => {
      const previous = existing.find((entry) => entry.domain === item.domain);
      return { difficultyLevel: 1, successfulUnlockCount: 0, createdAt: Date.now(), ...previous, ...item };
    });
    const sessions = await getUnlockSessions();
    for (const [tabId, session] of Object.entries(sessions)) {
      if (!config.some((item) => item.domain === session.domain && item.enabled)) delete sessions[tabId];
    }
    await setValues({ [STORAGE_KEYS.BLOCKED_DOMAINS]: updated, [STORAGE_KEYS.UNLOCK_SESSIONS]: sessions });
    return updated;
  },
};

export const addBlockedDomain = (...args) => mutate('addBlockedDomain', args);
export const removeBlockedDomain = (...args) => mutate('removeBlockedDomain', args);
export const toggleDomainEnabled = (...args) => mutate('toggleDomainEnabled', args);
export const completeUnlock = (...args) => mutate('completeUnlock', args);
// Internal lifecycle helpers are never exposed through runtime messages.
Object.assign(storageOperations, {
  recordSuccessfulUnlock: recordSuccessfulUnlockLocal,
  setTabUnlocked: setTabUnlockedLocal,
  clearTabSession: clearTabSessionLocal,
});
export const recordSuccessfulUnlock = (...args) => mutate('recordSuccessfulUnlock', args);
export const setTabUnlocked = (...args) => mutate('setTabUnlocked', args);
export const clearTabSession = (...args) => mutate('clearTabSession', args);

async function setValues(values) {
  // Settings and sync invalidate challenge identities in the same logical commit.
  if (values[STORAGE_KEYS.BLOCKED_DOMAINS] && !Object.hasOwn(values, STORAGE_KEYS.CHALLENGE_STATE)) {
    const stored = await getFromStorage(STORAGE_KEYS.CHALLENGE_STATE, undefined);
    if (stored !== undefined) values[STORAGE_KEYS.CHALLENGE_STATE] = migrateChallengeState({
      domains: values[STORAGE_KEYS.BLOCKED_DOMAINS], stored, epoch: await getSessionEpoch(),
    });
  }
  if (isChromeStorageAvailable()) {
    await new Promise((resolve, reject) => chrome.storage.local.set(values, () => {
      if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    }));
  } else {
    for (const [key, value] of Object.entries(values)) await setToStorage(key, value);
  }
}

// Internal worker/coordinator primitives. Never listed in runtime mutation operations.
export async function readChallengeSnapshot() {
  const domains = await getBlockedDomains();
  const sessions = await getUnlockSessions();
  const epoch = await getSessionEpoch();
  const stored = await getFromStorage(STORAGE_KEYS.CHALLENGE_STATE, undefined);
  let challengeState = migrateChallengeState({ domains, stored, epoch });
  const development = typeof __PF_CHALLENGE_DEV__ !== 'undefined' && __PF_CHALLENGE_DEV__;
  if (!development) challengeState = sanitizeProductionState(challengeState, sessions).challengeState;
  return { domains, sessions, challengeState, epoch };
}

export async function writeChallengeSnapshot({ domains, sessions, challengeState }) {
  await setValues({ [STORAGE_KEYS.BLOCKED_DOMAINS]: domains, [STORAGE_KEYS.UNLOCK_SESSIONS]: sessions,
    [STORAGE_KEYS.CHALLENGE_STATE]: challengeState });
}

export async function cleanupDevelopmentState() {
  const stored = await getFromStorage(STORAGE_KEYS.CHALLENGE_STATE, undefined);
  const sessions = await getFromStorage(STORAGE_KEYS.UNLOCK_SESSIONS, {});
  const cleanSessions = Object.fromEntries(Object.entries(sessions || {}).filter(([, session]) => !session.developmentTest));
  const values = {};
  if (JSON.stringify(sessions) !== JSON.stringify(cleanSessions)) values[STORAGE_KEYS.UNLOCK_SESSIONS] = cleanSessions;
  if (stored !== undefined) {
    try {
      validateChallengeState(stored);
      const clean = sanitizeProductionState(stored, cleanSessions).challengeState;
      if (JSON.stringify(clean) !== JSON.stringify(stored)) values[STORAGE_KEYS.CHALLENGE_STATE] = clean;
    } catch { /* Preserve unsupported/corrupt records for explicit recovery. */ }
  }
  if (Object.keys(values).length) await setValues(values);
}
