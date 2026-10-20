import { createChallengeCoordinator } from './challenges';
import * as registry from '../challenges/registry';
import { readChallengeSnapshot, writeChallengeSnapshot } from './storage';

const preview = createChallengeCoordinator({ readSnapshot: readChallengeSnapshot, writeSnapshot: writeChallengeSnapshot, registry });
let previewTail = Promise.resolve();

export async function requestChallenge(domain, message) {
  if (globalThis.chrome?.runtime?.sendMessage) {
    const response = await chrome.runtime.sendMessage(message);
    if (!response?.success) throw new Error(response?.error || 'Could not load or save the challenge. Please try again.');
    return response;
  }
  // Browser preview shares the models/coordinator, but cannot emulate Chrome lifecycle.
  const execute = async () => {
    const context = { tabId: 0, domain, epoch: 'preview', documentId: 'preview' };
    return message.type === 'GET_CHALLENGE' ? preview.getChallenge(context, { developmentTest: true }) : preview.dispatchAction(context, message);
  };
  const result = previewTail.then(execute);
  previewTail = result.catch(() => {});
  return result;
}
