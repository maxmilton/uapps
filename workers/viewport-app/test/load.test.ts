import { afterEach, expect, spyOn, test } from 'bun:test';
import { performanceSpy } from '@maxmilton/test-utils/spy';
import { reset } from '../../../test/setup';
import buildInfo from '../dist/build-info.json' with { type: 'json' };

// Completely reset DOM and global state between tests
afterEach(reset);

const MODULE_PATH = `${import.meta.dir}/../dist/${buildInfo.jsFile}`;

async function load() {
  // Workaround for hack in src/BookmarkBar.ts that waits for styles to be loaded
  document.head.append(document.createElement('style'));

  Loader.registry.delete(MODULE_PATH);
  await import(MODULE_PATH);
  await happyDOM.waitUntilComplete();
}

test('renders entire app', async () => {
  expect.assertions(14);
  await load();
  expect(document.body.innerHTML.length).toBeGreaterThan(500);
  expect(document.body.querySelector('main')).toBeInstanceOf(window.HTMLElement);
  expect(document.body.querySelectorAll('h1')).toHaveLength(1);
  expect(document.body.querySelector('h1')).toBeInstanceOf(window.HTMLHeadingElement);
  expect(document.body.querySelector('h1')?.textContent).toBe('Viewport Info');
  expect(document.body.querySelectorAll('dt')).toHaveLength(12);
  expect(document.body.querySelectorAll('dd')).toHaveLength(12);
  expect(document.body.querySelectorAll('footer')).toHaveLength(1);
  expect(document.body.querySelector('footer')).toBeInstanceOf(window.HTMLElement);
  const firstNode = document.body.firstChild as HTMLElement;
  expect(firstNode.nodeName).toBe('MAIN');
  const footerLinks = document.body.querySelectorAll<HTMLAnchorElement>('footer a');
  expect(footerLinks).toHaveLength(2);
  expect(footerLinks[0].href).toBe('https://maxmilton.com/');
  expect(footerLinks[0].textContent).toBe('Max Milton');
  expect(footerLinks[1].href).toBe('https://github.com/maxmilton/uapps/issues');
});

test('does not call any console methods', async () => {
  expect.assertions(1);
  await load();
  expect(happyDOM.virtualConsolePrinter.read()).toBeArrayOfSize(0);
});

test('does not call any performance methods', async () => {
  expect.hasAssertions(); // variable number of assertions
  const check = performanceSpy();
  await load();
  check();
});

test('does not call fetch()', async () => {
  expect.assertions(1);
  const spy = spyOn(global, 'fetch');
  await load();
  expect(spy).not.toHaveBeenCalled();
});
