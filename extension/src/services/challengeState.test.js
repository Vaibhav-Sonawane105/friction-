import { expect, it } from 'vitest';
import { migrateChallengeState, invalidateDomain, sanitizeProductionState } from './challengeState';

const domains = [{ domain: 'youtube.com', enabled: true, successfulUnlockCount: 35, difficultyLevel: 10, createdAt: 8 }];
function fixture() {
  const state = migrateChallengeState({ domains, epoch: 'epoch' });
  const generation = state.domains['youtube.com'].generation;
  state.attempts.a = { id: 'a', domain: 'youtube.com', generation, epoch: 'epoch', tabId: 1, level: 3, count: 35,
    moduleId: 'pattern', moduleVersion: 1, revision: 0, status: 'active', persistence: 'tab', state: { prompt: 'a' } };
  return state;
}
it('initializes and repeats migration without losing legacy records or count', () => {
  const original = structuredClone(domains);
  const state = migrateChallengeState({ domains, epoch: 'epoch' });
  expect(state.schemaVersion).toBe(1);
  expect(migrateChallengeState({ domains, stored: state, epoch: 'epoch' })).toEqual(state);
  expect(domains).toEqual(original);
  expect(domains[0].successfulUnlockCount).toBe(35);
});
it('preserves active attempts through worker restart but expires tab state on epoch change', () => {
  const state = fixture();
  expect(migrateChallengeState({ domains, stored: state, epoch: 'epoch' }).attempts.a.id).toBe('a');
  expect(migrateChallengeState({ domains, stored: state, epoch: 'new' }).attempts).toEqual({});
});
it('invalidates domain identity on removal, reset and disable/re-enable', () => {
  const state = fixture();
  const reset = invalidateDomain(state, 'youtube.com');
  expect(reset.attempts).toEqual({});
  expect(reset.domains['youtube.com'].generation).not.toBe(state.domains['youtube.com'].generation);
  const removed = migrateChallengeState({ domains: [], stored: state, epoch: 'epoch' });
  const added = migrateChallengeState({ domains, stored: removed, epoch: 'epoch' });
  expect(added.domains['youtube.com'].generation).not.toBe(state.domains['youtube.com'].generation);
  const disabled = migrateChallengeState({ domains: [{ ...domains[0], enabled: false }], stored: state, epoch: 'epoch' });
  expect(disabled.attempts).toEqual({});
  expect(migrateChallengeState({ domains, stored: disabled, epoch: 'epoch' }).domains['youtube.com'].generation).not.toBe(state.domains['youtube.com'].generation);
});
it('rejects unsupported or corrupt state without mutating original data', () => {
  for (const stored of [{ schemaVersion: 999, important: 'keep' }, { ...fixture(), attempts: null }]) {
    const copy = structuredClone(stored);
    expect(() => migrateChallengeState({ domains, stored, epoch: 'epoch' })).toThrow(/preserved/i);
    expect(stored).toEqual(copy);
  }
  expect(() => migrateChallengeState({ domains: [{ ...domains[0], successfulUnlockCount: -1 }], epoch: 'epoch' })).toThrow();
});
it('rejects malformed attempt bindings rather than restoring them', () => {
  const state = fixture(); state.attempts.a.tabId = '1';
  expect(() => migrateChallengeState({ domains, stored: state, epoch: 'epoch' })).toThrow();
});
it('production discards short development timers and test-derived access, preserving counts and ordinary state', () => {
  const state = fixture();
  state.attempts.timer = { ...state.attempts.a, id: 'timer', moduleId: 'wait', level: 4, persistence: 'domain', developmentTest: true, state: { remainingMs: 1000 } };
  const sessions = { 1: { domain: 'youtube.com', epoch: 'epoch', developmentTest: true }, 2: { domain: 'youtube.com', epoch: 'epoch' } };
  const sanitized = sanitizeProductionState(state, sessions);
  expect(sanitized.challengeState.attempts.timer).toBeUndefined();
  expect(sanitized.challengeState.attempts.a.id).toBe('a');
  expect(Object.keys(sanitized.sessions)).toEqual(['2']);
  expect(domains[0].successfulUnlockCount).toBe(35);
  expect(state.attempts.timer).toBeDefined();
});
