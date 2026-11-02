import { getProfile } from '../../profiles';
import { pick, shuffle, seeded, generateVerified, fingerprint } from '../../generation';
import { neighbors, solveRoute } from './solver';
export function buildRoute({
  level,
  random = Math.random,
  history = {}
}) {
  const p = getProfile(level),
    size = p.size;
  function make(r) {
    const cell = pick(size * size, r),
      walk = [cell],
      visited = new Set(walk);
    const steps = size + level + 2 + pick(size, r);
    while (walk.length < steps) {
      const ns = neighbors(walk.at(-1), size).filter(x => !visited.has(x));
      if (!ns.length) break;
      const n = ns[pick(ns.length, r)];
      walk.push(n);
      visited.add(n);
    }
    if (walk.length < p.routeCheckpoints + 4) return null;
    const checkpoints = shuffle(walk.slice(1, -1), r).slice(0, p.routeCheckpoints).sort((a, b) => walk.indexOf(a) - walk.indexOf(b));
    const blocks = shuffle(Array.from({
      length: size * size
    }, (_, i) => i).filter(i => !visited.has(i)), r).slice(0, level + 2);
    const b = {
      size,
      start: cell,
      exit: walk.at(-1),
      checkpoints,
      blocks,
      ordered: level === 4
    };
    return walk.slice(0, -1).filter(c => neighbors(c, size).filter(n => !blocks.includes(n)).length >= 3).length >= 2 ? b : null;
  }
  return generateVerified({
    make: () => make(random),
    validate: b => !!solveRoute(b),
    random,
    recent: history.fingerprints?.route || [],
    fingerprint,
    reserves: Array.from({
      length: 24
    }, (_, i) => () => make(seeded(864 + i)))
  });
}
