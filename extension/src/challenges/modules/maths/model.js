import { getLevel } from '../../progression';
import { buildMathSet, families, evaluate, operatorAnswers } from './templates';
import { getProfile } from '../../profiles';
export function createState({
  count,
  ...options
}) {
  return {
    index: 0,
    questions: buildMathSet({
      level: getLevel(count),
      ...options
    })
  };
}
export function validateState(s, level) {
  const invalid = () => {
    throw Error('Invalid saved maths set. Saved data was preserved.');
  };
  if (!s || !Array.isArray(s.questions) || s.questions.length < 2 || s.questions.length > 4 || level !== undefined && s.questions.length !== getProfile(level).questions || !Number.isInteger(s.index) || s.index < 0 || s.index > s.questions.length) invalid();
  const seen = new Set();
  for (const q of s.questions) {
    if (!q || !families.includes(q.family) || seen.has(q.family) || typeof q.prompt !== 'string' || q.prompt.length > 200 || ![0, 1, 2].some(k => q.id === q.family + ':' + k)) invalid();
    seen.add(q.family);
    if (q.family === 'constraints') {
      const patterns = [/^Two numbers total (\d+) and differ by (\d+)\. Find the larger\.$/, /^Two numbers differ by (\d+) and total (\d+)\. Find the smaller\.$/, /^I add (\d+) to a number and double the result to get (\d+)\. What was the original number\?$/];
      const kind = Number(q.id.at(-1)),
        m = patterns[kind].exec(q.prompt);
      if (!m) invalid();
      const a = Number(m[1]),
        b = Number(m[2]);
      if (!Number.isInteger(q.answer) || q.answer !== [(a + b) / 2, (b - a) / 2, b / 2 - a][kind]) invalid();
      continue;
    }
    if (!Array.isArray(q.tokens) || q.tokens.length > 16 || q.tokens.length < 3 || q.tokens.some(t => !(Number.isInteger(t) && t >= 1 && t <= 60) && !['(', ')', '+', '−', '×', '÷', '□'].includes(t))) invalid();
    const expression = q.tokens.join(' '),
      slots = q.tokens.filter(t => t === '□').length;
    if (q.family === 'operators') {
      if (slots !== 2 || !Number.isSafeInteger(q.target) || q.prompt !== expression + ' = ' + q.target) invalid();
      const valid = operatorAnswers(q.tokens, q.target);
      if (!valid.length || !Array.isArray(q.answers) || JSON.stringify(q.answers) !== JSON.stringify(valid)) invalid();
    } else if (q.family === 'missing') {
      if (slots !== 1 || !Number.isInteger(q.answer) || q.answer < -30 || q.answer > 60 || q.prompt !== expression + ' = ' + q.target + '. Find □.' || evaluate(q.tokens.map(t => t === '□' ? q.answer : t)) !== q.target) invalid();
    } else if (slots || expression !== q.prompt || evaluate(q.tokens) !== q.answer || !Number.isSafeInteger(q.answer)) invalid();
  }
}
export function toPublicState(s) {
  validateState(s);
  const q = s.questions[Math.min(s.index, s.questions.length - 1)];
  return {
    prompt: q.prompt,
    family: q.family,
    slots: q.tokens?.filter(t => t === '□').length || 0,
    solved: s.index,
    total: s.questions.length
  };
}
export function reduceAction({
  state,
  action
}) {
  validateState(state);
  const q = state.questions[state.index];
  if (!q || action?.type !== 'submit' || typeof action.answer !== 'string' || action.answer.length > 100) throw Error('Invalid maths submission.');
  const v = action.answer.trim(),
    correct = q.family === 'operators' ? q.answers.includes(v) : /^[+-]?\d+$/.test(v) && Number(v) === q.answer;
  if (!correct) return {
    state,
    completed: false,
    feedback: 'Try the same question again.'
  };
  const next = {
    ...state,
    index: state.index + 1
  };
  return {
    state: next,
    completed: next.index === state.questions.length,
    feedback: 'Correct.'
  };
}
