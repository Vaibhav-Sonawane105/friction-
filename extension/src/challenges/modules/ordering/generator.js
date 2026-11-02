import { getProfile } from '../../profiles';
import { shuffle, seeded, generateVerified, fingerprint } from '../../generation';
import { matches } from './clues';
const labels = ['Key', 'Boat', 'Leaf', 'Moon', 'Bell', 'Cup', 'Kite', 'Book', 'Pear', 'Drum', 'Star', 'Fox'];
const cache = new Map();
function permutations(n) {
  if (!cache.has(n)) {
    const rows = [];
    function visit(row) {
      if (row.length === n) {
        rows.push(row);
        return;
      }
      for (let i = 0; i < n; i++) if (!row.includes(i)) visit([...row, i]);
    }
    visit([]);
    cache.set(n, rows);
  }
  return cache.get(n);
}
export function buildOrdering({
  level,
  random = Math.random,
  history = {}
}) {
  const {
    objects: n,
    clues: min
  } = getProfile(level);
  function make(r) {
    const names = shuffle(labels, r).slice(0, n),
      idx = Array.from({
        length: n
      }, (_, i) => i);
    const candidates = [{
      kind: 'end',
      a: 0
    }, {
      kind: 'end',
      a: n - 1
    }];
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      candidates.push({
        kind: 'before',
        a,
        b
      });
      if (b === a + 1) candidates.push({
        kind: 'next',
        a,
        b
      });
      if (level >= 2 && b > a + 1) candidates.push({
        kind: 'apart',
        a,
        b
      });
      if (level >= 3 && b > a + 1) {
        candidates.push({
          kind: 'gap',
          a,
          b,
          n: b - a - 1
        }, {
          kind: 'between',
          a: a + 1,
          b: a,
          c: b
        });
      }
    }
    const pool = shuffle(candidates, r),
      clues = [];
    let rows = permutations(n);
    const cap = min + 1 + (level === 4 ? 1 : 0);
    while (rows.length > 1 && clues.length < cap) {
      let best = -1,
        left = rows;
      for (let i = 0; i < Math.min(8, pool.length); i++) {
        const filtered = rows.filter(row => matches(row, pool[i]));
        if (filtered.length < left.length) {
          best = i;
          left = filtered;
        }
      }
      if (best < 0) {
        if (pool.length > 8) {
          pool.splice(0, 8);
          continue;
        }
        return null;
      }
      clues.push(pool.splice(best, 1)[0]);
      rows = left;
    }
    if (rows.length !== 1) return null;
    while (clues.length < min && pool.length) clues.push(pool.shift());
    if (clues.length < min || clues.every(c => c.kind === 'next')) return null;
    const order = shuffle(idx, r);
    if (order.every((x, i) => x === i)) [order[0], order[1]] = [order[1], order[0]];
    const objects = order.map(i => names[i]);
    return {
      objects,
      clues: clues.map(q => ({
        ...q,
        a: names[q.a],
        ...(q.b !== undefined ? {
          b: names[q.b]
        } : {}),
        ...(q.c !== undefined ? {
          c: names[q.c]
        } : {})
      }))
    };
  }
  const board = generateVerified({
    make: () => make(random),
    random,
    validate: b => b.objects.length === n,
    recent: history.fingerprints?.ordering || [],
    fingerprint,
    reserves: Array.from({
      length: 24
    }, (_, i) => () => make(seeded(72 + i)))
  });
  return board;
}
