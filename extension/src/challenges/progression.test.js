import { describe, expect, it } from 'vitest';
import { getLevel, getArithmeticTier } from './progression';

describe('count-based progression', () => {
  it.each([[0,1],[20,1],[21,2],[30,2],[31,3],[50,3],[51,4],[70,4],[71,4]])('count %i selects level %i', (count, level) => {
    expect(getLevel(count)).toBe(level);
  });
  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '21', null])('rejects invalid count %s', count => {
    expect(() => getLevel(count)).toThrow();
  });
  it.each([[0,1],[3,1],[4,2],[7,2],[8,3],[11,3],[12,4],[15,4],[16,5],[20,5]])('arithmetic count %i uses complexity %i', (count, tier) => {
    expect(getArithmeticTier(count)).toBe(tier);
  });
});
