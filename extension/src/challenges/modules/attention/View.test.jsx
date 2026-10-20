import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { getModuleDescriptor } from '../../registry';

it('labels each selectable shape and the target while disabling already found targets', async () => {
  const descriptor = getModuleDescriptor('attention');
  const model = await descriptor.loadModel(), { default: View } = await descriptor.loadView();
  let state = model.createState({ count: 31, random: () => 0.999999 });
  state = model.reduceAction({ state, action: { type: 'select', index: 0 } }).state;
  const html = renderToStaticMarkup(createElement(View, { state: model.toPublicState(state), disabled: false, onAction() {} }));
  expect(html).toContain('Stage 1 of 3'); expect(html).toContain('1 of 3 found');
  expect(html).toContain('Tile 1, pink filled Circle, selected'); expect(html).toContain('aria-pressed="true"');
  expect(html.match(/<button/g)).toHaveLength(12); expect(html.match(/disabled=""/g)).toHaveLength(1);
  expect(html.match(/<svg/g)).toHaveLength(13);
  // The overlay lives in a Shadow DOM, so the view must carry its own animation stylesheet.
  expect(html).toContain('<style>');
});
it('renders colour and outline attributes rather than using a fixed colour for each shape', async () => {
  const descriptor = getModuleDescriptor('attention');
  const model = await descriptor.loadModel(), { default: View } = await descriptor.loadView();
  const state = { ...model.createState({ count: 31, random: () => 0.999999 }), stage: 2 };
  const html = renderToStaticMarkup(createElement(View, { state: model.toPublicState(state), disabled: false, onAction() {} }));
  expect(html).toContain('pink outline Square'); expect(html).toContain('fill="none"');
  expect(html).toContain('filled or outlined');
  expect(html.match(/<svg/g)).toHaveLength(21);
});
it('disables the whole grid during saves and shows only the active stage', async () => {
  const descriptor = getModuleDescriptor('attention');
  const model = await descriptor.loadModel(), { default: View } = await descriptor.loadView();
  const state = { ...model.createState({ count: 31, random: () => 0.999999 }), stage: 1 };
  const html = renderToStaticMarkup(createElement(View, { state: model.toPublicState(state), disabled: true, onAction() {} }));
  expect(html).toContain('Stage 2 of 3'); expect(html).toContain('0 of 4 found');
  expect(html.match(/<button/g)).toHaveLength(16); expect(html.match(/disabled=""/g)).toHaveLength(16);
});
