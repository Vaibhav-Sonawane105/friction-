import * as registry from '../challenges/workerRegistry';
import { createChallengeCoordinator } from './challenges';
import { readChallengeSnapshot, writeChallengeSnapshot } from './storage';
import { isDomainMatch } from '../utils/domain';
import { getDevelopmentOverride, consumeDevelopmentOverride } from '../dev/challengeControls';

// Normalize only this extension's exact standalone page, never arbitrary extension URLs.
export function getTargetUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url), expected = new URL(chrome.runtime.getURL('blocked.html'));
    if (parsed.protocol === expected.protocol && parsed.host === expected.host && parsed.pathname === expected.pathname) return parsed.searchParams.get('target');
  } catch { /* Invalid destinations are treated as departures. */ }
  return url;
}

async function assertContext(context) {
  const [tab, frame] = await Promise.all([chrome.tabs.get(context.tabId), chrome.webNavigation.getFrame({ tabId: context.tabId, frameId: 0 })]);
  if (frame?.documentId !== context.documentId || !isDomainMatch(getTargetUrl(tab.url), context.domain)) throw new Error('This page has changed. Reload the challenge.');
}

const coordinator = createChallengeCoordinator({ readSnapshot: readChallengeSnapshot, writeSnapshot: writeChallengeSnapshot, registry, assertContext });

export async function getChallenge(context) {
  const override = await getDevelopmentOverride(context);
  const result = await coordinator.getChallenge(context, { developmentTest: true, moduleId: override?.moduleId, variant: override?.variant, overrideId: override?.id });
  await consumeDevelopmentOverride(context, result, override);
  return result;
}

export const dispatchAction = (context, request) => coordinator.dispatchAction(context, request);

export async function pruneTab(tabId, url = null) {
  url = getTargetUrl(url);
  const snapshot = await readChallengeSnapshot();
  let changed = false;
  for (const [id, attempt] of Object.entries(snapshot.challengeState.attempts)) {
    if (attempt.tabId === tabId && (!url || !isDomainMatch(url, attempt.domain))) {
      delete snapshot.challengeState.attempts[id]; delete snapshot.challengeState.receipts[id]; changed = true;
    }
  }
  if (changed) await writeChallengeSnapshot(snapshot);
}
