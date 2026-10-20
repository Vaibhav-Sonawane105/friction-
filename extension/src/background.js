import { evaluateNavigation } from './services/blocker';
import {
  getBlockedDomains, getUnlockSessions, clearTabSession,
  completeUnlock, enableBackgroundWriter, storageOperations,
  readChallengeSnapshot,
  cleanupDevelopmentState,
} from './services/storage';
import { isDomainMatch } from './utils/domain';
import { createAccountController } from './services/account';
import { getChallengeRuntime as challengeRuntime } from '#challenge-runtime';

enableBackgroundWriter();

// Order messages and browser events through the same worker queue.
let taskTail = typeof __PF_CHALLENGE_DEV__ !== 'undefined' && __PF_CHALLENGE_DEV__ ? Promise.resolve() : cleanupDevelopmentState().catch(console.warn);
function enqueue(task) {
  const result = taskTail.then(task);
  taskTail = result.catch(() => {});
  return result;
}

let accountController;
function account() {
  if (!accountController) accountController = createAccountController({
    sessionStore: chrome.storage.session,
    stateStore: chrome.storage.local,
    readLocal: () => enqueue(getBlockedDomains),
    applyLocal: (expected, incoming) => enqueue(async () => {
      const result = await storageOperations.replaceWebsiteConfig(expected, incoming);
      const tabs = await chrome.tabs.query({});
      await Promise.all(tabs.map((tab) => notifyTab(tab.id, tab.url)));
      return result;
    }),
  });
  return accountController;
}

let syncScheduled = false;
function scheduleSync() {
  if (syncScheduled) return;
  syncScheduled = true;
  // Network requests never enter the blocking/session queue.
  Promise.resolve().then(() => account().action('sync')).catch(() => {}).finally(() => { syncScheduled = false; });
}

export function handleAccountMessage(message, sender) {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('index.html')) {
    return Promise.reject(new Error('Account actions require the extension popup.'));
  }
  return Promise.resolve().then(() => account().action(message.operation, message.args)).then((result) => ({ success: true, result }));
}

export async function getStatusForTab(tabId, targetUrl) {
  const blockedList = await getBlockedDomains();
  const sessions = await getUnlockSessions();
  const session = sessions[String(tabId)];
  if (session && (!/^https?:\/\//i.test(targetUrl || '') || !isDomainMatch(targetUrl, session.domain))) {
    await clearTabSession(tabId);
    delete sessions[String(tabId)];
  }
  const { shouldBlock, matchedDomain } = evaluateNavigation(targetUrl, tabId, blockedList, sessions);
  return {
    shouldBlock: Boolean(shouldBlock), matchedDomain: matchedDomain || null,
    difficultyLevel: blockedList.find((item) => item.domain === matchedDomain)?.difficultyLevel || 1,
    tabId,
  };
}

async function notifyTab(tabId, url, resetChallenge = false) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'TAB_URL_UPDATED', url, ...(resetChallenge ? { resetChallenge: true } : {}) });
  } catch { /* Browser-internal pages and loading tabs may have no listener. */ }
}

export async function handleNavigation(tabId, url) {
  let targetUrl = url;
  if (typeof __PF_CHALLENGE_DEV__ !== 'undefined' && __PF_CHALLENGE_DEV__) {
    const runtime = await challengeRuntime();
    await runtime.pruneTab(tabId, url);
    targetUrl = runtime.getTargetUrl(url);
  }
  // Cleanup is performed here even if there is no content script on the destination.
  await getStatusForTab(tabId, targetUrl);
  await notifyTab(tabId, url);
}

