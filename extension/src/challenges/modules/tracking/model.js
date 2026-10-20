import { getLevel } from '../../progression';

const invalid = () => { throw new Error('Saved tracking challenge is invalid. Saved data was preserved.'); };
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const timing = round => ({ highlightMs: 1400, stepMs: 900 - round * 150, pauseMs: 150 });
const duration = (round, swaps) => { const t = timing(round); return t.highlightMs + swaps * (t.stepMs + t.pauseMs); };

export function createState({ count, random = Math.random }) {
  if (getLevel(count) !== 3) throw new Error('Tracking challenges require Level 3.');
  const pick = max => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid random source.');
    return Math.floor(value * max);
  };
  const rounds = [3,4,5].map((size, index) => {
    const target = pick(size), swaps = [];
    let slot = target;
    for (let step = 0; step < index + 4; step++) {
      const choices = [];
      for (let a = 0; a < size; a++) for (let b = a + 1; b < size; b++) {
        const previous = swaps[step - 1];
        if (previous?.[0] === a && previous?.[1] === b) continue;
        if (step % 2 === 0 && a !== slot && b !== slot) continue;
        choices.push([a,b]);
      }
      const pair = choices[pick(choices.length)]; swaps.push(pair);
      if (slot === pair[0]) slot = pair[1]; else if (slot === pair[1]) slot = pair[0];
    }
    return { size, target, swaps };
  });
  return { round: 0, phase: 'ready', run: 0, mode: null, startedAt: null, rounds };
}

export function validateState(state) {
  if (!state || !integer(state.round, 0, 3) || !integer(state.run, 0, Number.MAX_SAFE_INTEGER) ||
      !['ready','watching','choose','done'].includes(state.phase) || !Array.isArray(state.rounds) || state.rounds.length !== 3 ||
      (state.round === 3) !== (state.phase === 'done')) invalid();
  for (const [index, round] of state.rounds.entries()) {
    if (!round || round.size !== index + 3 || !integer(round.target, 0, round.size - 1) ||
        !Array.isArray(round.swaps) || round.swaps.length !== index + 4) invalid();
    for (const pair of round.swaps) if (!Array.isArray(pair) || pair.length !== 2 ||
      !integer(pair[0], 0, round.size - 1) || !integer(pair[1], 0, round.size - 1) || pair[0] === pair[1]) invalid();
  }
  if (['ready','done'].includes(state.phase)) { if (state.mode !== null || state.startedAt !== null) invalid(); }
  else if (!['motion','steps'].includes(state.mode) || !integer(state.startedAt, 0, Number.MAX_SAFE_INTEGER) || state.run < 1) invalid();
}

export function toPublicState(state) {
  validateState(state);
  const round = state.rounds[Math.min(state.round, 2)];
  return { roundNumber: Math.min(state.round + 1, 3), completedRounds: state.round, totalRounds: 3,
    phase: state.phase, run: state.run, mode: state.mode, size: round.size,
    durationMs: duration(Math.min(state.round, 2), round.swaps.length),
    ...(state.phase === 'watching' ? { plan: { size: round.size, target: round.target,
      swaps: round.swaps.map(pair => [...pair]), ...timing(state.round) } } : {}),
  };
}

export function reduceAction({ state, action, now }) {
  validateState(state);
  if (!action || state.phase === 'done') throw new Error('Invalid tracking action.');
  if (action.type === 'start') {
    if (!['motion','steps'].includes(action.mode) || !integer(now, 0, Number.MAX_SAFE_INTEGER) || state.run === Number.MAX_SAFE_INTEGER) throw new Error('Invalid tracking start.');
    return { state: { ...state, phase: 'watching', run: state.run + 1, mode: action.mode, startedAt: now }, completed: false, feedback: '' };
  }
  if (action.type === 'finish') {
    if (state.phase !== 'watching' || !integer(now, state.startedAt, Number.MAX_SAFE_INTEGER) ||
        (state.mode === 'motion' && now - state.startedAt < duration(state.round, state.rounds[state.round].swaps.length))) throw new Error('Watch the full shuffle before choosing.');
    return { state: { ...state, phase: 'choose' }, completed: false, feedback: 'Select the target’s final position.' };
  }
  const round = state.rounds[state.round];
  if (action.type !== 'choose' || state.phase !== 'choose' || !integer(action.index, 0, round.size - 1)) throw new Error('Invalid tracking choice.');
  let answer = round.target;
  for (const [a,b] of round.swaps) { if (answer === a) answer = b; else if (answer === b) answer = a; }
  const correct = action.index === answer, nextRound = state.round + (correct ? 1 : 0);
  return { state: { ...state, round: nextRound, phase: nextRound === 3 ? 'done' : 'ready', mode: null, startedAt: null },
    completed: nextRound === 3, feedback: correct ? 'Round complete. Progress saved.' : 'That was not the target. Replay this round; completed rounds are saved.' };
}
