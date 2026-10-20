import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createChromeHarness } from '../test/chromeHarness';

let h;
const control = (operation, args = {}) => h.send({ type: 'PF_DEV_CHALLENGE_CONTROL', domain: 'youtube.com', operation, ...args }, h.popup);
const get = (id = 1) => h.send({ type: 'GET_CHALLENGE' }, h.sender(id));
const flip = (attempt, index, id = 1) => h.send({ type: 'CHALLENGE_ACTION', attemptId: attempt.attemptId, revision: attempt.revision, action: { type: 'flip', index } }, h.sender(id));
const saved = attempt => h.local.pf_challenge_state.attempts[attempt.attemptId].state;
const pairs = attempt => {
  const cards = saved(attempt).cards;
  return [...new Set(cards)].map(shape => cards.flatMap((card, index) => card === shape ? [index] : []));
};
beforeEach(async () => {
  h = createChromeHarness(); await h.boot(); await h.add('youtube.com');
  await control('SET_COUNT', { count: 31 });
});
afterEach(() => vi.unstubAllGlobals());
async function prepare() {
  expect((await control('PREPARE_CHALLENGE', { moduleId: 'memory' })).success).toBe(true);
  const attempt = await get(); expect(attempt.success).toBe(true); expect(attempt.moduleId).toBe('memory');
  return attempt;
}

it('saves first flips, mismatches and matches through refresh and worker restart without early access', async () => {
  const first = await prepare(), board = structuredClone(saved(first).cards);
  const [[a, b], [c]] = pairs(first);
  let attempt = await flip(first, a);
  expect(attempt.state.cards[a].value).toBe(board[a]);
  expect(attempt.state.cards.filter(card => card.value !== null)).toHaveLength(1);
  h.documents[1] = 'refreshed'; await h.boot();
  expect((await get()).state).toEqual(attempt.state);
  attempt = await flip(attempt, c);
  const mismatch = structuredClone(attempt.state);
  await h.boot(); expect((await get()).state).toEqual(mismatch);
  attempt = await flip(attempt, b);
  expect(attempt.state.cards[c].value).toBeNull(); expect(attempt.state.cards[a].value).toBeNull();
  attempt = await flip(attempt, a);
  expect(attempt.state.pairsMatched).toBe(1);
  await h.boot(); const restored = await get();
  expect(restored.state).toEqual(attempt.state); expect(saved(restored).cards).toEqual(board);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(31);
  expect((await h.send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(true);
});
it('reconciles stale and duplicate flips and recovers failed writes without revealing extra cards', async () => {
  const first = await prepare(), [[a], [b]] = pairs(first);
  h.failNextWrite = true;
  expect((await flip(first, a)).success).toBe(false);
  expect((await get()).state.cards.every(card => card.value === null)).toBe(true);
  const [one, duplicate] = await Promise.all([flip(first, a), flip(first, a)]);
  expect(duplicate.reconciled).toBe(true); expect(duplicate.state).toEqual(one.state);
  const stale = await flip(first, b);
  expect(stale.reconciled).toBe(true); expect(stale.state.cards[b].value).toBeNull();
  // A lost reply is recovered from the persisted revision rather than replaying the flip.
  expect((await get()).state).toEqual(one.state);
  expect((await flip(one, a)).success).toBe(false);
});
it('completes only after six pairs and atomically counts duplicate final submissions once', async () => {
  await control('SET_COUNT', { count: 50 });
  let attempt = await prepare();
  const groups = pairs(attempt);
  const other = await get(2);
  expect(groups).toHaveLength(6);
  for (const [a, b] of groups.slice(0, 5)) {
    attempt = await flip(attempt, a); attempt = await flip(attempt, b);
    expect(attempt.completed).toBe(false);
    expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(50);
  }
  const [a, b] = groups[5]; attempt = await flip(attempt, a);
  h.failNextWrite = true;
  expect((await flip(attempt, b)).success).toBe(false);
  expect((await get()).state.pairsMatched).toBe(5);
  const results = await Promise.all([flip(attempt, b), flip(attempt, b)]);
  expect(results.every(result => result.success && result.completed)).toBe(true);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(51);
  expect((await h.send({ type: 'CHECK_TAB_STATUS' }, h.sender(2))).shouldBlock).toBe(true);
  expect((await get(2)).attemptId).toBe(other.attemptId);
});
it('invalidates old flips on reset and expires boards on browser restart while retaining counts', async () => {
  const first = await prepare(), [[a]] = pairs(first);
  await flip(first, a);
  await control('RESET_CHALLENGE');
  expect((await flip(first, a)).success).toBe(false);
  await control('PREPARE_CHALLENGE', { moduleId: 'memory' });
  const replacement = await get(); expect(replacement.attemptId).not.toBe(first.attemptId);
  h.session = {}; await h.boot();
  const next = await get(); expect(next.success).toBe(true); expect(next.attemptId).not.toBe(replacement.attemptId);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(31);
});
it('preserves corrupt saved boards and reports an error instead of rerolling or unlocking', async () => {
  const first = await prepare();
  saved(first).matched = [0];
  const before = structuredClone(h.local.pf_challenge_state);
  const result = await get(); expect(result.success).toBe(false); expect(result.error).toMatch(/preserved/i);
  expect(h.local.pf_challenge_state).toEqual(before);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(31);
  expect((await h.send({ type: 'CHECK_TAB_STATUS' })).shouldBlock).toBe(true);
});
it('restores a pre-update four-pair board without replacing its revealed cards or matches', async () => {
  const first = await prepare();
  h.local.pf_challenge_state.attempts[first.attemptId].state = {
    cards: ['Circle', 'Triangle', 'Square', 'Diamond', 'Circle', 'Triangle', 'Square', 'Diamond'],
    matched: [0, 4], revealed: [1],
  };
  await h.boot();
  const restored = await get();
  expect(restored.attemptId).toBe(first.attemptId); expect(restored.state.totalPairs).toBe(4);
  expect(restored.state.pairsMatched).toBe(1); expect(restored.state.cards[1].value).toBe('Triangle');
  const next = await flip(restored, 5);
  expect(next.success).toBe(true); expect(next.state.pairsMatched).toBe(2); expect(next.completed).toBe(false);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(31);
});
