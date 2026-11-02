import { it } from 'vitest';
import { getModuleDescriptor } from './redesignWorker';
import { seeded } from './generation';
import { matches } from './modules/ordering/clues';
import { getProfile } from './profiles';

// Independent test oracles: do not call the generator's parser or route solver.
function evaluate(ts) {
  if (ts.length === 1) return ts[0];
  for (const ops of [['+', '−'], ['×', '÷']]) {
    let depth = 0;
    for (let i = ts.length - 1; i >= 0; i--) {
      const op = ts[i];
      if (op === ')') depth++;
      if (op === '(') depth--;
      if (depth === 0 && ops.includes(op)) {
        const a = evaluate(ts.slice(0, i)),
          b = evaluate(ts.slice(i + 1));
        const x = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
        return Number.isInteger(x) && Math.abs(x) <= 1000 ? x : NaN;
      }
    }
  }
  return ts[0] === '(' && ts.at(-1) === ')' ? evaluate(ts.slice(1, -1)) : NaN;
}
function reachable(b) {
  const used = new Set([b.start]);
  let steps = 0;
  function visit(c) {
    if (++steps > 1000000) return false;
    if (c === b.exit) return b.checkpoints.every(n => used.has(n));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = c % b.size + dx,
        y = Math.floor(c / b.size) + dy,
        n = y * b.size + x;
      if (x < 0 || x >= b.size || y < 0 || y >= b.size || used.has(n) || b.blocks.includes(n)) continue;
      if (b.ordered && b.checkpoints.includes(n) && b.checkpoints.find(v => !used.has(v)) !== n) continue;
      used.add(n);
      if (visit(n)) return true;
      used.delete(n);
    }
    return false;
  }
  return visit(b.start);
}
function countOrders(labels, clues) {
  let count = 0;
  function visit(row, unused) {
    if (clues.some(c => [c.a, c.b, c.c].filter(x => x !== undefined).every(x => row.includes(x)) && c.kind !== 'end' && !matches(row, c))) return;
    if (!unused.length) {
      if (clues.every(c => matches(row, c))) count++;
      return;
    }
    for (const x of unused) visit([...row, x], unused.filter(y => y !== x));
  }
  visit([], labels);
  return count;
}
for (const id of ['maths', 'memory', 'route', 'ordering']) for (const [i, count] of [0, 21, 31, 51].entries()) it(id + ' level ' + (i + 1) + ' independently checks 1000 seeds', async () => {
  const m = await getModuleDescriptor(id).loadModel(),
    p = getProfile(i + 1);
  for (let seed = 1; seed <= 1000; seed++) {
    try {
      const s = m.createState({
        count,
        random: seeded(seed * 9973)
      });
      m.validateState(s);
      const pub = m.toPublicState(s);
      if (id === 'memory') {
        if (s.cards.length !== 2 * p.memoryPairs || s.cards.some(c => s.cards.filter(v => v === c).length !== 2) || pub.cards.some(c => c.value !== null)) throw Error('pairs');
      }
      if (id === 'route') {
        if (!reachable(s.board) || s.board.size !== p.size || s.board.checkpoints.length !== p.routeCheckpoints) throw Error('route');
      }
      if (id === 'ordering' && (countOrders(s.row, s.board.clues) !== 1 || s.row.length !== p.objects || s.board.clues.length < p.clues || s.board.clues.length > p.clues + (i === 3 ? 2 : 1))) throw Error('ordering');
      if (id === 'maths') {
        if (s.questions.length !== p.questions || new Set(s.questions.map(q => q.family)).size !== p.questions || 'answer' in pub) throw Error('maths');
        for (const q of s.questions) {
          if (q.tokens?.some(t => typeof t === 'number' && Math.abs(t) > p.operandMax)) throw Error('operand budget');
          if (q.family === 'missing') {
            const possible = [];
            for (let n = -30; n <= 60; n++) if (evaluate(q.tokens.map(t => t === '□' ? n : t)) === q.target) possible.push(n);
            if (possible.length !== 1 || possible[0] !== q.answer) throw Error('missing');
          }
          if (q.family === 'arithmetic' && evaluate(q.tokens) !== q.answer) throw Error('arithmetic');
          if (q.family === 'constraints') {
            const [x, y] = q.prompt.match(/-?\d+/g).map(Number);
            const expected = q.prompt.includes('larger') ? (x + y) / 2 : q.prompt.includes('smaller') ? (y - x) / 2 : y / 2 - x;
            if (q.answer !== expected) throw Error('constraint');
          }
          if (q.family === 'operators') {
            const solutions = [];
            for (const a of '+−×÷') for (const b of '+−×÷') {
              const pair = a + b;
              let n = 0;
              if (evaluate(q.tokens.map(t => t === '□' ? pair[n++] : t)) === q.target) solutions.push(pair);
            }
            if (solutions.sort().join() !== [...q.answers].sort().join()) throw Error('operators');
          }
        }
      }
    } catch (err) {
      throw Error(id + ' level ' + (i + 1) + ' seed ' + seed + ': ' + err.message, {
        cause: err
      });
    }
  }
}, 60000);
