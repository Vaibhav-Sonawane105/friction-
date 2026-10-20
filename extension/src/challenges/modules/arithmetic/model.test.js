import { expect, it } from 'vitest';
import { createState, validateState, toPublicState, reduceAction } from './model';

it.each([[0, '1 + 1', 2],[4, '1 - 1', 0],[8, '2 × 2', 4],[12, '2 × 2 + 1', 5],[16, '2 ÷ 2 + 1', 2]])('generates bounded integer arithmetic at count %i', (count, expression, answer) => {
  expect(createState({ count, random: () => 0 })).toEqual({ expression, answer });
});
it('preserves the prompt on failure and validates the complete integer answer', () => {
  const state = { expression: '3 + 4', answer: 7 };
  for (const answer of ['8','7x','7.0','']) {
    expect(reduceAction({ state, action: { type: 'submit', answer } })).toMatchObject({ state, completed: false });
  }
  expect(reduceAction({ state, action: { type: 'submit', answer: ' 7 ' } }).completed).toBe(true);
  expect(toPublicState(state)).toEqual({ expression: '3 + 4' });
});
it('rejects corrupt state and unsupported actions', () => {
  for (const state of [null, {}, { expression: '', answer: 1 }, { expression: '1 + 1', answer: Infinity }, { expression: '1 + 1', answer: 9 }, { expression: '5 ÷ 2 + 1', answer: 3 }, { expression: 'garbage', answer: 1 }]) expect(() => validateState(state)).toThrow();
  expect(() => reduceAction({ state: { expression: '1 + 1', answer: 2 }, action: { type: 'complete' } })).toThrow();
});
it('keeps every generated answer within bounds across all arithmetic counts', () => {
  let seed = 123;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let count = 0; count <= 20; count++) for (let i = 0; i < 100; i++) {
    const state = createState({ count, random });
    expect(() => validateState(state)).not.toThrow();
    expect(Number.isInteger(state.answer) && Math.abs(state.answer) <= 150).toBe(true);
    // Independently evaluate the generated grammar, without eval or the model's answer helper.
    const match = state.expression.match(/^(\d+) ([+−\-×÷]) (\d+)(?: \+ (\d+))?$/);
    expect(match).not.toBeNull();
    const [, left, op, right, extra] = match;
    const a = Number(left), b = Number(right);
    const result = op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b;
    expect(state.answer).toBe(result + Number(extra || 0));
  }
});
