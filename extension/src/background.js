import { evaluateNavigation } from './services/blocker';
import {
  getBlockedDomains,
  getUnlockSessions,
  setTabUnlocked,
  clearTabSession,
  recordSuccessfulUnlock,
} from './services/storage';
import { normalizeDomain } from './utils/domain';

/**
 * Evaluates whether a tab/url should be blocked.
 */
export async function getStatusForTab(tabId, targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return { shouldBlock: false, matchedDomain: null, difficultyLevel: 1, tabId };
  }

  const blockedList = await getBlockedDomains();
  const activeSessions = await getUnlockSessions();

  // If tab was previously unlocked for a domain, but now navigates to an entirely different domain, expire the session
  const currentTabSession = activeSessions[String(tabId)];
  if (currentTabSession && currentTabSession.domain) {
    const targetDomain = normalizeDomain(targetUrl);
    // Don't expire if navigating within the same domain or to extension pages
    if (
      targetDomain &&
      !targetDomain.endsWith(currentTabSession.domain) &&
      !targetUrl.startsWith('chrome-extension://')
    ) {
      await clearTabSession(tabId);
      // Remove from in-memory activeSessions for the subsequent check
      delete activeSessions[String(tabId)];
    }
  }

  const { shouldBlock, matchedDomain } = evaluateNavigation(
    targetUrl,
    tabId,
    blockedList,
    activeSessions
  );

  let difficultyLevel = 1;
  if (matchedDomain) {
    const found = blockedList.find((d) => d.domain === matchedDomain);
    difficultyLevel = found?.difficultyLevel || 1;
  }

  return {
    shouldBlock: Boolean(shouldBlock),
    matchedDomain: matchedDomain || null,
    difficultyLevel,
    tabId,
  };
}

// Clean up sessions when a tab is closed
if (typeof chrome !== 'undefined' && chrome.tabs?.onRemoved) {
  chrome.tabs.onRemoved.addListener((tabId) => {
    clearTabSession(tabId);
  });
}

// Notify tab when navigation / update occurs (useful for SPAs like YouTube)
if (typeof chrome !== 'undefined' && chrome.tabs?.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
      chrome.tabs.sendMessage(tabId, {
        type: 'TAB_URL_UPDATED',
        url: changeInfo.url,
      }).catch(() => {
        // Tab might not be listening yet, which is expected
      });
    }
  });
}

// Handle runtime messages from content script or popup/challenge pages
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'CHECK_TAB_STATUS') {
      const tabId = sender.tab?.id || message.tabId;
      const targetUrl = message.url || sender.tab?.url;
      getStatusForTab(tabId, targetUrl).then(sendResponse);
      return true; // Keep channel open for async response
    }

    if (message?.type === 'UNLOCK_TAB') {
      const tabId = message.tabId || sender.tab?.id;
      const domain = message.domain;
      if (tabId && domain) {
        setTabUnlocked(tabId, domain).then(() => {
          sendResponse({ success: true });
        });
        return true;
      }
    }

    if (message?.type === 'RECORD_UNLOCK') {
      if (message.domain) {
        recordSuccessfulUnlock(message.domain).then((record) => {
          sendResponse({ success: true, record });
        });
        return true;
      }
    }

    if (message?.type === 'LEAVE_TAB') {
      const targetTabId = message.tabId ? Number(message.tabId) : sender.tab?.id;
      // Open a fresh new tab in Google Chrome
      chrome.tabs.create({});
      // Close the current blocked tab
      if (targetTabId) {
        chrome.tabs.remove(targetTabId);
      }
      sendResponse({ success: true });
      return true;
    }
  });
}
