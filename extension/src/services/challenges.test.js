import { beforeEach, expect, it } from 'vitest';
import { createChallengeCoordinator } from './challenges';
import { migrateChallengeState, invalidateDomain } from './challengeState';
import * as registry from '../challenges/registry';

let snapshot, coordinator, writeMode, serial;
const context = (tabId = 1) => ({ tabId, domain: 'youtube.com', documentId: `doc-${tabId}`, epoch: 'epoch' });
const make = () => createChallengeCoordinator({ registry, random: () => 0, uuid: () => `attempt-${++serial}`, now: () => 100,
  readSnapshot: async () => structuredClone(snapshot),
  writeSnapshot: async value => {
    if (writeMode === 'fail') throw new Error('Write failed');
    snapshot = structuredClone({ ...value, epoch: 'epoch' });
    if (writeMode === 'lost') throw new Error('Response lost');
  },
});
const submit = (attempt, tabId = 1, answer = '2') => coordinator.dispatchAction(context(tabId), { attemptId: attempt.attemptId, revision: attempt.revision, action: { type: 'submit', answer } });
beforeEach(() => {
  serial = 0; writeMode = 'ok';
  const domains = [{ domain: 'youtube.com', enabled: true, successfulUnlockCount: 0, difficultyLevel: 1 }];
  snapshot = { domains, sessions: {}, epoch: 'epoch', challengeState: migrateChallengeState({ domains, epoch: 'epoch' }) };
  coordinator = make();
});
it('persists the prompt before returning and restores it across refresh and worker recreation', async () => {
  const attempt = await coordinator.getChallenge(context());
  expect(attempt.state).toEqual({ expression: '1 + 1' });
  expect(attempt.state.answer).toBeUndefined();
  coordinator = make();
  expect(await coordinator.getChallenge({ ...context(), documentId: 'refreshed' })).toEqual(attempt);
});
it('retains the prompt after a wrong answer and reconciles stale revisions', async () => {
  const attempt = await coordinator.getChallenge(context());
  const wrong = await submit(attempt, 1, '8');
  expect(wrong.completed).toBe(false); expect(wrong.state).toEqual(attempt.state);
  expect(snapshot.domains[0].successfulUnlockCount).toBe(0);
  expect((await coordinator.dispatchAction(context(), { attemptId: attempt.attemptId, revision: -1, action: { type: 'submit', answer: '2' } })).reconciled).toBe(true);
});
it('commits count, access and receipt once and returns success for duplicate delivery', async () => {
  const attempt = await coordinator.getChallenge(context());
  expect((await submit(attempt)).completed).toBe(true);
  expect((await submit(attempt)).completed).toBe(true);
  expect(snapshot.domains[0].successfulUnlockCount).toBe(1);
  expect(Object.keys(snapshot.sessions)).toEqual(['1']);
  expect(Object.keys(snapshot.challengeState.receipts)).toEqual([attempt.attemptId]);
});
it('safely retries failed writes and persisted writes whose response was lost', async () => {
  const attempt = await coordinator.getChallenge(context());
  writeMode = 'fail'; await expect(submit(attempt)).rejects.toThrow();
  expect(snapshot.domains[0].successfulUnlockCount).toBe(0); expect(snapshot.sessions).toEqual({});
  writeMode = 'lost'; await expect(submit(attempt)).rejects.toThrow();
  writeMode = 'ok'; coordinator = make();
  expect((await submit(attempt)).completed).toBe(true);
  expect(snapshot.domains[0].successfulUnlockCount).toBe(1);
});
it('increments the latest count for independent tabs without replacing their active prompts', async () => {
  const first = await coordinator.getChallenge(context(1)), second = await coordinator.getChallenge(context(2));
  await submit(first);
  expect((await coordinator.getChallenge(context(2))).attemptId).toBe(second.attemptId);
  await submit(second, 2);
  expect(snapshot.domains[0].successfulUnlockCount).toBe(2);
  expect(Object.keys(snapshot.sessions)).toEqual(['1','2']);
});
it('rejects cross-tab, stale epoch, reset generation and missing restriction completions', async () => {
  const attempt = await coordinator.getChallenge(context());
  await expect(submit(attempt, 2)).rejects.toThrow();
  await expect(coordinator.dispatchAction({ ...context(), epoch: 'other' }, { attemptId: attempt.attemptId, revision: 0, action: { type: 'submit', answer: '2' } })).rejects.toThrow();
  snapshot.challengeState = invalidateDomain(snapshot.challengeState, 'youtube.com');
  await expect(submit(attempt)).rejects.toThrow();
  snapshot.domains = [];
  await expect(coordinator.getChallenge(context())).rejects.toThrow();
  expect(snapshot.sessions).toEqual({});
});
it('does not replace unsupported levels with arithmetic', async () => {
  snapshot.domains[0].successfulUnlockCount = 35;
  await expect(coordinator.getChallenge(context())).rejects.toThrow(/unavailable/i);
  expect(snapshot.domains[0].successfulUnlockCount).toBe(35);
});
it('never treats client-supplied completed as validated completion', async () => {
  const attempt = await coordinator.getChallenge(context());
  await expect(coordinator.dispatchAction(context(), { attemptId: attempt.attemptId, revision: 0, action: { completed: true } })).rejects.toThrow();
  expect(snapshot.domains[0].successfulUnlockCount).toBe(0);
});
it('never treats a completed attempt as access after its session has ended', async () => {
  const first = await coordinator.getChallenge(context()); await submit(first);
  snapshot.sessions = {};
  const next = await coordinator.getChallenge(context());
  expect(next.completed).toBe(false); expect(next.attemptId).not.toBe(first.attemptId);
  expect(snapshot.domains[0].successfulUnlockCount).toBe(1);
});
