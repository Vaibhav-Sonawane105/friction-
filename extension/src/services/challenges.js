import { getLevel } from '../challenges/progression';
import { validateChallengeState } from './challengeState';

// Calls must be serialized by the background queue, including settings/lifecycle changes.
export function createChallengeCoordinator({ readSnapshot, writeSnapshot, registry, random = Math.random, uuid = () => crypto.randomUUID(), now = Date.now, assertContext = async () => {} }) {
  function binding(snapshot, context) {
    validateChallengeState(snapshot.challengeState);
    const entry = snapshot.domains.find(item => item.domain === context.domain && item.enabled !== false);
    const identity = Object.hasOwn(snapshot.challengeState.domains, context.domain) ? snapshot.challengeState.domains[context.domain] : null;
    if (!entry || !identity?.enabled || context.epoch !== snapshot.epoch || !Number.isInteger(context.tabId) || context.tabId < 0) {
      throw new Error('This challenge no longer belongs to an active restricted tab.');
    }
    return { entry, generation: identity.generation };
  }
  function matches(attempt, context, generation) {
    return attempt && attempt.domain === context.domain && attempt.tabId === context.tabId &&
      attempt.epoch === context.epoch && attempt.generation === generation;
  }
  async function present(attempt, extra = {}) {
    const descriptor = registry.getModuleDescriptor(attempt.moduleId, attempt.moduleVersion);
    const model = await descriptor.loadModel();
    model.validateState(attempt.state);
    return { attemptId: attempt.id, revision: attempt.revision, moduleId: attempt.moduleId, moduleVersion: attempt.moduleVersion,
      level: attempt.level, state: model.toPublicState(attempt.state), completed: attempt.status === 'completed', ...extra };
  }
  return {
    async getChallenge(context, options = {}) {
      const snapshot = await readSnapshot();
      const { entry, generation } = binding(snapshot, context);
      const existing = Object.values(snapshot.challengeState.attempts).find(attempt => matches(attempt, context, generation));
      if (existing) {
        if (existing.status !== 'completed' || snapshot.sessions[String(context.tabId)]?.domain === context.domain) return present(existing);
        delete snapshot.challengeState.attempts[existing.id]; delete snapshot.challengeState.receipts[existing.id];
      }
      // Existing same-epoch access (including pre-migration access) stays valid.
      if (snapshot.sessions[String(context.tabId)]?.domain === context.domain) return { completed: true };
      const level = getLevel(entry.successfulUnlockCount);
      const choices = registry.selectModuleIds(level);
      if (!choices.length) throw new Error(`Level ${level} is unavailable in this development build. Its module has not been implemented yet.`);
      const value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid random source.');
      const moduleId = options.moduleId || choices[Math.floor(value * choices.length)];
      if (!choices.includes(moduleId)) throw new Error('The selected challenge does not belong to this level.');
      const descriptor = registry.getModuleDescriptor(moduleId);
      const model = await descriptor.loadModel();
      const state = model.createState({ count: entry.successfulUnlockCount, random });
      model.validateState(state);
      const attempt = { id: uuid(), domain: context.domain, generation, epoch: snapshot.epoch, tabId: context.tabId,
        level, count: entry.successfulUnlockCount, moduleId, moduleVersion: descriptor.version, persistence: descriptor.persistence,
        revision: 0, status: 'active', state,
        ...(options.developmentTest ? { developmentTest: true, overrideId: options.overrideId } : {}),
      };
      snapshot.challengeState.attempts[attempt.id] = attempt;
      await assertContext(context);
      await writeSnapshot(snapshot);
      return present(attempt);
    },
    async dispatchAction(context, request) {
      if (!request || typeof request.attemptId !== 'string' || !Number.isSafeInteger(request.revision)) throw new Error('Invalid challenge request.');
      const snapshot = await readSnapshot();
      const { entry, generation } = binding(snapshot, context);
      const attempt = Object.hasOwn(snapshot.challengeState.attempts, request.attemptId) ? snapshot.challengeState.attempts[request.attemptId] : null;
      if (!matches(attempt, context, generation)) throw new Error('This challenge attempt has expired. Reload the challenge.');
      if (attempt.status === 'completed') {
        const session = snapshot.sessions[String(context.tabId)];
        const receipt = snapshot.challengeState.receipts[attempt.id];
        if (!receipt || session?.domain !== context.domain) throw new Error('This unlock has ended.');
        await assertContext(context);
        return receipt.result;
      }
      if (request.revision !== attempt.revision) return present(attempt, { reconciled: true, feedback: 'Challenge state refreshed. Please try again.' });
      const descriptor = registry.getModuleDescriptor(attempt.moduleId, attempt.moduleVersion);
      const model = await descriptor.loadModel();
      const result = model.reduceAction({ state: attempt.state, action: request.action });
      model.validateState(result.state);
      if (result.completed) {
        if (entry.successfulUnlockCount === Number.MAX_SAFE_INTEGER) throw new Error('The unlock count cannot be increased safely. Saved data was preserved.');
        entry.successfulUnlockCount += 1;
        entry.lastUnlockedAt = now();
        // Legacy difficulty is retained as a compatibility field, not a progression rule.
        snapshot.sessions[String(context.tabId)] = { domain: context.domain, epoch: snapshot.epoch, unlockedAt: now(),
          ...(attempt.developmentTest ? { developmentTest: true } : {}) };
        attempt.status = 'completed';
      }
      const changed = JSON.stringify(result.state) !== JSON.stringify(attempt.state);
      attempt.state = result.state;
      if (changed || result.completed) attempt.revision += 1;
      const response = await present(attempt, { feedback: result.feedback || '' });
      if (result.completed) snapshot.challengeState.receipts[attempt.id] = { attemptId: attempt.id, result: response };
      if (changed || result.completed) {
        await assertContext(context);
        await writeSnapshot(snapshot);
      }
      return response;
    },
  };
}
