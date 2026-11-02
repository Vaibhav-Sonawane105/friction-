import { shuffle, fingerprint } from './generation';
export function recordPuzzle(history, id, state) {
  const fingerprints = {
    ...history.fingerprints,
    [id]: [...(history.fingerprints?.[id] || []), fingerprint(state.board || state.questions || state.cards)].slice(-4)
  };
  return {
    ...history,
    fingerprints,
    ...(id === 'maths' ? {
      templates: [...(history.templates || []), ...state.questions.map(q => q.id)].slice(-8)
    } : {})
  };
}
export function reserveType({
  history = {},
  choices,
  random = Math.random
}) {
  let bag = history.bag?.slice() || [];
  if (bag.some(id => !choices.includes(id)) || new Set(bag).size !== bag.length) throw Error('Invalid saved rotation.');
  if (!bag.length) {
    bag = shuffle(choices, random);
    if (bag.length > 1 && bag[0] === history.last) [bag[0], bag[1]] = [bag[1], bag[0]];
  }
  const moduleId = bag.shift();
  return {
    moduleId,
    nextHistory: {
      ...history,
      bag,
      last: moduleId
    }
  };
}
