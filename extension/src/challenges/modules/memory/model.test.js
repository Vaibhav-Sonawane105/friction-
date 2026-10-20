import { expect, it } from 'vitest';
import { getModuleDescriptor } from '../../registry';

const model = async () => getModuleDescriptor('memory').loadModel();
const fixture = () => ({ cards: ['Circle', 'Triangle', 'Square', 'Diamond', 'Circle', 'Triangle', 'Square', 'Diamond'], matched: [], revealed: [] });

it('creates six shuffled pairs at both ends of Level 3 without exposing hidden symbols', async () => {
  const { createState, validateState, toPublicState } = await model();
  for (const count of [31, 50]) for (const value of [0, 0.5, 0.999999]) {
    const state = createState({ count, random: () => value });
    expect(state.cards).toHaveLength(12); expect(new Set(state.cards).size).toBe(6);
    for (const shape of new Set(state.cards)) expect(state.cards.filter(card => card === shape)).toHaveLength(2);
    expect(() => validateState(state)).not.toThrow();
    const shown = toPublicState(state);
    expect(shown.pairsMatched).toBe(0); expect(shown.totalPairs).toBe(6);
    expect(shown.cards.every(card => card.value === null && !card.faceUp && !card.matched)).toBe(true);
  }
});
it('reveals only a selected card and leaves the input state unchanged', async () => {
  const { reduceAction, toPublicState } = await model();
  const state = fixture(), before = structuredClone(state);
  const result = reduceAction({ state, action: { type: 'flip', index: 0 } });
  expect(state).toEqual(before); expect(result.completed).toBe(false);
  expect(result.state.revealed).toEqual([0]);
  expect(toPublicState(result.state).cards).toEqual([
    { value: 'Circle', faceUp: true, matched: false },
    ...Array.from({ length: 7 }, () => ({ value: null, faceUp: false, matched: false })),
  ]);
});
it('keeps mismatches visible until the next hidden-card selection, without reshuffling', async () => {
  const { reduceAction, toPublicState } = await model();
  let state = fixture();
  state = reduceAction({ state, action: { type: 'flip', index: 0 } }).state;
  const mismatch = reduceAction({ state, action: { type: 'flip', index: 1 } });
  expect(mismatch.state.revealed).toEqual([0, 1]); expect(mismatch.completed).toBe(false);
  expect(toPublicState(mismatch.state).cards[1].value).toBe('Triangle');
  const next = reduceAction({ state: mismatch.state, action: { type: 'flip', index: 2 } });
  expect(next.state.revealed).toEqual([2]); expect(next.state.cards).toEqual(fixture().cards);
  expect(next.state.matched).toEqual([]);
  expect(toPublicState(next.state).cards[0].value).toBeNull();
  expect(mismatch.state.revealed).toEqual([0, 1]);
});
it('retains every matched pair and completes only after all four are matched', async () => {
  const { reduceAction, toPublicState } = await model();
  let state = fixture();
  for (let pair = 0; pair < 4; pair++) {
    const first = reduceAction({ state, action: { type: 'flip', index: pair } });
    expect(first.completed).toBe(false);
    const second = reduceAction({ state: first.state, action: { type: 'flip', index: pair + 4 } });
    expect(second.completed).toBe(pair === 3);
    state = second.state;
    expect(toPublicState(state).pairsMatched).toBe(pair + 1);
    expect(state.revealed).toEqual([]);
    expect(toPublicState(state).cards[pair]).toEqual({ value: fixture().cards[pair], faceUp: true, matched: true });
  }
});
it('rejects re-flipping visible/matched cards and forged or malformed actions', async () => {
  const { reduceAction } = await model();
  const state = { ...fixture(), matched: [0, 4], revealed: [1] };
  for (const action of [{ type: 'complete' }, { type: 'flip', index: '2' }, { type: 'flip', index: -1 },
    { type: 'flip', index: 8 }, { type: 'flip', index: 0.5 }, { type: 'flip', index: NaN },
    { type: 'flip', index: 0 }, { type: 'flip', index: 4 }, { type: 'flip', index: 1 }]) {
    expect(() => reduceAction({ state, action })).toThrow();
  }
  expect(state.matched).toEqual([0, 4]); expect(state.revealed).toEqual([1]);
});
it('rejects corrupt boards and impossible reveal/match progress while preserving saved data', async () => {
  const { validateState } = await model(), state = fixture();
  const corrupt = [null, {}, { ...state, cards: state.cards.slice(1) },
    { ...state, cards: ['Circle', 'Circle', 'Circle', 'Circle', 'Square', 'Square', 'Diamond', 'Diamond'] },
    { ...state, cards: state.cards.map(card => card === 'Circle' ? 'Secret' : card) },
    { ...state, matched: [0] }, { ...state, matched: [0, 1] }, { ...state, matched: [0, 0] },
    { ...state, matched: [0, 8] }, { ...state, matched: [0, 4], revealed: [0] },
    { ...state, revealed: [0, 0] }, { ...state, revealed: [0, 4] }, { ...state, revealed: [0, 1, 2] },
    { ...state, revealed: ['0'] }, { ...state, revealed: [-1] }, { ...state, revealed: Array(1) }];
  for (const value of corrupt) expect(() => validateState(value)).toThrow(/preserved/i);
});
it('shuffles the six pairs using the supplied random source', async () => {
  const { createState } = await model();
  expect(createState({ count: 31, random: () => 0.999999 }).cards).toEqual(['Circle', 'Triangle', 'Square', 'Diamond', 'Star', 'Plus', 'Circle', 'Triangle', 'Square', 'Diamond', 'Star', 'Plus']);
  expect(createState({ count: 31, random: () => 0 }).cards).not.toEqual(createState({ count: 31, random: () => 0.999999 }).cards);
});
it('requires all six pairs on new boards while still allowing an old four-pair game to finish', async () => {
  const { createState, reduceAction, toPublicState } = await model();
  let state = createState({ count: 31, random: () => 0.999999 });
  for (let pair = 0; pair < 6; pair++) {
    const first = reduceAction({ state, action: { type: 'flip', index: pair } });
    expect(first.completed).toBe(false);
    const second = reduceAction({ state: first.state, action: { type: 'flip', index: pair + 6 } });
    expect(second.completed).toBe(pair === 5);
    state = second.state;
    expect(toPublicState(state).pairsMatched).toBe(pair + 1);
  }
  expect(toPublicState(fixture()).totalPairs).toBe(4);
});
it('does not use fixed partner positions across fresh boards', async () => {
  const { createState } = await model();
  let seed = 417;
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
  const boards = [], positions = new Set();
  for (let i = 0; i < 100; i++) {
    const state = createState({ count: 31, random });
    expect(state.cards).toHaveLength(12);
    boards.push(state.cards.join(','));
    positions.add(state.cards.flatMap((card, index) => card === 'Circle' ? [index] : []).join(','));
  }
  expect(new Set(boards).size).toBeGreaterThan(95);
  expect(positions.size).toBeGreaterThan(30);
});
it('rejects invalid counts and randomness without creating a board', async () => {
  const { createState } = await model();
  for (const count of [0, 30, 51, -1, '31', NaN]) expect(() => createState({ count })).toThrow();
  for (const value of [-0.1, 1, Infinity, NaN]) expect(() => createState({ count: 31, random: () => value })).toThrow();
});
