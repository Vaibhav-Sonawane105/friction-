import { expect, it } from 'vitest';
import { getModuleDescriptor } from '../../registry';

const model = async () => getModuleDescriptor('attention').loadModel();
const matches = (a, b) => typeof a === 'string' ? a === b : a.shape === b.shape && a.color === b.color && a.fill === b.fill;
const fixture = () => ({ stage: 0, selected: [], stages: [
  { target: 'Star', tiles: ['Star', 'Circle', 'Triangle', 'Star', 'Square', 'Diamond', 'Star', 'Plus', 'Circle', 'Square', 'Triangle', 'Diamond'] },
  { target: 'Circle', tiles: ['Circle', 'Circle', 'Circle', 'Circle', 'Triangle', 'Square', 'Diamond', 'Star', 'Plus', 'Triangle', 'Square', 'Diamond', 'Star', 'Plus', 'Triangle', 'Square'] },
  { target: 'Triangle', tiles: ['Triangle', 'Triangle', 'Triangle', 'Triangle', 'Triangle', 'Circle', 'Square', 'Diamond', 'Star', 'Plus', 'Circle', 'Square', 'Diamond', 'Star', 'Plus', 'Circle', 'Square', 'Diamond', 'Star', 'Plus'] },
] });

it('creates three solvable grids of increasing size with different targets', async () => {
  const { createState, validateState } = await model();
  for (const count of [31, 50]) for (const value of [0, 0.5, 0.999999]) {
    const state = createState({ count, random: () => value });
    expect(state.stage).toBe(0); expect(state.selected).toEqual([]);
    expect(state.stages.map(stage => stage.tiles.length)).toEqual([12, 16, 20]);
    expect(new Set(state.stages.map(stage => stage.target.shape)).size).toBe(3);
    expect(state.stages.map(stage => stage.tiles.filter(tile => matches(tile, stage.target)).length)).toEqual([3, 4, 5]);
    for (const stage of state.stages) {
      expect(stage.tiles.some(tile => tile.shape === stage.target.shape && tile.color !== stage.target.color)).toBe(true);
      expect(stage.tiles.some(tile => tile.shape !== stage.target.shape && tile.color === stage.target.color)).toBe(true);
    }
    const final = state.stages[2];
    expect(final.tiles.some(tile => tile.shape === final.target.shape && tile.color === final.target.color && tile.fill !== final.target.fill)).toBe(true);
    expect(() => validateState(state)).not.toThrow();
  }
});
it('saves correct selections immutably and keeps wrong clicks from erasing them', async () => {
  const { reduceAction, toPublicState } = await model();
  const state = fixture(), before = structuredClone(state);
  const correct = reduceAction({ state, action: { type: 'select', index: 3 } });
  expect(state).toEqual(before); expect(correct.state.selected).toEqual([3]); expect(correct.completed).toBe(false);
  const wrong = reduceAction({ state: correct.state, action: { type: 'select', index: 1 } });
  expect(wrong.state).toEqual(correct.state); expect(wrong.completed).toBe(false); expect(wrong.feedback).toMatch(/try again/i);
  expect(toPublicState(correct.state)).toMatchObject({ target: 'Star', targetsFound: 1, targetsTotal: 3, completedStages: 0, stageNumber: 1, totalStages: 3 });
});
it('requires every target in every stage before reporting completion', async () => {
  const { reduceAction, toPublicState } = await model();
  let state = fixture();
  const solutions = [[0, 3, 6], [0, 1, 2, 3], [0, 1, 2, 3, 4]];
  for (let stage = 0; stage < 3; stage++) {
    for (const [position, index] of solutions[stage].entries()) {
      const result = reduceAction({ state, action: { type: 'select', index } });
      expect(result.completed).toBe(stage === 2 && position === 4);
      expect(result.state.stage).toBe(position === solutions[stage].length - 1 ? stage + 1 : stage);
      state = result.state;
    }
    expect(state.selected).toEqual([]);
  }
  expect(toPublicState(state)).toMatchObject({ completedStages: 3, targetsFound: 5, targetsTotal: 5 });
});
it('projects only the current grid and returns copies of selectable state', async () => {
  const { toPublicState } = await model();
  const state = fixture();
  const shown = toPublicState(state);
  expect(shown.stages).toBeUndefined(); expect(shown.tiles).toHaveLength(12);
  shown.tiles[0] = 'Plus'; shown.selected.push(0);
  expect(state.stages[0].tiles[0]).toBe('Star'); expect(state.selected).toEqual([]);
});
it('rejects duplicate, forged and out-of-bounds selections without accepting client completion', async () => {
  const { reduceAction } = await model();
  const state = { ...fixture(), selected: [0] };
  for (const action of [{ type: 'complete' }, { type: 'select', index: '3' }, { type: 'select', index: 0 },
    { type: 'select', index: -1 }, { type: 'select', index: 12 }, { type: 'select', index: 0.5 }, { type: 'select', index: NaN }]) {
    expect(() => reduceAction({ state, action })).toThrow();
  }
  expect(state.selected).toEqual([0]);
});
it('rejects corrupt grids and impossible saved progress instead of resetting it', async () => {
  const { validateState } = await model();
  const changeFirst = update => { const state = fixture(); Object.assign(state.stages[0], update); return state; };
  const corrupt = [null, {}, { ...fixture(), stage: -1 }, { ...fixture(), stage: 4 }, { ...fixture(), stage: 0.5 },
    { ...fixture(), stages: [] }, { ...fixture(), selected: [1] }, { ...fixture(), selected: [0, 0] },
    { ...fixture(), selected: ['0'] }, { ...fixture(), selected: Array(1) }, { ...fixture(), selected: [12] },
    { ...fixture(), selected: [0, 3, 6] }, { ...fixture(), stage: 3, selected: [0] },
    changeFirst({ target: 'Unknown' }), changeFirst({ tiles: Array(12).fill('Circle') }),
    changeFirst({ tiles: fixture().stages[0].tiles.slice(1) })];
  for (const state of corrupt) expect(() => validateState(state)).toThrow(/preserved/i);
});
it('rejects invalid count and random inputs', async () => {
  const { createState } = await model();
  for (const count of [0, 30, 51, -1, '31', NaN]) expect(() => createState({ count })).toThrow();
  for (const value of [-0.1, 1, Infinity, NaN]) expect(() => createState({ count: 31, random: () => value })).toThrow();
});
it('varies fresh targets and tile positions while keeping every generated stage solvable', async () => {
  const { createState, validateState } = await model();
  let seed = 884;
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
  const boards = new Set(), targets = new Set();
  for (let i = 0; i < 100; i++) {
    const state = createState({ count: 31 + i % 20, random });
    expect(() => validateState(state)).not.toThrow();
    for (const stage of state.stages) {
      targets.add(stage.target.shape);
      expect(stage.tiles.filter(tile => !matches(tile, stage.target)).length).toBeGreaterThan(0);
    }
    boards.add(JSON.stringify(state.stages[0].tiles));
  }
  expect(boards.size).toBeGreaterThan(95); expect(targets.size).toBe(6);
});
function preciseFixture() {
  const state = fixture(); state.rulesVersion = 2;
  state.stages = state.stages.map((stage, index) => ({
    target: { shape: stage.target, color: 'blue', fill: index === 2 ? 'outline' : 'filled' },
    tiles: stage.tiles.map(shape => ({ shape, color: 'blue', fill: index === 2 && shape === stage.target ? 'outline' : 'filled' })),
  }));
  state.stages[0].tiles[1] = { shape: 'Star', color: 'pink', fill: 'filled' };
  state.stages[2].tiles[5] = { shape: 'Triangle', color: 'blue', fill: 'filled' };
  return state;
}
it('rejects near matches by colour, shape and final-stage fill without erasing progress', async () => {
  const { reduceAction } = await model();
  const state = preciseFixture();
  for (const index of [1, 2]) expect(reduceAction({ state, action: { type: 'select', index } })).toMatchObject({ state, completed: false });
  expect(reduceAction({ state, action: { type: 'select', index: 0 } }).state.selected).toEqual([0]);
  state.stage = 2;
  expect(reduceAction({ state, action: { type: 'select', index: 5 } }).state.selected).toEqual([]);
  expect(reduceAction({ state, action: { type: 'select', index: 0 } }).state.selected).toEqual([0]);
});
it('copies nested symbol attributes and rejects corrupt or mixed attribute state', async () => {
  const { toPublicState, validateState } = await model();
  const state = preciseFixture(), shown = toPublicState(state);
  shown.target.color = 'pink'; shown.tiles[0].shape = 'Circle';
  expect(state.stages[0].target.color).toBe('blue'); expect(state.stages[0].tiles[0].shape).toBe('Star');
  for (const mutate of [s => { s.rulesVersion = 3; }, s => { delete s.rulesVersion; },
    s => { s.stages[0].target.color = 'unknown'; }, s => { s.stages[2].target.fill = 'unknown'; },
    s => { s.stages[0].tiles[1] = 'Circle'; }]) {
    const corrupted = preciseFixture(); mutate(corrupted);
    expect(() => validateState(corrupted)).toThrow(/preserved/i);
  }
});
