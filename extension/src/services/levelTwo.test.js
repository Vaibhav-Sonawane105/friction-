import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createChromeHarness } from '../test/chromeHarness';

let h;
const control = (operation, args = {}) => h.send({ type: 'PF_DEV_CHALLENGE_CONTROL', domain: 'youtube.com', operation, ...args }, h.popup);
const get = (id = 1) => h.send({ type: 'GET_CHALLENGE' }, h.sender(id));
const submit = (attempt, answer, id = 1) => h.send({ type: 'CHALLENGE_ACTION', attemptId: attempt.attemptId, revision: attempt.revision, action: { type: 'submit', answer: String(answer) } }, h.sender(id));
const expectedAnswer = attempt => h.local.pf_challenge_state.attempts[attempt.attemptId].state.answer;
async function returnToSite() {
  h.tabs[1].url = 'about:blank'; h.listeners.updated(1, { url: 'about:blank' });
  await h.send({ type: 'CHECK_TAB_STATUS' }, h.sender(2));
  h.tabs[1].url = 'https://youtube.com/'; h.documents[1] = 'returned-document';
}
beforeEach(async () => { h = createChromeHarness(); await h.boot(); await h.add('youtube.com'); });
afterEach(() => vi.unstubAllGlobals());

it.each(['linear','derivative'])('forces %s through real controls and preserves it through wrong answers, refresh and worker restart', async variant => {
  expect((await control('SET_COUNT', { count: 21 })).success).toBe(true);
  const prepared = await control('PREPARE_CHALLENGE', { moduleId: 'equations', variant });
  expect(prepared.success).toBe(true); expect(prepared.variants.equations).toEqual(['linear','derivative']);
  const first = await get(); expect(first.success).toBe(true); expect(first.moduleId).toBe('equations'); expect(first.state.variant).toBe(variant);
  expect(first.state.answer).toBeUndefined(); expect(h.session.pf_dev_challenge_overrides['youtube.com']).toBeUndefined();
  const wrong = await submit(first, expectedAnswer(first) + 1);
  expect(wrong.completed).toBe(false); expect(wrong.state).toEqual(first.state);
  h.documents[1] = 'refreshed'; await h.boot();
  const restored = await get(); expect(restored.attemptId).toBe(first.attemptId); expect(restored.state).toEqual(first.state);
  h.failNextWrite = true;
  expect((await submit(restored, expectedAnswer(restored))).success).toBe(false);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(21);
  const results = await Promise.all([submit(restored, expectedAnswer(restored)), submit(restored, expectedAnswer(restored))]);
  expect(results.every(result => result.success && result.completed)).toBe(true);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(22);
  expect((await h.send({ type: 'CHECK_TAB_STATUS' }, h.sender(2))).shouldBlock).toBe(true);
});
it('switches from arithmetic to equations only after completing count 20', async () => {
  await control('SET_COUNT', { count: 20 });
  const first = await get(); expect(first.success).toBe(true); expect(first.moduleId).toBe('arithmetic');
  expect((await submit(first, expectedAnswer(first))).completed).toBe(true);
  await returnToSite();
  const next = await get(); expect(next.success).toBe(true); expect(next.moduleId).toBe('equations');
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(21);
});
it('keeps count 30 in equations and selects a Level 3 puzzle only for the next visit at 31', async () => {
  await control('SET_COUNT', { count: 30 });
  const first = await get(); expect(first.success).toBe(true); expect(first.moduleId).toBe('equations');
  expect((await submit(first, expectedAnswer(first))).completed).toBe(true);
  expect((await h.send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(false);
  await returnToSite();
  const next = await get(); expect(next.success).toBe(true); expect(next.level).toBe(3); expect(['tracking', 'memory', 'attention']).toContain(next.moduleId);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(31);
});
it('rejects invalid forced variants before replacing an active attempt', async () => {
  await control('SET_COUNT', { count: 21 });
  const first = await get(); expect(first.success).toBe(true);
  expect((await control('PREPARE_CHALLENGE', { moduleId: 'equations', variant: 'integral' })).success).toBe(false);
  expect((await get()).attemptId).toBe(first.attemptId);
});
