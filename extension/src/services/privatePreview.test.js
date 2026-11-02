import { afterEach, expect, it, vi } from 'vitest';
import { createChromeHarness } from '../test/chromeHarness';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('runs ordinary modular challenges without allowing popup count edits in the private preview', async () => {
  const h = createChromeHarness();
  await h.boot(true, false); await h.add('youtube.com');
  const attempt = await h.send({ type: 'GET_CHALLENGE' });
  expect(attempt.success).toBe(true); expect(attempt.moduleId).toBe('arithmetic');
  const changed = await h.send({ type: 'PF_DEV_CHALLENGE_CONTROL', operation: 'SET_COUNT', domain: 'youtube.com', count: 31 }, h.popup);
  expect(changed.success).toBe(false);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(0);
  const saved = h.local.pf_challenge_state.attempts[attempt.attemptId];
  const action = { type: 'CHALLENGE_ACTION', attemptId: attempt.attemptId, revision: attempt.revision,
    action: { type: 'submit', answer: String(saved.state.answer) } };
  expect((await h.send(action)).completed).toBe(true);
  expect((await h.send(action)).completed).toBe(true);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(1);
});

it('ignores old developer overrides, retains normal selection and leaves Level 4 unavailable', async () => {
  const h = createChromeHarness(); await h.boot(); await h.add('youtube.com');
  const control = (operation, args = {}) => h.send({ type: 'PF_DEV_CHALLENGE_CONTROL', operation, domain: 'youtube.com', ...args }, h.popup);
  await control('SET_COUNT', { count: 31 });
  await control('PREPARE_CHALLENGE', { moduleId: 'tracking' });
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  await h.boot(true, false);
  const attempt = await h.send({ type: 'GET_CHALLENGE' });
  expect(attempt.success).toBe(true); expect(attempt.moduleId).toBe('attention');
  expect((await h.send({ type: 'GET_CHALLENGE' })).attemptId).toBe(attempt.attemptId);
  h.local.pf_blocked_domains[0].successfulUnlockCount = 51;
  // Seed a fresh visit at the boundary, rather than an existing Level 3 attempt.
  h.local.pf_challenge_state.attempts = {}; h.local.pf_challenge_state.receipts = {};
  await h.boot(true, false);
  const unavailable = await h.send({ type: 'GET_CHALLENGE' });
  expect(unavailable.success).toBe(false); expect(unavailable.error).toMatch(/Level 4.*unavailable/);
  expect(h.local.pf_blocked_domains[0].successfulUnlockCount).toBe(51);
});
