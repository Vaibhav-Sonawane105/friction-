export function neighbors(cell, size) {
  const row = Math.floor(cell / size),
    col = cell % size;
  return [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].filter(([y, x]) => y >= 0 && x >= 0 && x < size && y < size).map(([y, x]) => y * size + x);
}
export function validPath(b, path, complete = false) {
  if (!Array.isArray(path) || path[0] !== b.start || new Set(path).size !== path.length) return false;
  let found = 0;
  for (const [i, c] of path.entries()) {
    if (!Number.isInteger(c) || c < 0 || c >= b.size * b.size || b.blocks.includes(c) || i && !neighbors(path[i - 1], b.size).includes(c) || c === b.exit && i !== path.length - 1) return false;
    if (b.checkpoints.includes(c)) {
      if (b.ordered && c !== b.checkpoints[found]) return false;
      found++;
    }
  }
  return !complete || path.at(-1) === b.exit && found === b.checkpoints.length;
}
export function solveRoute(b, budget = 12000) {
  const path = [b.start],
    used = new Set(path),
    walls = new Set(b.blocks);
  const dist = (a, c) => Math.abs(a % b.size - c % b.size) + Math.abs(Math.floor(a / b.size) - Math.floor(c / b.size));
  function walk(c) {
    if (--budget < 0) return false;
    if (c === b.exit) return b.checkpoints.every(k => used.has(k));
    const remaining = b.checkpoints.filter(k => !used.has(k)),
      goal = remaining[0] ?? b.exit;
    for (const n of neighbors(c, b.size).sort((a, d) => dist(a, goal) - dist(d, goal))) {
      if (used.has(n) || walls.has(n) || remaining.length && n === b.exit || b.ordered && remaining.includes(n) && n !== goal) continue;
      used.add(n);
      path.push(n);
      if (walk(n)) return true;
      path.pop();
      used.delete(n);
    }
    return false;
  }
  return walk(b.start) ? path : null;
}
