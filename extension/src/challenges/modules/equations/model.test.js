import { expect, it } from 'vitest';
import { createState, validateState, toPublicState, reduceAction } from './model';

const sequence = values => { let index = 0; return () => values[index++ % values.length]; };
const linear = { variant: 'linear', a: 2, b: 3, rhs: 11, answer: 4 };
const derivative = { variant: 'derivative', a: 2, b: 3, c: 1, at: 2, answer: 11 };

it('constructs a linear equation from an integer solution', () => {
  const state = createState({ count: 21, variant: 'linear', random: sequence([0.2, 0.6, 0.7]) });
  expect(state).toEqual(linear);
  expect(toPublicState(state)).toEqual({ variant: 'linear', expression: '2x + 3 = 11', instructions: 'Solve for x. Enter the whole-number value of x.', answerLabel: 'Value of x' });
});
it('constructs a quadratic derivative evaluated at a numeric point', () => {
  const state = createState({ count: 30, variant: 'derivative', random: sequence([0.2, 0.65, 0.55, 0.4]) });
  expect(state).toEqual(derivative);
  expect(toPublicState(state)).toEqual({ variant: 'derivative', expression: 'f(x) = 2x² + 3x + 1', instructions: 'Differentiate f(x), then evaluate at x = 2. Enter only the numeric value of f′(2).', answerLabel: 'Value of f′(2)' });
});
it('randomly selects either variant once per new question', () => {
  expect(createState({ count: 21, random: () => 0 }).variant).toBe('linear');
  expect(createState({ count: 30, random: () => 0.9 }).variant).toBe('derivative');
});
it.each([linear, derivative])('validates strict integer submissions without changing a saved question', state => {
  const before = structuredClone(state);
  for (const answer of ['', 'not a number', `${state.answer}x`, `${state.answer}.0`, '9007199254740992', String(state.answer + 1)]) {
    expect(reduceAction({ state, action: { type: 'submit', answer } })).toMatchObject({ state: before, completed: false });
  }
  expect(reduceAction({ state, action: { type: 'submit', answer: ` ${state.answer} ` } }).completed).toBe(true);
  expect(state).toEqual(before);
  expect(toPublicState(state).answer).toBeUndefined();
  expect(() => reduceAction({ state, action: { type: 'complete', completed: true } })).toThrow();
});
it('supports zero and negative solutions, clean signs and omitted zero terms', () => {
  const negative = { variant: 'linear', a: 1, b: -3, rhs: -7, answer: -4 };
  expect(toPublicState(negative).expression).toBe('x - 3 = -7');
  expect(reduceAction({ state: negative, action: { type: 'submit', answer: '-4' } }).completed).toBe(true);
  const zero = { variant: 'derivative', a: 1, b: 0, c: 0, at: 0, answer: 0 };
  expect(toPublicState(zero).expression).toBe('f(x) = x²');
  expect(reduceAction({ state: zero, action: { type: 'submit', answer: '0' } }).completed).toBe(true);
});
it('rejects unsupported variants, out-of-level counts and invalid randomness', () => {
  for (const count of [0,20,31,-1,NaN,'21']) expect(() => createState({ count })).toThrow();
  expect(() => createState({ count: 21, variant: 'integral' })).toThrow();
  for (const value of [-0.1,1,Infinity,NaN]) expect(() => createState({ count: 21, random: () => value })).toThrow();
});
it('rejects corrupt, inconsistent and out-of-bounds saved equations', () => {
  for (const state of [null, {}, { ...linear, a: 0 }, { ...linear, a: 10 }, { ...linear, a: '2' }, { ...linear, rhs: 12 }, { ...linear, answer: 3 },
    { ...derivative, answer: 12 }, { ...derivative, c: Infinity }, { ...derivative, b: 10 }, { ...derivative, at: -1 }, { ...derivative, a: 6 }, { ...derivative, variant: 'integral' }]) {
    expect(() => validateState(state)).toThrow(/preserved/i);
  }
});
it('generates solvable bounded questions across the entire Level 2 range', () => {
  let seed = 88;
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
  const seen = new Set();
  for (let count = 21; count <= 30; count++) for (let i = 0; i < 100; i++) {
    const state = createState({ count, random }); seen.add(state.variant);
    expect(() => validateState(state)).not.toThrow();
    if (state.variant === 'linear') {
      expect(state.answer).toBe((state.rhs - state.b) / state.a);
      expect(state.answer).toBeGreaterThanOrEqual(-9); expect(state.answer).toBeLessThanOrEqual(9);
    } else {
      const f = x => state.a * x * x + state.b * x + state.c;
      expect(state.answer).toBe((f(state.at + 1) - f(state.at - 1)) / 2);
      expect(state.answer).toBeGreaterThanOrEqual(-9); expect(state.answer).toBeLessThanOrEqual(59);
    }
  }
  expect([...seen].sort()).toEqual(['derivative','linear']);
});
