import { getLevel } from '../../progression';
import { validateAnswer } from '../../../utils/mathGenerator';

const inRange = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const invalid = () => { throw new Error('Saved equation challenge is invalid. Saved data was preserved.'); };

export function createState({ count, random = Math.random, variant }) {
  if (getLevel(count) !== 2) throw new Error('Equation challenges require Level 2.');
  const integer = (min, max) => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid random source.');
    return min + Math.floor(value * (max - min + 1));
  };
  const selected = variant === undefined ? (integer(0, 1) === 0 ? 'linear' : 'derivative') : variant;
  if (selected === 'linear') {
    const a = integer(1, 9), b = integer(-12, 12), answer = integer(-9, 9);
    return { variant: selected, a, b, rhs: a * answer + b, answer };
  }
  if (selected === 'derivative') {
    const a = integer(1, 5), b = integer(-9, 9), c = integer(-9, 9), at = integer(0, 5);
    return { variant: selected, a, b, c, at, answer: 2 * a * at + b };
  }
  throw new Error('Unsupported equation variant.');
}

export function validateState(state) {
  if (!state || !Number.isSafeInteger(state.answer)) invalid();
  if (state.variant === 'linear') {
    if (!inRange(state.a, 1, 9) || !inRange(state.b, -12, 12) || !inRange(state.answer, -9, 9) ||
        !Number.isSafeInteger(state.rhs) || state.a * state.answer + state.b !== state.rhs) invalid();
  } else if (state.variant === 'derivative') {
    if (!inRange(state.a, 1, 5) || !inRange(state.b, -9, 9) || !inRange(state.c, -9, 9) || !inRange(state.at, 0, 5) ||
        2 * state.a * state.at + state.b !== state.answer) invalid();
  } else invalid();
}

function term(value, suffix = '') {
  if (value === 0) return '';
  const magnitude = Math.abs(value);
  return ` ${value < 0 ? '-' : '+'} ${magnitude === 1 && suffix ? '' : magnitude}${suffix}`;
}

export function toPublicState(state) {
  validateState(state);
  if (state.variant === 'linear') return {
    variant: state.variant,
    expression: `${state.a === 1 ? '' : state.a}x${term(state.b)} = ${state.rhs}`,
    instructions: 'Solve for x. Enter the whole-number value of x.', answerLabel: 'Value of x',
  };
  return { variant: state.variant, expression: `f(x) = ${state.a === 1 ? '' : state.a}x²${term(state.b, 'x')}${term(state.c)}`,
    instructions: `Differentiate f(x), then evaluate at x = ${state.at}. Enter only the numeric value of f′(${state.at}).`,
    answerLabel: `Value of f′(${state.at})`,
  };
}

export function reduceAction({ state, action }) {
  validateState(state);
  if (action?.type !== 'submit' || typeof action.answer !== 'string' || action.answer.length > 100) throw new Error('Invalid equation action.');
  const completed = validateAnswer(action.answer, state.answer);
  return { state, completed, feedback: completed ? '' : 'Incorrect solution. Try again.' };
}
