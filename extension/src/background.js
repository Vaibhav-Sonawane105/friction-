import { evaluateNavigation } from './services/blocker';
import {
  getBlockedDomains,
  getUnlockSessions,
  setTabUnlocked,
  clearTabSession,
} from './services/storage';
import { normalizeDomain } from './utils/domain';

/**
 * Handles navigation to check whether a tab should be redirected to the blocked page.
 */
async function handleNavigation(tabId, targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string') return;

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

  if (shouldBlock && matchedDomain) {
    const blockedPageUrl = chrome.runtime.getURL(
      `blocked.html?target=${encodeURIComponent(targetUrl)}&tabId=${tabId}`
    );

    // Prevent recursive redirect if already on the blocked page
    if (!targetUrl.startsWith(chrome.runtime.getURL('blocked.html'))) {
      try {
        await chrome.tabs.update(tabId, { url: blockedPageUrl });
      } catch (err) {
        console.warn('Could not redirect tab:', err);
      }
    }
  }
}

// Intercept navigation via chrome.webNavigation if available for early redirection
if (typeof chrome !== 'undefined' && chrome.webNavigation?.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId === 0) {
      // Main frame only
      handleNavigation(details.tabId, details.url);
    }
  });
}

// Fallback / complement via chrome.tabs.onUpdated
if (typeof chrome !== 'undefined' && chrome.tabs?.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
      handleNavigation(tabId, changeInfo.url);
    }
  });
}

// Clean up sessions when a tab is closed
if (typeof chrome !== 'undefined' && chrome.tabs?.onRemoved) {
  chrome.tabs.onRemoved.addListener((tabId) => {
    clearTabSession(tabId);
  });
}

// Handle runtime messages (e.g. UNLOCK_TAB or LEAVE_TAB from blocked challenge page)
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'UNLOCK_TAB' && message.tabId && message.domain) {
      setTabUnlocked(message.tabId, message.domain).then(() => {
        sendResponse({ success: true });
      });
      return true; // Keep channel open for async response
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
