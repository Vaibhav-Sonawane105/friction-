import { expect, it } from 'vitest';
import { getModuleDescriptor, selectModuleIds } from './registry';

it('lists only implemented choices and never substitutes arithmetic for later levels', () => {
  expect(selectModuleIds(1)).toEqual(['arithmetic']);
  for (const level of [2,3,4]) expect(selectModuleIds(level)).toEqual([]);
  expect(() => getModuleDescriptor('unknown')).toThrow();
  expect(() => getModuleDescriptor('arithmetic', 99)).toThrow();
});
it('loads the pure model independently of the view', async () => {
  const descriptor = getModuleDescriptor('arithmetic', 1);
  const model = await descriptor.loadModel();
  expect(model.createState({ count: 0, random: () => 0 })).toEqual({ expression: '1 + 1', answer: 2 });
});
