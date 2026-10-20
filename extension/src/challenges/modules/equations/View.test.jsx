import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import EquationView from './View';

it('labels a derivative numeric answer and displays the evaluation point without appending an equation placeholder', () => {
  const html = renderToStaticMarkup(createElement(EquationView, { state: {
    variant: 'derivative', expression: 'f(x) = 2x² + 3x + 1', instructions: 'Find f′(2).', answerLabel: 'Value of f′(2)',
  }, disabled: true, onAction() {} }));
  expect(html).toContain('f(x) = 2x² + 3x + 1'); expect(html).toContain('Find f′(2).');
  expect(html).toContain('Value of f′(2)'); expect(html).toContain('disabled=""');
  expect(html).not.toContain('= ?');
});
