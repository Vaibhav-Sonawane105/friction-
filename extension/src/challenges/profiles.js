const rows = [[3, 2, 4, 2, 4, 3, 20, 2], [4, 2, 5, 3, 5, 4, 30, 2], [6, 3, 6, 4, 6, 5, 50, 3], [8, 4, 6, 5, 7, 6, 60, 4]];
export function getProfile(level) {
  const row = rows[level - 1];
  if (!Number.isInteger(level) || !row) throw Error('Invalid challenge level.');
  const [memoryPairs, questions, size, routeCheckpoints, objects, clues, operandMax, operations] = row;
  return {
    level,
    memoryPairs,
    questions,
    size,
    routeCheckpoints,
    objects,
    clues,
    operandMax,
    operations
  };
}
