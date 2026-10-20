import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createChromeHarness } from '../test/chromeHarness';

let h;
const control = (operation, args = {}, sender) => h.send({ type: 'PF_DEV_CHALLENGE_CONTROL', operation, domain: 'youtube.com', ...args }, sender || h.popup);
beforeEach(async () => { h = createChromeHarness(); await h.boot(); await h.add('youtube.com'); });
afterEach(() => vi.unstubAllGlobals());

it.each([[0,1],[21,2],[31,3],[51,4],[20,1],[30,2],[50,3],[71,4]])('jumps to count %i and reports level %i without inventing completions', async (count, level) => {
  const result = await control('SET_COUNT', { count });
  expect(result.success).toBe(true); expect(result.count).toBe(count); expect(result.level).toBe(level);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(count);
  expect(h.local.pf_unlock_sessions).toEqual({});
});
it('only resets the selected website, invalidating old attempts and access', async () => {
  await h.add('reddit.com'); h.tabs[2].url = 'https://reddit.com/';
  const first = await h.send({ type: 'GET_CHALLENGE' }), other = await h.send({ type: 'GET_CHALLENGE' }, h.sender(2));
  expect(first.success && other.success).toBe(true);
  const original = structuredClone(h.local.pf_challenge_state.attempts[other.attemptId]);
  const oldAnswer = h.local.pf_challenge_state.attempts[first.attemptId].state.answer;
  await control('SET_COUNT', { count: 20 });
  expect(h.local.pf_challenge_state.attempts[other.attemptId]).toEqual(original);
  expect((await h.send({ type: 'CHALLENGE_ACTION', attemptId: first.attemptId, revision: first.revision, action: { type: 'submit', answer: String(oldAnswer) } })).success).toBe(false);
  expect(h.local.pf_blocked_domains.find(d => d.domain === 'reddit.com').successfulUnlockCount).toBe(0);
});
it('can force one available next challenge and consumes the override after persistence', async () => {
  expect((await control('PREPARE_CHALLENGE', { moduleId: 'arithmetic' })).success).toBe(true);
  expect(h.session.pf_dev_challenge_overrides['youtube.com'].moduleId).toBe('arithmetic');
  h.failNextWrite = true;
  expect((await h.send({ type: 'GET_CHALLENGE' })).success).toBe(false);
  expect(h.session.pf_dev_challenge_overrides['youtube.com']).toBeDefined();
  const attempt = await h.send({ type: 'GET_CHALLENGE' }); expect(attempt.success).toBe(true);
  expect(h.session.pf_dev_challenge_overrides['youtube.com']).toBeUndefined();
  expect(h.local.pf_challenge_state.attempts[attempt.attemptId].developmentTest).toBe(true);
  expect((await h.send({ type: 'GET_CHALLENGE' })).attemptId).toBe(attempt.attemptId);
});
it.each([-1, 0.5, NaN, Infinity, '21', Number.MAX_SAFE_INTEGER + 1])('rejects invalid count %s without changing it', async count => {
  expect((await control('SET_COUNT', { count })).success).toBe(false);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(0);
});
it('rejects unsupported challenges, mismatched levels, malformed durations and variants', async () => {
  for (const args of [{ moduleId: 'memory' }, { moduleId: 'arithmetic', durationSeconds: 0 }, { moduleId: 'arithmetic', durationSeconds: 481 }, { moduleId: 'arithmetic', variant: 'derivative' }]) {
    expect((await control('PREPARE_CHALLENGE', args)).success).toBe(false);
  }
  await control('SET_COUNT', { count: 51 });
  expect((await control('PREPARE_CHALLENGE', { moduleId: 'arithmetic' })).success).toBe(false);
  const unavailable = await h.send({ type: 'GET_CHALLENGE' }); expect(unavailable.success).toBe(false); expect(unavailable.error).toMatch(/unavailable/i);
});
it('rejects website, foreign-extension and wrong-popup senders', async () => {
  for (const sender of [h.sender(), { ...h.popup, id: 'other' }, { ...h.popup, url: 'chrome-extension://extension/blocked.html' }]) {
    expect((await control('SET_COUNT', { count: 21 }, sender)).success).toBe(false);
  }
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(0);
});
it('reset retains count and configuration but clears pending overrides and test access', async () => {
  await control('SET_COUNT', { count: 12 }); await control('PREPARE_CHALLENGE', { moduleId: 'arithmetic' });
  const before = structuredClone(h.local.pf_blocked_domains);
  expect((await control('RESET_CHALLENGE')).success).toBe(true);
  expect(h.local.pf_blocked_domains).toEqual(before);
  expect(h.local.pf_challenge_state.attempts).toEqual({});
  expect(h.session.pf_dev_challenge_overrides['youtube.com']).toBeUndefined();
});
it('leaves persistent state intact if session override setup or local commit fails', async () => {
  const before = structuredClone(h.local);
  const set = h.chrome.storage.session.set;
  h.chrome.storage.session.set = async () => { throw new Error('Session unavailable'); };
  expect((await control('SET_COUNT', { count: 21 })).success).toBe(false);
  expect(h.local.pf_blocked_domains).toEqual(before.pf_blocked_domains);
  h.chrome.storage.session.set = set;
  h.failNextWrite = true;
  expect((await control('SET_COUNT', { count: 21 })).success).toBe(false);
  expect(h.local.pf_blocked_domains).toEqual(before.pf_blocked_domains);
});
it('rejects testing controls in production and expires development access', async () => {
  const attempt = await h.send({ type: 'GET_CHALLENGE' });
  const answer = h.local.pf_challenge_state.attempts[attempt.attemptId].state.answer;
  await h.send({ type: 'CHALLENGE_ACTION', attemptId: attempt.attemptId, revision: 0, action: { type: 'submit', answer: String(answer) } });
  await h.boot(false);
  expect((await control('SET_COUNT', { count: 51 })).success).toBe(false);
  expect((await h.send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(true);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(1);
});
it('notifies a standalone test page when its selected domain is reset', async () => {
  h.tabs[1].url = 'chrome-extension://extension/blocked.html?target=https%3A%2F%2Fyoutube.com%2Fwatch';
  h.tabs[2].url = 'https://reddit.com/'; h.notifications = [];
  expect((await control('RESET_CHALLENGE')).success).toBe(true);
  expect(h.notifications).toEqual([{ tabId: 1, type: 'TAB_URL_UPDATED', url: h.tabs[1].url, resetChallenge: true }]);
});
it('restores the same forced attempt after session override cleanup fails', async () => {
  await control('PREPARE_CHALLENGE', { moduleId: 'arithmetic' });
  const set = h.chrome.storage.session.set;
  h.chrome.storage.session.set = async values => {
    if (values.pf_dev_challenge_overrides && !values.pf_dev_challenge_overrides['youtube.com']) throw new Error('Cleanup failed');
    return set(values);
  };
  expect((await h.send({ type: 'GET_CHALLENGE' })).success).toBe(false);
  const saved = Object.values(h.local.pf_challenge_state.attempts)[0]; expect(saved).toBeDefined();
  h.chrome.storage.session.set = set;
  const restored = await h.send({ type: 'GET_CHALLENGE' });
  expect(restored.success).toBe(true); expect(restored.attemptId).toBe(saved.id);
  expect(h.session.pf_dev_challenge_overrides['youtube.com']).toBeUndefined();
});
