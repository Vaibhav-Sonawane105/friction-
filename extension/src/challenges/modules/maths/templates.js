import { pick, shuffle, seeded, generateVerified, fingerprint } from '../../generation';
import { getProfile } from '../../profiles';
export const families = ['arithmetic', 'missing', 'constraints', 'operators'];
const ops = ['+', '−', '×', '÷'];
// A small arithmetic parser; inputs are generated tokens, never executable expressions.
export function evaluate(tokens) {
  let at = 0;
  function atom() {
    const t = tokens[at++];
    if (t === '(') {
      const n = sum();
      if (tokens[at++] !== ')') return NaN;
      return n;
    }
    return Number.isInteger(t) ? t : NaN;
  }
  function checked(x) {
    return Number.isInteger(x) && Math.abs(x) <= 1000 ? x : NaN;
  }
  function product() {
    let n = atom();
    while (['×', '÷'].includes(tokens[at])) {
      const op = tokens[at++],
        b = atom();
      n = checked(op === '×' ? n * b : n / b);
    }
    return n;
  }
  function sum() {
    let n = product();
    while (['+', '−'].includes(tokens[at])) {
      const op = tokens[at++],
        b = product();
      n = checked(op === '+' ? n + b : n - b);
    }
    return n;
  }
  const result = sum();
  return at === tokens.length ? result : NaN;
}
export function operatorAnswers(tokens, target) {
  const result = [];
  function visit(i, expr, chosen) {
    if (i === tokens.length) {
      if (evaluate(expr) === target) result.push(chosen.join(''));
      return;
    }
    const t = tokens[i];
    for (const op of t === '□' ? ops : [t]) visit(i + 1, [...expr, op], t === '□' ? [...chosen, op] : chosen);
  }
  visit(0, [], []);
  return result;
}
function question(family, kind, p, r) {
  const small = () => 2 + pick(Math.min(4 + p.level * 2, p.operandMax - 1), r);
  const a = small(),
    b = small(),
    c = small(),
    d = small();
  const id = family + ':' + kind;
  if (family === 'constraints') {
    const low = 1 + pick(Math.floor(p.operandMax / 4), r),
      diff = 1 + pick(Math.floor(p.operandMax / 4), r),
      high = low + diff,
      sum = high + low;
    const clues = [['Two numbers total ' + sum + ' and differ by ' + diff + '. Find the larger.', high], ['Two numbers differ by ' + diff + ' and total ' + sum + '. Find the smaller.', low], ['I add ' + diff + ' to a number and double the result to get ' + 2 * high + '. What was the original number?', low]];
    const [prompt, answer] = clues[kind];
    return {
      id,
      family,
      prompt,
      answer
    };
  }
  if (family === 'missing') {
    const expressions = [[a, '+', '□', '×', b], ['(', '□', '−', a, ')', '×', b], [a, '×', b, '−', '□']];
    const tokens = expressions[kind];
    if (p.level >= 3) tokens.push('+', d);
    const answer = kind === 1 ? a + c : c,
      target = evaluate(tokens.map(t => t === '□' ? answer : t));
    return {
      id,
      family,
      prompt: tokens.join(' ') + ' = ' + target + '. Find □.',
      answer,
      tokens,
      target
    };
  }
  if (family === 'operators') {
    const forms = [[a, '□', b, '□', c], ['(', a, '□', b, ')', '□', c], [a, '□', '(', b, '□', c, ')']];
    const tokens = forms[kind];
    if (p.level >= 3) tokens.push('+', d);
    const target = evaluate(tokens.map(t => t === '□' ? ops[pick(3, r)] : t));
    return {
      id,
      family,
      tokens,
      target,
      prompt: tokens.join(' ') + ' = ' + target,
      answers: operatorAnswers(tokens, target)
    };
  }
  const dividend = b * (1 + pick(Math.floor(p.operandMax / b), r));
  const forms = [[a, '+', b, '×', c], ['(', a, '+', b, ')', '×', c], [dividend, '÷', b, '+', c]];
  const tokens = forms[kind];
  if (p.level >= 3) tokens.push('−', d);
  if (p.level === 4) tokens.push('+', small());
  return {
    id,
    family,
    tokens,
    prompt: tokens.join(' '),
    answer: evaluate(tokens)
  };
}
export function buildMathSet({
  level,
  random = Math.random,
  history = {},
  variant
}) {
  const p = getProfile(level);
  function make(r) {
    let pool = shuffle(families, r);
    if (variant) {
      if (!families.includes(variant)) throw Error('Unknown maths family');
      pool = [variant, ...pool.filter(f => f !== variant)];
    }
    return pool.slice(0, p.questions).map(f => {
      const recent = history.templates || [],
        ids = shuffle([0, 1, 2], r);
      ids.sort((a, b) => recent.lastIndexOf(f + ':' + a) - recent.lastIndexOf(f + ':' + b));
      return question(f, ids[0], p, r);
    });
  }
  return generateVerified({
    make: () => make(random),
    random,
    validate: qs => qs.every(q => q.family === 'operators' ? q.answers.length > 0 : Number.isSafeInteger(q.answer) && (level !== 1 || q.answer >= 0)),
    recent: history.fingerprints?.maths || [],
    fingerprint,
    reserves: Array.from({
      length: 16
    }, (_, i) => () => make(seeded(i + 42)))
  });
}
