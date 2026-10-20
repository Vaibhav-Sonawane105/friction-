import { expect, it } from 'vitest';
import { getModuleDescriptor } from '../../registry';
const model = async () => getModuleDescriptor('tracking').loadModel();
const fixture = () => ({ round: 0, phase: 'ready', run: 0, mode: null, startedAt: null, rounds: [
  { size: 3, target: 0, swaps: [[0,1],[1,2],[0,1],[0,2]] }, // target finishes at 0
  { size: 4, target: 1, swaps: [[0,1],[0,2],[1,2],[0,3],[1,3]] }, // target finishes at 3
  { size: 5, target: 4, swaps: [[0,4],[0,2],[1,2],[1,3],[0,3],[0,4]] }, // target finishes at 4
] });
it('generates three valid rounds with increasing object counts and shuffle speed', async () => {
  const { createState, validateState, toPublicState } = await model();
  for (const count of [31,50]) for (const value of [0,0.5,0.999999]) {
    const state = createState({ count, random: () => value });
    expect(state.rounds.map(r => r.size)).toEqual([3,4,5]);
    expect(state.rounds.map(r => r.swaps.length)).toEqual([4,5,6]);
    expect(() => validateState(state)).not.toThrow();
    expect(toPublicState(state).plan).toBeUndefined();
    expect(toPublicState(state).answer).toBeUndefined();
  }
});
it('requires start and completed watching before accepting a position', async () => {
  const { reduceAction, toPublicState } = await model();
  const state = fixture(), before = structuredClone(state);
  expect(() => reduceAction({ state, action: { type: 'choose', index: 0 }, now: 100 })).toThrow();
  const started = reduceAction({ state, action: { type: 'start', mode: 'motion' }, now: 100 }).state;
  expect(state).toEqual(before); expect(started.run).toBe(1);
  const shown = toPublicState(started);
  expect(shown.plan.target).toBe(0);
  expect(() => reduceAction({ state: started, action: { type: 'finish' }, now: 101 })).toThrow(/watch/i);
  const ready = reduceAction({ state: started, action: { type: 'finish' }, now: 100 + shown.durationMs }).state;
  expect(ready.phase).toBe('choose'); expect(toPublicState(ready).plan).toBeUndefined();
});
it('replays incorrect choices and only completes after all three correct rounds', async () => {
  const { reduceAction, toPublicState } = await model();
  let state = fixture();
  for (const [round, answer] of [0,3,4].entries()) {
    state = reduceAction({ state, action: { type: 'start', mode: 'steps' }, now: 100 }).state;
    state = reduceAction({ state, action: { type: 'finish' }, now: 100 }).state;
    const wrong = reduceAction({ state, action: { type: 'choose', index: (answer + 1) % state.rounds[round].size } });
    expect(wrong.state.round).toBe(round); expect(wrong.state.phase).toBe('ready'); expect(wrong.completed).toBe(false);
    state = reduceAction({ state: wrong.state, action: { type: 'start', mode: 'steps' }, now: 100 }).state;
    state = reduceAction({ state, action: { type: 'finish' }, now: 100 }).state;
    const result = reduceAction({ state, action: { type: 'choose', index: answer } });
    expect(result.completed).toBe(round === 2); expect(result.state.round).toBe(round + 1);
    state = result.state;
  }
  expect(toPublicState(state).completedRounds).toBe(3);
});
it('restarts an interrupted run without rerolling the plan or losing completed rounds', async () => {
  const { reduceAction, toPublicState } = await model();
  const state = { ...fixture(), round: 1 };
  const one = reduceAction({ state, action: { type: 'start', mode: 'motion' }, now: 100 }).state;
  const two = reduceAction({ state: one, action: { type: 'start', mode: 'motion' }, now: 800 }).state;
  expect(two.run).toBe(2); expect(two.round).toBe(1); expect(two.rounds).toEqual(state.rounds);
  expect(two.startedAt).toBe(800);
  const shown = toPublicState(two); shown.plan.swaps[0][0] = 3;
  expect(two.rounds[1].swaps[0]).toEqual([0,1]);
});
it('rejects malformed saved state, positions, modes and client completion', async () => {
  const { validateState, reduceAction } = await model();
  for (const mutate of [s => { s.round = 4; }, s => { s.phase = 'done'; }, s => { s.run = -1; },
    s => { s.rounds[0].size = 4; }, s => { s.rounds[0].target = 3; }, s => { s.rounds[0].swaps[0] = [0,0]; },
    s => { s.rounds[0].swaps[0] = [0,3]; }, s => { s.rounds[0].swaps = []; }]) {
    const state = fixture(); mutate(state); expect(() => validateState(state)).toThrow(/preserved/i);
  }
  for (const action of [{ type: 'complete' }, { type: 'start', mode: 'skip' }, { type: 'choose', index: '0' }]) {
    expect(() => reduceAction({ state: fixture(), action, now: 0 })).toThrow();
  }
});
it('rejects invalid counts and random sources', async () => {
  const { createState } = await model();
  for (const count of [0,30,51,-1,'31']) expect(() => createState({ count })).toThrow();
  for (const value of [-1,1,NaN,Infinity]) expect(() => createState({ count: 31, random: () => value })).toThrow();
});
