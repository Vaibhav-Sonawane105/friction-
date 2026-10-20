import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createChromeHarness } from '../test/chromeHarness';

let h;
const control = (operation, args = {}) => h.send({ type: 'PF_DEV_CHALLENGE_CONTROL', domain: 'youtube.com', operation, ...args }, h.popup);
const get = (id = 1) => h.send({ type: 'GET_CHALLENGE' }, h.sender(id));
const select = (attempt, index) => h.send({ type: 'CHALLENGE_ACTION', attemptId: attempt.attemptId, revision: attempt.revision, action: { type: 'select', index } });
const matches = (tile, target) => typeof tile === 'string' ? tile === target : tile.shape === target.shape && tile.color === target.color && tile.fill === target.fill;
const targetIndex = attempt => attempt.state.tiles.findIndex((tile, index) => matches(tile, attempt.state.target) && !attempt.state.selected.includes(index));
beforeEach(async () => {
  h = createChromeHarness(); await h.boot(); await h.add('youtube.com');
  await control('SET_COUNT', { count: 31 });
});
afterEach(() => vi.unstubAllGlobals());
async function prepare() {
  expect((await control('PREPARE_CHALLENGE', { moduleId: 'attention' })).success).toBe(true);
  const attempt = await get(); expect(attempt.success).toBe(true); expect(attempt.moduleId).toBe('attention');
  return attempt;
}
it('saves selections and stages through refresh and worker restart without an early unlock', async () => {
  const first = await prepare();
  let attempt = await select(first, targetIndex(first));
  expect(attempt.state.targetsFound).toBe(1); expect(attempt.revision).toBe(1);
  const wrong = attempt.state.tiles.findIndex(tile => !matches(tile, attempt.state.target));
  expect((await select(attempt, wrong)).state).toEqual(attempt.state);
  h.documents[1] = 'refreshed'; await h.boot();
  const restored = await get(); expect(restored.attemptId).toBe(first.attemptId); expect(restored.state).toEqual(attempt.state);
  while (attempt.state.completedStages === 0) attempt = await select(attempt, targetIndex(attempt));
  expect(attempt.state.stageNumber).toBe(2); expect(attempt.state.tiles).toHaveLength(16);
  await h.boot(); expect((await get()).state).toEqual(attempt.state);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(31);
  expect((await h.send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(true);
});
it('handles failed writes, duplicate delivery and stale clicks without extra selections', async () => {
  const first = await prepare(), index = targetIndex(first);
  h.failNextWrite = true;
  expect((await select(first, index)).success).toBe(false);
  expect((await get()).state.targetsFound).toBe(0);
  const [one, duplicate] = await Promise.all([select(first, index), select(first, index)]);
  expect(duplicate.reconciled).toBe(true); expect(duplicate.state).toEqual(one.state);
  const stale = await select(first, targetIndex(one));
  expect(stale.reconciled).toBe(true); expect(stale.state.targetsFound).toBe(1);
  expect((await get()).state).toEqual(one.state);
});
it('guards stage transitions against replay and counts only the final target once', async () => {
  await control('SET_COUNT', { count: 50 });
  let attempt = await prepare();
  const other = await get(2);
  while (!(attempt.state.stageNumber === 3 && attempt.state.targetsFound === 4)) {
    if (attempt.state.stageNumber === 3 && attempt.state.targetsFound === 0) {
      const target = attempt.state.target;
      const near = attempt.state.tiles.findIndex(tile => tile.shape === target.shape && tile.color === target.color && tile.fill !== target.fill);
      expect(near).toBeGreaterThanOrEqual(0);
      expect((await select(attempt, near)).state).toEqual(attempt.state);
    }
    const before = attempt, index = targetIndex(attempt);
    attempt = await select(before, index);
    expect(attempt.success).toBe(true); expect(attempt.completed).toBe(false);
    expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(50);
    const duplicate = await select(before, index);
    expect(duplicate.reconciled).toBe(true); expect(duplicate.state).toEqual(attempt.state);
  }
  const index = targetIndex(attempt);
  h.failNextWrite = true;
  expect((await select(attempt, index)).success).toBe(false);
  expect((await get()).state.targetsFound).toBe(4);
  const results = await Promise.all([select(attempt, index), select(attempt, index)]);
  expect(results.every(result => result.success && result.completed)).toBe(true);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(51);
  expect((await h.send({ type: 'CHECK_TAB_STATUS' }, h.sender(2))).shouldBlock).toBe(true);
  expect((await get(2)).state).toEqual(other.state);
});
it('resumes an older shape-only attempt without replacing its rules or selected tiles', async () => {
  const first = await prepare();
  h.local.pf_challenge_state.attempts[first.attemptId].state = {
    stage: 0, selected: [0], stages: ['Circle', 'Triangle', 'Square'].map((target, index) => ({
      target, tiles: Array.from({ length: 12 + 4 * index }, (_, i) => i < index + 3 ? target : 'Plus'),
    })),
  };
  await h.boot(); const restored = await get();
  expect(restored.attemptId).toBe(first.attemptId); expect(restored.state.target).toBe('Circle');
  expect(restored.state.selected).toEqual([0]);
  const next = await select(restored, 1); expect(next.state.targetsFound).toBe(2);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(31);
});
it('rejects reset attempts and expires browser-restart state without losing counts', async () => {
  const first = await prepare(); await select(first, targetIndex(first));
  await control('RESET_CHALLENGE');
  expect((await select(first, targetIndex(first))).success).toBe(false);
  const replacement = await prepare();
  h.session = {}; await h.boot();
  const next = await get(); expect(next.success).toBe(true); expect(next.attemptId).not.toBe(replacement.attemptId);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(31);
});
it('preserves corrupt saved attention state instead of rerolling or granting access', async () => {
  const first = await prepare();
  h.local.pf_challenge_state.attempts[first.attemptId].state.selected = [-1];
  const before = structuredClone(h.local.pf_challenge_state);
  const result = await get(); expect(result.success).toBe(false); expect(result.error).toMatch(/preserved/i);
  expect(h.local.pf_challenge_state).toEqual(before);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(31);
  expect((await h.send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(true);
});
