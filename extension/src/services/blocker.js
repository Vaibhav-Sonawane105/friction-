/**
 * Domain Blocking & Navigation Evaluator
 */

import { isDomainMatch } from '../utils/domain';

/**
 * Determines whether a navigation target should be blocked for a given tab.
 * @param {string} url Target URL being visited
 * @param {number} tabId ID of the browser tab
 * @param {Array<{ domain: string, enabled: boolean }>} blockedList Configured blocked domains
 * @param {Record<string, { domain: string }>} activeSessions Current unlock sessions
 * @returns {{ shouldBlock: boolean, matchedDomain?: string }}
 */
export function evaluateNavigation(url, tabId, blockedList = [], activeSessions = {}) {
  if (!url || typeof url !== 'string') {
    return { shouldBlock: false };
  }

  // Never block browser internals or extension pages
  if (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://')
  ) {
    return { shouldBlock: false };
  }

  // Find if URL matches any active blocked domain
  const matched = blockedList.find(
    (item) => item.enabled !== false && isDomainMatch(url, item.domain)
  );

  if (!matched) {
    return { shouldBlock: false };
  }

  // Check if this tab is currently unlocked for this domain
  const tabSession = activeSessions[String(tabId)];
  if (tabSession && tabSession.domain === matched.domain) {
    // Tab has an active session for this domain
    return { shouldBlock: false, matchedDomain: matched.domain };
  }

  return { shouldBlock: true, matchedDomain: matched.domain };
}