export async function handleMessage(message, sender) {
  if (sender.id !== chrome.runtime.id) throw new Error('Untrusted message sender.');
  if (typeof __PF_CHALLENGE_DEV__ !== 'undefined' && __PF_CHALLENGE_DEV__ && message?.type === 'PF_DEV_CHALLENGE_CONTROL') {
    const { handleChallengeControl } = challengeRuntime();
    const result = await handleChallengeControl(message, sender);
    if (message.operation !== 'INSPECT') {
      const tabs = await chrome.tabs.query({});
      const runtime = await challengeRuntime();
      await Promise.all(tabs.filter(tab => isDomainMatch(runtime.getTargetUrl(tab.url), result.domain)).map(tab => notifyTab(tab.id, tab.url, true)));
    }
    return { success: true, ...result };
  }
  const tabId = sender.tab?.id;
  if (message?.type === 'MUTATE_STORAGE') {
    if (!sender.url?.startsWith(chrome.runtime.getURL(''))) throw new Error('Settings changes require an extension page.');
    if (!['addBlockedDomain', 'removeBlockedDomain', 'toggleDomainEnabled'].includes(message.operation)) {
      throw new Error('Unsupported storage operation.');
    }
    if (!Array.isArray(message.args) || message.args.length !== 1 || typeof message.args[0] !== 'string') {
      throw new Error('Invalid settings request.');
    }
    // The outer worker queue serializes these alongside unlocks and navigation.
    const result = await storageOperations[message.operation](...message.args);
    scheduleSync();
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map((tab) => notifyTab(tab.id, tab.url)));
    return { success: true, result };
  }
  if (!Number.isInteger(tabId) || sender.frameId !== 0) throw new Error('A top-level tab is required.');
  const tab = await chrome.tabs.get(tabId);
  const standalone = sender.url?.startsWith(chrome.runtime.getURL('blocked.html'));
  // Reject late messages from a document that has already navigated away.
  if (!standalone && sender.documentId && chrome.webNavigation?.getFrame) {
    const frame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
    if (!frame || frame.documentId !== sender.documentId) throw new Error('This page has changed. Reload to try again.');
  }
  if (message.type === 'CHECK_TAB_STATUS') {
    const target = typeof __PF_CHALLENGE_DEV__ !== 'undefined' && __PF_CHALLENGE_DEV__ ? (await challengeRuntime()).getTargetUrl(tab.url) : tab.url;
    return getStatusForTab(tabId, target);
  }
  if (typeof __PF_CHALLENGE_DEV__ !== 'undefined' && __PF_CHALLENGE_DEV__) {
    if (message.type === 'COMPLETE_UNLOCK') throw new Error('Submit a validated challenge action instead.');
    if (message.type === 'GET_CHALLENGE' || message.type === 'CHALLENGE_ACTION') {
      if (!sender.documentId) throw new Error('A current document is required. Reload the page.');
      const frame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
      if (frame?.documentId !== sender.documentId) throw new Error('This page has changed. Reload to try again.');
      if (standalone && tab.url !== sender.url) throw new Error('The blocked page has changed.');
      const target = standalone ? new URL(sender.url).searchParams.get('target') : tab.url;
      const status = await getStatusForTab(tabId, target);
      if (!status.matchedDomain) throw new Error('This website is no longer restricted.');
      const context = { tabId, documentId: sender.documentId, domain: status.matchedDomain, epoch: (await readChallengeSnapshot()).epoch };
      const runtime = await challengeRuntime();
      const result = message.type === 'GET_CHALLENGE' ? await runtime.getChallenge(context) : await runtime.dispatchAction(context, message);
      return { success: true, ...result };
    }
  }
  if (message.type === 'COMPLETE_UNLOCK') {
    const target = standalone ? new URL(sender.url).searchParams.get('target') : tab.url;
    if (!target || !isDomainMatch(target, message.domain)) throw new Error('This tab has left the restricted website.');
    const status = await getStatusForTab(tabId, target);
    if (status.matchedDomain !== message.domain) throw new Error('This website is no longer restricted.');
    const result = await completeUnlock(tabId, message.domain);
    return { success: true, ...result };
  }
  if (message.type === 'LEAVE_TAB') {
    if (typeof __PF_CHALLENGE_DEV__ !== 'undefined' && __PF_CHALLENGE_DEV__) await (await challengeRuntime()).pruneTab(tabId);
    await clearTabSession(tabId);
    await chrome.tabs.create({});
    await chrome.tabs.remove(tabId);
    return { success: true };
  }
  throw new Error('Unsupported request.');
}

if (globalThis.chrome?.tabs?.onRemoved) {
  chrome.tabs.onRemoved.addListener((tabId) => {
    enqueue(async () => {
      if (typeof __PF_CHALLENGE_DEV__ !== 'undefined' && __PF_CHALLENGE_DEV__) await (await challengeRuntime()).pruneTab(tabId);
      await clearTabSession(tabId);
    }).catch(console.warn);
  });
}
if (globalThis.chrome?.tabs?.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) enqueue(() => handleNavigation(tabId, changeInfo.url)).catch(console.warn);
  });
}
if (globalThis.chrome?.webNavigation?.onCommitted) {
  chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0) enqueue(() => handleNavigation(details.tabId, details.url)).catch(console.warn);
  });
}
if (globalThis.chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const operation = message?.type === 'ACCOUNT'
      ? handleAccountMessage(message, sender)
      : enqueue(() => handleMessage(message, sender));
    operation.then(sendResponse, (error) => {
      sendResponse({ success: false, error: error.message || 'Could not update extension state.' });
    });
    return true;
  });
}

if (globalThis.chrome?.alarms?.onAlarm) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'pf_cloud_sync') scheduleSync();
  });
  chrome.alarms.get('pf_cloud_sync').then((alarm) => {
    if (!alarm) return chrome.alarms.create('pf_cloud_sync', { periodInMinutes: 1 });
  }).catch(console.warn);
}
