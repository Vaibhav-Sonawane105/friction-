import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { getModuleDescriptor } from '../../registry';

it('renders twelve keyboard buttons with position labels and no hidden symbol leakage', async () => {
  const descriptor = getModuleDescriptor('memory');
  const model = await descriptor.loadModel(), { default: View } = await descriptor.loadView();
  const html = renderToStaticMarkup(createElement(View, { state: model.toPublicState(model.createState({ count: 31, random: () => 0 })), disabled: false, onAction() {} }));
  expect(html.match(/<button/g)).toHaveLength(12);
  expect(html).toContain('Card 1, face down'); expect(html).toContain('Card 12, face down');
  for (const shape of ['Circle', 'Triangle', 'Square', 'Diamond', 'Star', 'Plus']) expect(html).not.toContain(shape);
  expect(html).toContain('0 of 6 pairs matched');
  expect(html).not.toContain('<svg');
});
it('names exposed shapes, marks matches, and disables all cards while saving', async () => {
  const descriptor = getModuleDescriptor('memory');
  const model = await descriptor.loadModel(), { default: View } = await descriptor.loadView();
  const state = { cards: ['Circle', 'Triangle', 'Square', 'Diamond', 'Circle', 'Triangle', 'Square', 'Diamond'], matched: [0, 4], revealed: [1] };
  const html = renderToStaticMarkup(createElement(View, { state: model.toPublicState(state), disabled: true, onAction() {} }));
  expect(html).toContain('Card 1, Circle, matched'); expect(html).toContain('Card 2, Triangle, face up');
  expect(html).not.toContain('Square'); expect(html).not.toContain('Diamond');
  expect(html.match(/disabled=""/g)).toHaveLength(8);
  expect(html).toContain('1 of 4 pairs matched');
  expect(html.match(/<svg/g)).toHaveLength(3);
});
