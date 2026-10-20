import { expect, it } from 'vitest';
import { getModuleDescriptor } from '../../registry';
it('animates swaps by position with separate crossing lanes and finishes after the advertised duration', async () => {
  const { buildTimeline } = await import('./playback');
  const frames = buildTimeline({ size: 3, target: 0, swaps: [[0,1],[1,2]], highlightMs: 1400, stepMs: 900, pauseMs: 150 });
  expect(frames[0]).toMatchObject({ at: 0, highlight: true, positions: [0,1,2] });
  expect(frames[1]).toMatchObject({ at: 1400, highlight: false, positions: [0,1,2], lifts: [-22,22,0] });
  expect(frames[2]).toMatchObject({ at: 1700, positions: [1,0,2] });
  expect(frames[3].lifts).toEqual([0,0,0]);
  expect(frames.at(-1)).toMatchObject({ at: 3500, positions: [2,0,1], finished: true });
});
it('keeps the final visual target position aligned with the worker answer in every generated round', async () => {
  const { buildTimeline } = await import('./playback');
  const model = await getModuleDescriptor('tracking').loadModel();
  let state = model.createState({ count: 31, random: () => 0.7 });
  for (let i = 0; i < 3; i++) {
    state = model.reduceAction({ state, action: { type: 'start', mode: 'motion' }, now: 0 }).state;
    const shown = model.toPublicState(state), frames = buildTimeline(shown.plan);
    const finalPosition = frames.at(-1).positions[shown.plan.target];
    expect(frames.at(-1).at).toBe(shown.durationMs);
    state = model.reduceAction({ state, action: { type: 'finish' }, now: shown.durationMs }).state;
    const result = model.reduceAction({ state, action: { type: 'choose', index: finalPosition } });
    expect(result.state.round).toBe(i + 1); state = result.state;
  }
});
