import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createChromeHarness } from '../test/chromeHarness';

let h;
const get = (tab = 1) => h.send({ type: 'GET_CHALLENGE' }, h.sender(tab));
const answer = (attempt, tab = 1) => h.send({ type: 'CHALLENGE_ACTION', attemptId: attempt.attemptId, revision: attempt.revision, action: { type: 'submit', answer: String(Object.values(h.local.pf_challenge_state.attempts).find(a => a.id === attempt.attemptId)?.state.answer) } }, h.sender(tab));
beforeEach(async () => { h = createChromeHarness(); await h.boot(); await h.add('youtube.com'); });
afterEach(() => vi.unstubAllGlobals());

it('uses the real background queue to complete duplicates once and preserve another tab', async () => {
  const first = await get(), second = await get(2);
  expect(first.success).toBe(true); expect(second.success).toBe(true);
  const results = await Promise.all([answer(first), answer(first)]);
  expect(results.every(r => r.success && r.completed)).toBe(true);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(1);
  expect((await h.send({ type: 'CHECK_TAB_STATUS' }, h.sender(2))).shouldBlock).toBe(true);
});
it('rejects the unvalidated legacy completion shortcut in development', async () => {
  expect((await h.send({ type: 'COMPLETE_UNLOCK', domain: 'youtube.com' })).success).toBe(false);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(0);
});
it('restores a prompt after refresh while rejecting a submission from the replaced document', async () => {
  const first = await get(), old = h.sender(); h.documents[1] = 'new-document';
  const restored = await get(); expect(restored.attemptId).toBe(first.attemptId); expect(restored.state).toEqual(first.state);
  expect((await h.send({ type: 'CHALLENGE_ACTION', attemptId: first.attemptId, revision: 0, action: { type: 'submit', answer: '2' } }, old)).success).toBe(false);
});
it('invalidates departed/closed tab attempts while preserving worker-restart state', async () => {
  const first = await get(); await h.boot(); expect((await get()).attemptId).toBe(first.attemptId);
  h.tabs[1].url = 'about:blank'; h.listeners.updated(1, { url: 'about:blank' });
  await h.send({ type: 'CHECK_TAB_STATUS' }, h.sender(2));
  h.tabs[1].url = 'https://youtube.com/';
  expect((await get()).attemptId).not.toBe(first.attemptId);
  h.listeners.removed(1); await h.send({ type: 'CHECK_TAB_STATUS' }, h.sender(2));
  expect(Object.values(h.local.pf_challenge_state.attempts).some(a => a.tabId === 1)).toBe(false);
});
it('rejects invalid senders and does not overwrite unsupported stored schemas', async () => {
  for (const sender of [{ ...h.sender(), id: 'other' }, { ...h.sender(), frameId: 1 }, h.popup]) {
    expect((await h.send({ type: 'GET_CHALLENGE' }, sender)).success).toBe(false);
  }
  h.local.pf_challenge_state = { schemaVersion: 99, keep: 'important' };
  const result = await get(); expect(result.success).toBe(false); expect(result.error).toMatch(/preserved/i);
  expect(h.local.pf_challenge_state).toEqual({ schemaVersion: 99, keep: 'important' });
});
it('preserves data on write failure and invalidates a callback across remove/re-add', async () => {
  h.failNextWrite = true; expect((await get()).success).toBe(false);
  expect(h.local.pf_challenge_state).toBeUndefined();
  const first = await get();
  await h.send({ type: 'MUTATE_STORAGE', operation: 'removeBlockedDomain', args: ['youtube.com'] }, h.popup);
  await h.add('youtube.com');
  expect((await answer(first)).success).toBe(false);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(0);
});
it('expires attempts and access after browser restart while retaining counts', async () => {
  const first = await get(); await answer(first);
  h.session = {}; await h.boot();
  expect((await h.send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(true);
  expect((await get()).attemptId).not.toBe(first.attemptId);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(1);
});
it('does not register the development challenge protocol in production', async () => {
  await h.boot(false);
  expect((await get()).success).toBe(false);
  expect((await h.send({ type: 'COMPLETE_UNLOCK', domain: 'youtube.com' })).success).toBe(true);
});

it('retains a standalone prompt through a committed refresh of blocked.html', async () => {
  const url = 'chrome-extension://extension/blocked.html?target=https%3A%2F%2Fyoutube.com%2Fwatch';
  h.tabs[1].url = url;
  const first = await get(); expect(first.success).toBe(true);
  expect((await h.send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(true);
  h.documents[1] = 'refreshed-standalone';
  h.listeners.committed({ tabId: 1, frameId: 0, url });
  const second = await get(); expect(second.success).toBe(true);
  expect(second.attemptId).toBe(first.attemptId); expect(second.state).toEqual(first.state);
  await answer(second);
  h.listeners.committed({ tabId: 1, frameId: 0, url });
  await h.send({ type: 'CHECK_TAB_STATUS' }, h.sender(2));
  expect(h.local.pf_unlock_sessions['1']?.domain).toBe('youtube.com');
});

it('rejects an old document that is replaced during asynchronous action processing', async () => {
  const attempt = await get(); expect(attempt.success).toBe(true);
  const originalGet = h.chrome.storage.local.get;
  let armed = true;
  h.chrome.storage.local.get = (keys, callback) => {
    if (armed) { armed = false; h.documents[1] = 'replaced-during-action'; }
    return originalGet(keys, callback);
  };
  expect((await answer(attempt)).success).toBe(false);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(0);
  expect(h.local.pf_unlock_sessions || {}).toEqual({});
});

it('persists production removal of test attempts so switching back cannot revive them', async () => {
  const first = await get(); expect(first.success).toBe(true); await answer(first);
  await h.boot(false); await h.send({ type: 'CHECK_TAB_STATUS' });
  expect(h.local.pf_challenge_state.attempts).toEqual({});
  expect(h.local.pf_unlock_sessions).toEqual({});
  await h.boot(true);
  expect((await get()).attemptId).not.toBe(first.attemptId);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(1);
});
it('serializes simultaneous valid completions from two tabs against the latest count', async () => {
  const first = await get(), second = await get(2);
  expect(first.success && second.success).toBe(true);
  expect((await Promise.all([answer(first), answer(second, 2)])).every(result => result.success)).toBe(true);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(2);
  expect(Object.keys(h.local.pf_unlock_sessions)).toEqual(['1','2']);
});
it('preserves local attempts through a retained-domain sync and invalidates them on cloud disable', async () => {
  const first = await get(); expect(first.success).toBe(true);
  const { storageOperations } = await import('./storage');
  await storageOperations.replaceWebsiteConfig(h.local.pf_blocked_domains, [{ domain: 'youtube.com', enabled: true }, { domain: 'reddit.com', enabled: true }]);
  expect((await get()).attemptId).toBe(first.attemptId);
  await storageOperations.replaceWebsiteConfig(h.local.pf_blocked_domains, [{ domain: 'youtube.com', enabled: false }, { domain: 'reddit.com', enabled: true }]);
  expect(h.local.pf_challenge_state.attempts).toEqual({});
  expect((await answer(first)).success).toBe(false);
});
