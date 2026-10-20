import { getLevel } from '../challenges/progression';
import { getModuleMetadata as getModuleDescriptor, selectModuleIds } from '../challenges/catalog';
import { invalidateDomain } from '../services/challengeState';
import { readChallengeSnapshot, writeChallengeSnapshot } from '../services/storage';

const OVERRIDES = 'pf_dev_challenge_overrides';
const readOverrides = async () => (await chrome.storage.session.get(OVERRIDES))[OVERRIDES] || {};

// This module and its message registration must be absent from release output.
export async function handleChallengeControl(message, sender) {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('index.html')) throw new Error('Development controls require the extension popup.');
  if (!['INSPECT','SET_COUNT','PREPARE_CHALLENGE','RESET_CHALLENGE'].includes(message.operation)) throw new Error('Unknown development operation.');
  if (typeof message.domain !== 'string') throw new Error('Select a configured website.');
  const snapshot = await readChallengeSnapshot();
  const entry = snapshot.domains.find(item => item.domain === message.domain);
  if (!entry) throw new Error('This website is no longer configured.');
  if (message.operation === 'INSPECT') return inspect(snapshot, entry, await readOverrides());
  if (message.operation === 'SET_COUNT') getLevel(message.count);
  const count = message.operation === 'SET_COUNT' ? message.count : entry.successfulUnlockCount;
  const level = getLevel(count);
  if (message.operation === 'PREPARE_CHALLENGE') {
    if (entry.enabled === false) throw new Error('Enable the website before preparing a challenge.');
    if (!selectModuleIds(level).includes(message.moduleId)) throw new Error('That challenge is unavailable at the selected level.');
    const descriptor = getModuleDescriptor(message.moduleId);
    if (message.variant !== undefined && !descriptor.variants?.includes(message.variant)) throw new Error('That challenge variant is unavailable.');
    if (message.durationSeconds !== undefined && (message.moduleId !== 'wait' || !Number.isInteger(message.durationSeconds) || message.durationSeconds < 1 || message.durationSeconds > 480)) throw new Error('Test timers require 1–480 whole seconds and an available waiting module.');
  } else if (message.moduleId !== undefined || message.variant !== undefined || message.durationSeconds !== undefined) {
    throw new Error('Challenge options require the prepare operation.');
  }
  const previous = await readOverrides();
  const overrides = structuredClone(previous);
  delete overrides[entry.domain];
  snapshot.challengeState = invalidateDomain(snapshot.challengeState, entry.domain);
  if (message.operation === 'SET_COUNT') entry.successfulUnlockCount = count;
  for (const [tabId, session] of Object.entries(snapshot.sessions)) if (session.domain === entry.domain) delete snapshot.sessions[tabId];
  if (message.operation === 'PREPARE_CHALLENGE') overrides[entry.domain] = {
    id: crypto.randomUUID(), generation: snapshot.challengeState.domains[entry.domain].generation,
    moduleId: message.moduleId,
    ...(message.variant !== undefined ? { variant: message.variant } : {}),
    ...(message.durationSeconds !== undefined ? { durationSeconds: message.durationSeconds } : {}),
  };
  // Session setup happens first. If local persistence fails, old-generation overrides cannot apply.
  await chrome.storage.session.set({ [OVERRIDES]: overrides });
  try { await writeChallengeSnapshot(snapshot); }
  catch (error) {
    try { await chrome.storage.session.set({ [OVERRIDES]: previous }); } catch { /* Generation check rejects uncommitted metadata. */ }
    throw error;
  }
  return inspect(snapshot, entry, overrides);
}

function inspect(snapshot, entry, overrides) {
  const modules = selectModuleIds(getLevel(entry.successfulUnlockCount));
  return { domain: entry.domain, count: entry.successfulUnlockCount, level: getLevel(entry.successfulUnlockCount),
    modules, variants: Object.fromEntries(modules.map(id => [id, getModuleDescriptor(id).variants || []])), override: overrides[entry.domain] || null,
    attempts: Object.values(snapshot.challengeState.attempts).filter(attempt => attempt.domain === entry.domain)
      .map(({ id, moduleId, status, tabId }) => ({ id, moduleId, status, tabId })) };
}

export async function getDevelopmentOverride(context) {
  const snapshot = await readChallengeSnapshot();
  const override = (await readOverrides())[context.domain];
  return override?.generation === snapshot.challengeState.domains[context.domain]?.generation ? override : null;
}

export async function consumeDevelopmentOverride(context, result, override) {
  if (!override || !result.attemptId) return;
  const snapshot = await readChallengeSnapshot();
  if (snapshot.challengeState.attempts[result.attemptId]?.overrideId !== override.id) return;
  const overrides = await readOverrides();
  if (overrides[context.domain]?.id === override.id) {
    delete overrides[context.domain];
    await chrome.storage.session.set({ [OVERRIDES]: overrides });
  }
}
