export function getLevel(count) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid successful-unlock count. Saved data was preserved.');
  return count <= 20 ? 1 : count <= 30 ? 2 : count <= 50 ? 3 : 4;
}

export function getArithmeticTier(count) {
  if (getLevel(count) !== 1) throw new Error('Arithmetic is only available at Level 1.');
  return Math.min(5, Math.floor(count / 4) + 1);
}
