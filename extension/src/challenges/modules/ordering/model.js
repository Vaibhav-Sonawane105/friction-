import { getLevel } from '../../progression';
import { buildOrdering } from './generator';
import { brokenClueIds, describe } from './clues';
export function createState({
  count,
  ...options
}) {
  const board = buildOrdering({
    level: getLevel(count),
    ...options
  });
  return {
    board,
    row: [...board.objects],
    broken: []
  };
}
export function validateState(s, level) {
  const names = s?.board?.objects,
    clues = s?.board?.clues,
    n = names?.length;
  const invalid = () => {
    throw Error('Invalid saved ordering puzzle. Saved data was preserved.');
  };
  if (!Array.isArray(names) || n < 4 || n > 7 || level !== undefined && n !== level + 3 || new Set(names).size !== n || names.some(x => typeof x !== 'string' || !x.trim()) || !Array.isArray(clues) || clues.length < n - 1 || clues.length > n + (n === 7 ? 1 : 0)) invalid();
  for (const c of clues) {
    if (!c || !['end', 'before', 'next', 'apart', 'between', 'gap'].includes(c.kind) || !names.includes(c.a)) invalid();
    if (c.kind !== 'end' && (!names.includes(c.b) || c.a === c.b)) invalid();
    if (c.kind === 'between' && (!names.includes(c.c) || [c.a, c.b].includes(c.c))) invalid();
    if (c.kind === 'gap' && (!Number.isInteger(c.n) || c.n < 1 || c.n > n - 2)) invalid();
  }
  if (!Array.isArray(s.row) || s.row.length !== n || new Set(s.row).size !== n || s.row.some(x => !names.includes(x)) || !Array.isArray(s.broken) || s.broken.some(i => !Number.isInteger(i) || i < 0 || i >= clues.length)) invalid();
}
export function toPublicState(s) {
  validateState(s);
  return {
    row: [...s.row],
    clues: s.board.clues.map(describe),
    broken: [...s.broken]
  };
}
export function reduceAction({
  state,
  action
}) {
  validateState(state);
  if (action?.type === 'submit') {
    const broken = brokenClueIds(state.row, state.board.clues);
    return {
      state: {
        ...state,
        broken
      },
      completed: !broken.length,
      feedback: broken.length ? 'Check the marked clues and adjust your order.' : 'Order complete.'
    };
  }
  const {
    from,
    to
  } = action || {};
  if (action?.type !== 'reorder' || ![from, to].every(i => Number.isInteger(i) && i >= 0 && i < state.row.length)) throw Error('Invalid reorder action.');
  const row = [...state.row];
  row.splice(to, 0, row.splice(from, 1)[0]);
  return {
    state: {
      ...state,
      row,
      broken: []
    },
    completed: false,
    feedback: ''
  };
}
