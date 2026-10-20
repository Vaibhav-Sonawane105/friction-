import { expect, it } from 'vitest';
import { getModuleDescriptor, selectModuleIds } from './registry';

it('lists implemented choices and never substitutes arithmetic for unimplemented levels', () => {
  expect(selectModuleIds(1)).toEqual(['arithmetic']);
  expect(selectModuleIds(2)).toEqual(['equations']);
  expect(selectModuleIds(3)).toEqual(['tracking', 'memory', 'attention']);
  expect(selectModuleIds(4)).toEqual([]);
  expect(() => getModuleDescriptor('unknown')).toThrow();
  expect(() => getModuleDescriptor('arithmetic', 99)).toThrow();
});
it('loads tracking through both registries while keeping the view out of the worker', async () => {
  const worker = await import('./workerRegistry');
  for (const registry of [{ getModuleDescriptor }, worker]) {
    const descriptor = registry.getModuleDescriptor('tracking');
    const model = await descriptor.loadModel();
    const state = model.createState({ count: 31, random: () => 0 });
    expect(model.toPublicState(state)).toMatchObject({ roundNumber: 1, size: 3, phase: 'ready', completedRounds: 0 });
    if (registry === worker) expect(descriptor.loadView).toBeUndefined();
  }
});
it('loads the same memory board through browser and static worker registries', async () => {
  const worker = await import('./workerRegistry');
  for (const registry of [{ getModuleDescriptor }, worker]) {
    const descriptor = registry.getModuleDescriptor('memory');
    const model = await descriptor.loadModel();
    expect(model.createState({ count: 31, random: () => 0.999999 }).cards).toEqual(['Circle', 'Triangle', 'Square', 'Diamond', 'Star', 'Plus', 'Circle', 'Triangle', 'Square', 'Diamond', 'Star', 'Plus']);
    if (registry === worker) expect(descriptor.loadView).toBeUndefined();
  }
});
it('loads attention through both registries without loading its view in the worker', async () => {
  const worker = await import('./workerRegistry');
  for (const registry of [{ getModuleDescriptor }, worker]) {
    const descriptor = registry.getModuleDescriptor('attention');
    const model = await descriptor.loadModel();
    const state = model.createState({ count: 31, random: () => 0.999999 });
    expect(state.stages.map(stage => stage.target.shape)).toEqual(['Circle', 'Triangle', 'Square']);
    expect(state.stages.map(stage => stage.tiles.length)).toEqual([12, 16, 20]);
    if (registry === worker) expect(descriptor.loadView).toBeUndefined();
    else expect(typeof (await descriptor.loadView()).default).toBe('function');
  }
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
