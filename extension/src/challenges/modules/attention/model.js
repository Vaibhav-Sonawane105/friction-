import { getLevel } from '../../progression';

const shapes = ['Circle', 'Triangle', 'Square', 'Diamond', 'Star', 'Plus'];
const colors = ['coral', 'teal', 'blue', 'purple', 'amber', 'pink'];
const sizes = [12, 16, 20];
const invalid = () => { throw new Error('Saved attention challenge is invalid. Saved data was preserved.'); };
const matches = (a, b) => typeof a === 'string' ? a === b : a.shape === b.shape && a.color === b.color && a.fill === b.fill;
const validSymbol = value => value && typeof value === 'object' && !Array.isArray(value) &&
  shapes.includes(value.shape) && colors.includes(value.color) && ['filled', 'outline'].includes(value.fill);
const copySymbol = value => typeof value === 'string' ? value : { shape: value.shape, color: value.color, fill: value.fill };

export function createState({ count, random = Math.random }) {
  if (getLevel(count) !== 3) throw new Error('Attention challenges require Level 3.');
  const integer = max => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid random source.');
    return Math.floor(value * max);
  };
  const shuffle = values => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = integer(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const targets = shuffle(shapes).slice(0, 3);
  const stages = targets.map((shape, index) => {
    const target = { shape, color: colors[integer(colors.length)], fill: index === 2 && integer(2) ? 'outline' : 'filled' };
    const targetCount = index + 3;
    const near = [
      { ...target, color: colors[(colors.indexOf(target.color) + 1) % colors.length] },
      { ...target, shape: shapes[(shapes.indexOf(shape) + 1) % shapes.length] },
      ...(index === 2 ? [{ ...target, fill: target.fill === 'filled' ? 'outline' : 'filled' }] : []),
    ];
    const pool = shapes.flatMap(shape => colors.flatMap(color => (index === 2 ? ['filled', 'outline'] : ['filled'])
      .map(fill => ({ shape, color, fill })))).filter(tile => !matches(tile, target));
    const tiles = [...Array.from({ length: targetCount }, () => ({ ...target })), ...near,
      ...shuffle(pool).slice(0, sizes[index] - targetCount - near.length)];
    return { target, tiles: shuffle(tiles) };
  });
  return { rulesVersion: 2, stage: 0, selected: [], stages };
}

export function validateState(state) {
  if (!state || !Number.isSafeInteger(state.stage) || state.stage < 0 || state.stage > 3 ||
      !Array.isArray(state.stages) || state.stages.length !== 3 || !Array.isArray(state.selected) ||
      (state.rulesVersion !== undefined && state.rulesVersion !== 2)) invalid();
  const precise = state.rulesVersion === 2;
  for (const [index, stage] of state.stages.entries()) {
    const valid = value => precise ? validSymbol(value) && (index === 2 || value.fill === 'filled') : shapes.includes(value);
    if (!stage || !valid(stage.target) || !Array.isArray(stage.tiles) || stage.tiles.length !== sizes[index] ||
        Array.from(stage.tiles).some(tile => !valid(tile)) ||
        stage.tiles.filter(tile => matches(tile, stage.target)).length !== index + 3) invalid();
  }
  if (new Set(state.stages.map(stage => precise ? stage.target.shape : stage.target)).size !== 3 || new Set(state.selected).size !== state.selected.length) invalid();
  if (state.stage === 3) { if (state.selected.length !== 0) invalid(); return; }
  const current = state.stages[state.stage];
  if (state.selected.length >= state.stage + 3 || Array.from(state.selected).some(index =>
    !Number.isSafeInteger(index) || index < 0 || index >= current.tiles.length || !matches(current.tiles[index], current.target))) invalid();
}

export function toPublicState(state) {
  validateState(state);
  const stage = state.stages[Math.min(state.stage, 2)];
  const selected = state.stage === 3
    ? stage.tiles.flatMap((tile, index) => matches(tile, stage.target) ? [index] : []) : [...state.selected];
  return {
    stageNumber: Math.min(state.stage + 1, 3), completedStages: state.stage, totalStages: 3,
    target: copySymbol(stage.target), tiles: stage.tiles.map(copySymbol), selected,
    targetsFound: selected.length, targetsTotal: stage.tiles.filter(tile => matches(tile, stage.target)).length,
    instructions: state.rulesVersion === 2
      ? `Match the target's shape and colour${state.stage >= 2 ? ', including whether it is filled or outlined' : ''}. Correct selections stay marked.`
      : 'Select every tile matching the target above. Correct selections stay marked; wrong clicks keep your progress.',
  };
}

export function reduceAction({ state, action }) {
  validateState(state);
  const current = state.stages[state.stage], index = action?.index;
  if (!current || action?.type !== 'select' || !Number.isSafeInteger(index) || index < 0 ||
      index >= current.tiles.length || state.selected.includes(index)) throw new Error('Invalid attention action. Choose an unmarked tile.');
  if (!matches(current.tiles[index], current.target)) return { state, completed: false, feedback: 'That tile does not match the target. Try again.' };
  const selected = [...state.selected, index];
  if (selected.length === state.stage + 3) {
    const next = { ...state, stage: state.stage + 1, selected: [] };
    return { state: next, completed: next.stage === 3, feedback: next.stage === 3 ? '' : 'Stage complete. Find the new target.' };
  }
  return { state: { ...state, selected }, completed: false, feedback: 'Target found. Progress saved.' };
}
