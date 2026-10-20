import { getArithmeticTier } from '../../progression';
import { validateAnswer } from '../../../utils/mathGenerator';

export function createState({ count, random = Math.random }) {
  const tier = getArithmeticTier(count);
  const integer = (min, max) => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid random source.');
    return min + Math.floor(value * (max - min + 1));
  };
  if (tier <= 2) {
    const a = integer(1, 12), b = integer(1, 12);
    return tier === 1 ? { expression: `${a} + ${b}`, answer: a + b } : { expression: `${a} - ${b}`, answer: a - b };
  }
  const a = integer(2, 9), b = integer(2, 9);
  if (tier === 3) return { expression: `${a} × ${b}`, answer: a * b };
  const c = integer(1, 12);
  const quotient = tier === 5 ? integer(1, 12) : 0;
  return tier === 4 ? { expression: `${a} × ${b} + ${c}`, answer: a * b + c }
    : { expression: `${quotient * b} ÷ ${b} + ${c}`, answer: quotient + c };
}

export function validateState(state) {
  if (!state || typeof state.expression !== 'string' || !state.expression.trim() || state.expression.length > 100 ||
      !Number.isSafeInteger(state.answer) || Math.abs(state.answer) > 150) {
    throw new Error('Saved arithmetic challenge is invalid. Saved data was preserved.');
  }
  const match = state.expression.match(/^(\d{1,3}) ([+\-×÷]) (\d{1,2})(?: \+ (\d{1,2}))?$/);
  if (!match) throw new Error('Saved arithmetic prompt is invalid. Saved data was preserved.');
  const [, left, operator, right, extra] = match;
  const a = Number(left), b = Number(right);
  const result = operator === '+' ? a + b : operator === '-' ? a - b : operator === '×' ? a * b : a / b;
  if (!Number.isSafeInteger(result) || result + Number(extra || 0) !== state.answer) throw new Error('Saved arithmetic answer is inconsistent. Saved data was preserved.');
}

export function toPublicState(state) {
  validateState(state);
  return { expression: state.expression };
}

export function reduceAction({ state, action }) {
  validateState(state);
  if (action?.type !== 'submit' || typeof action.answer !== 'string' || action.answer.length > 100) throw new Error('Invalid arithmetic action.');
  const completed = validateAnswer(action.answer, state.answer);
  return { state, completed, feedback: completed ? '' : 'Incorrect solution. Try again.' };
}
