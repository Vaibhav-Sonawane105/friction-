import { getLevel } from '../../progression';
import { buildRoute } from './generator';
import { validPath } from './solver';
export function createState({
  count,
  ...options
}) {
  const board = buildRoute({
    level: getLevel(count),
    ...options
  });
  return {
    board,
    path: [board.start]
  };
}
export function validateState(s, level) {
  const b = s?.board,
    invalid = () => {
      throw Error('Invalid saved route. Saved data was preserved.');
    };
  if (!b || ![4, 5, 6].includes(b.size) || typeof b.ordered !== 'boolean' || !Array.isArray(b.blocks) || !Array.isArray(b.checkpoints)) invalid();
  const inferred = b.checkpoints.length - 1;
  if (![1, 2, 3, 4].includes(inferred) || level !== undefined && level !== inferred || b.ordered !== (inferred === 4) || b.size !== Math.min(6, inferred + 3)) invalid();
  const cells = [b.start, b.exit, ...b.blocks, ...b.checkpoints];
  if (cells.some(c => !Number.isInteger(c) || c < 0 || c >= b.size * b.size) || new Set(cells).size !== cells.length || !validPath(b, s.path)) invalid();
}
export function toPublicState(s) {
  validateState(s);
  return structuredClone(s);
}
export function reduceAction({
  state,
  action
}) {
  validateState(state);
  let path = state.path;
  const b = state.board;
  if (action?.type === 'extend') {
    const next = [...path, action.cell];
    if (!validPath(b, next)) return {
      state,
      completed: false,
      feedback: 'Choose an adjacent clear cell and follow the checkpoint rules.'
    };
    path = next;
  } else if (action?.type === 'undo') path = path.length > 1 ? path.slice(0, -1) : path;else if (action?.type === 'clear') path = [b.start];else if (action?.type === 'submit') {
    const ok = validPath(b, path, true);
    return {
      state,
      completed: ok,
      feedback: ok ? 'Route complete.' : b.checkpoints.some(c => !path.includes(c)) ? 'Visit every checkpoint before finishing.' : 'Finish at the exit.'
    };
  } else throw Error('Invalid route action.');
  return {
    state: {
      ...state,
      path
    },
    completed: false,
    feedback: ''
  };
}
