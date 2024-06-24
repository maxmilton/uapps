import { afterEach, expect, test } from 'bun:test';
import { cleanup, render } from '../../../test/utils';
import { App } from '../src/App';

afterEach(cleanup);

test('rendered DOM contains expected elements', () => {
  expect.assertions(7);
  const rendered = render(App());
  const main = rendered.container.querySelector('main');
  expect(main).toBeInstanceOf(window.HTMLDivElement);
  expect(rendered.container.firstChild).toBe(main);
  const h1 = rendered.container.querySelector('h1');
  expect(h1).toBeInstanceOf(window.HTMLHeadingElement);
  expect(main?.firstChild).toBe(h1);
  expect(h1?.textContent).toBe('Viewport Info');
  const dts = rendered.container.querySelectorAll('dt');
  const dds = rendered.container.querySelectorAll('dd');
  expect(dts).toHaveLength(12);
  expect(dds).toHaveLength(12);
});

test('rendered DOM matches snapshot', () => {
  expect.assertions(1);
  const rendered = render(App());
  expect(rendered.container.innerHTML).toMatchSnapshot();
});

test.todo('rendered DOM updates when viewport changes');
test.todo('rendered DOM updates when device orientation changes');
