import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createChromeHarness } from '../test/chromeHarness';
let h, clock;
const control = (operation, args = {}) => h.send({ type: 'PF_DEV_CHALLENGE_CONTROL', domain: 'youtube.com', operation, ...args }, h.popup);
const get = () => h.send({ type: 'GET_CHALLENGE' });
const act = (attempt, action) => h.send({ type: 'CHALLENGE_ACTION', attemptId: attempt.attemptId, revision: attempt.revision, action });
function answer(attempt) {
  const state = h.local.pf_challenge_state.attempts[attempt.attemptId].state;
  const round = state.rounds[state.round];
  let slot = round.target;
  for (const [a,b] of round.swaps) { if (slot === a) slot = b; else if (slot === b) slot = a; }
  return slot;
}
beforeEach(async () => {
  clock = 1000; vi.spyOn(Date, 'now').mockImplementation(() => clock);
  h = createChromeHarness(); await h.boot(); await h.add('youtube.com');
  await control('SET_COUNT', { count: 31 });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function prepare() {
  expect((await control('PREPARE_CHALLENGE', { moduleId: 'tracking' })).success).toBe(true);
  const attempt = await get(); expect(attempt.success).toBe(true); return attempt;
}
it('saves completed rounds, replays interrupted watching and never unlocks early', async () => {
  let attempt = await prepare();
  attempt = await act(attempt, { type: 'start', mode: 'motion' });
  expect((await act(attempt, { type: 'finish' })).success).toBe(false);
  clock += attempt.state.durationMs;
  attempt = await act(attempt, { type: 'finish' });
  attempt = await act(attempt, { type: 'choose', index: answer(attempt) });
  expect(attempt.state.completedRounds).toBe(1); expect(attempt.completed).toBe(false);
  h.documents[1] = 'refreshed'; await h.boot();
  expect((await get()).state).toEqual(attempt.state);
  attempt = await act(attempt, { type: 'start', mode: 'motion' });
  const plan = structuredClone(attempt.state.plan);
  await h.boot(); const restored = await get();
  const replay = await act(restored, { type: 'start', mode: 'motion' });
  expect(replay.state.plan).toEqual(plan); expect(replay.state.completedRounds).toBe(1);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(31);
});
it('recovers failed saves and duplicate round completion without skipped rounds or extra counts', async () => {
  let attempt = await prepare(); const other = await h.send({ type: 'GET_CHALLENGE' }, h.sender(2));
  for (let round = 0; round < 3; round++) {
    attempt = await act(attempt, { type: 'start', mode: 'steps' });
    attempt = await act(attempt, { type: 'finish' });
    const choice = { type: 'choose', index: answer(attempt) };
    h.failNextWrite = true; expect((await act(attempt, choice)).success).toBe(false);
    expect((await get()).state.completedRounds).toBe(round);
    const results = await Promise.all([act(attempt, choice), act(attempt, choice)]);
    expect(results.every(result => result.success)).toBe(true);
    expect(results[0].state.completedRounds).toBe(round + 1);
    expect(results[1].state).toEqual(results[0].state);
    attempt = results[0]; expect(attempt.completed).toBe(round === 2);
  }
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(32);
  expect((await h.send({ type: 'CHECK_TAB_STATUS' }, h.sender(2))).shouldBlock).toBe(true);
  expect((await h.send({ type: 'GET_CHALLENGE' }, h.sender(2))).attemptId).toBe(other.attemptId);
});
it('retires saved pattern attempts and stale overrides while preserving counts and existing access', async () => {
  const attempt = await prepare();
  const stored = h.local.pf_challenge_state.attempts[attempt.attemptId];
  stored.moduleId = 'patterns'; stored.state = { retired: true };
  h.session.pf_dev_challenge_overrides = { 'youtube.com': { id: 'old-choice', generation: stored.generation, moduleId: 'patterns' } };
  const replacement = await get(); expect(replacement.success).toBe(true); expect(replacement.attemptId).not.toBe(attempt.attemptId);
  expect(replacement.moduleId).not.toBe('patterns'); expect(h.local.pf_challenge_state.attempts[attempt.attemptId]).toBeUndefined();
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(31);
  const current = h.local.pf_challenge_state.attempts[replacement.attemptId]; current.moduleId = 'patterns'; current.status = 'completed';
  h.local.pf_challenge_state.receipts[current.id] = { attemptId: current.id, result: { completed: true } };
  h.local.pf_unlock_sessions = { 1: { domain: 'youtube.com', epoch: current.epoch, unlockedAt: clock, developmentTest: true } };
  expect((await get()).completed).toBe(true);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(31);
});
