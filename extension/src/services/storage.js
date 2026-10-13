/**
 * Storage Service for Progressive Friction Extension
 * Handles local persistence via chrome.storage.local with browser localStorage fallback.
 */

import { normalizeDomain } from '../utils/domain';

export const FREE_TIER_DOMAIN_LIMIT = 2;

const STORAGE_KEYS = {
  BLOCKED_DOMAINS: 'pf_blocked_domains',
  UNLOCK_SESSIONS: 'pf_unlock_sessions',
};

// In-memory or localStorage fallback for development outside Chrome extension environment
const isChromeStorageAvailable =
  typeof chrome !== 'undefined' &&
  chrome.storage &&
  chrome.storage.local;

async function getFromStorage(key, defaultValue = null) {
  if (isChromeStorageAvailable) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
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
  if (isChromeStorageAvailable) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve(true);
      });
    });
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
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
export async function addBlockedDomain(rawDomain) {
  const domain = normalizeDomain(rawDomain);
  if (!domain) {
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
export async function removeBlockedDomain(domainToRemove) {
  const domain = normalizeDomain(domainToRemove);
  const existing = await getBlockedDomains();
  const updated = existing.filter((item) => item.domain !== domain);
  await setToStorage(STORAGE_KEYS.BLOCKED_DOMAINS, updated);
  return updated;
}

/**
 * Toggles enabled status of a domain.
 */
export async function toggleDomainEnabled(domainToToggle) {
  const domain = normalizeDomain(domainToToggle);
  const existing = await getBlockedDomains();
  const updated = existing.map((item) =>
    item.domain === domain ? { ...item, enabled: !item.enabled } : item
  );
  await setToStorage(STORAGE_KEYS.BLOCKED_DOMAINS, updated);
  return updated;
}

/**
 * Increments difficulty and successful unlock count for a website after a correct challenge.
 */
export async function recordSuccessfulUnlock(domain) {
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
  return sessions && typeof sessions === 'object' ? sessions : {};
}

/**
 * Sets a tab session as unlocked for a given domain.
 */
export async function setTabUnlocked(tabId, domain) {
  const normalized = normalizeDomain(domain);
  const sessions = await getUnlockSessions();
  sessions[String(tabId)] = {
    domain: normalized,
    unlockedAt: Date.now(),
  };
  await setToStorage(STORAGE_KEYS.UNLOCK_SESSIONS, sessions);
}

/**
 * Clears an unlock session for a specific tab.
 */
export async function clearTabSession(tabId) {
  const sessions = await getUnlockSessions();
  if (sessions[String(tabId)]) {
    delete sessions[String(tabId)];
    await setToStorage(STORAGE_KEYS.UNLOCK_SESSIONS, sessions);
  }
}
