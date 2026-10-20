import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { getModuleDescriptor } from '../../registry';
it('requires a fresh replay on mount and carries its styles into the Shadow DOM', async () => {
  const descriptor = getModuleDescriptor('tracking'), model = await descriptor.loadModel();
  const { default: View } = await descriptor.loadView();
  let state = model.createState({ count: 31, random: () => 0 });
  state = model.reduceAction({ state, action: { type: 'start', mode: 'motion' }, now: 0 }).state;
  const html = renderToStaticMarkup(createElement(View, { state: model.toPublicState(state), disabled: false, onAction() {} }));
  expect(html).toContain('Round 1 of 3'); expect(html).toContain('Start round');
  expect(html).toContain('step-by-step'); expect(html).toContain('<style>');
  expect(html).not.toContain('Choose position');
});
