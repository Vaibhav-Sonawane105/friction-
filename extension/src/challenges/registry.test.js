import { expect, it } from 'vitest';
import { getModuleDescriptor, selectModuleIds } from './registry';

it('lists implemented choices and never substitutes arithmetic for unimplemented levels', () => {
  expect(selectModuleIds(1)).toEqual(['arithmetic']);
  expect(selectModuleIds(2)).toEqual(['equations']);
  for (const level of [3,4]) expect(selectModuleIds(level)).toEqual([]);
  expect(() => getModuleDescriptor('unknown')).toThrow();
  expect(() => getModuleDescriptor('arithmetic', 99)).toThrow();
});
it('loads the same Level 2 model through browser and MV3 worker registries', async () => {
  const worker = await import('./workerRegistry');
  const browserDescriptor = getModuleDescriptor('equations', 1), workerDescriptor = worker.getModuleDescriptor('equations', 1);
  expect(browserDescriptor.variants).toEqual(['linear','derivative']);
  expect(workerDescriptor.loadView).toBeUndefined();
  for (const descriptor of [browserDescriptor, workerDescriptor]) {
    const model = await descriptor.loadModel();
    expect(model.createState({ count: 21, variant: 'derivative', random: () => 0 })).toEqual({ variant: 'derivative', a: 1, b: -9, c: -9, at: 0, answer: -9 });
  }
  expect(typeof (await browserDescriptor.loadView()).default).toBe('function');
});
it('loads the pure model independently of the view', async () => {
  const descriptor = getModuleDescriptor('arithmetic', 1);
  const model = await descriptor.loadModel();
  expect(model.createState({ count: 0, random: () => 0 })).toEqual({ expression: '1 + 1', answer: 2 });
});
