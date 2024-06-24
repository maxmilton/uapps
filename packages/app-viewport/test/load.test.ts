import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { DECLARATION, compile, walk } from '../../../test/css-engine';
import { reset } from '../../../test/setup';
import { performanceSpy } from '../../../test/utils';

// Completely reset DOM and global state between tests
afterEach(reset);

const indexJsFile = new Bun.Glob('index-*.js')
  .scanSync({
    cwd: `${import.meta.dir}/../dist`,
    absolute: true,
  })
  .next().value as string;
const indexCssFile = indexJsFile.replace(/\.js$/, '.css');

const MODULE_PATH = import.meta.resolveSync(indexJsFile);

async function load() {
  // Workaround for hack in src/BookmarkBar.ts that waits for styles to be loaded
  document.head.appendChild(document.createElement('style'));

  Loader.registry.delete(MODULE_PATH);
  await import(MODULE_PATH);
  await happyDOM.waitUntilComplete();
}

test('found bundled index JS file', () => {
  expect(indexJsFile).toBeDefined();
});
test('found bundled index CSS file', () => {
  expect(indexCssFile).toBeDefined();
});

test('renders entire app', async () => {
  expect.assertions(6);
  await load();
  expect(document.body.innerHTML.length).toBeGreaterThan(500);
  expect(document.body.querySelector('main')).toBeInstanceOf(window.HTMLDivElement);
  expect(document.body.querySelector('h1')).toBeInstanceOf(window.HTMLHeadingElement);
  expect(document.body.querySelector('h1')?.textContent).toBe('Viewport Info');
  expect(document.body.querySelectorAll('dt')).toHaveLength(12);
  expect(document.body.querySelectorAll('dd')).toHaveLength(12);
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

const css = await Bun.file(indexCssFile).text();

describe('CSS', () => {
  const ast = compile(css);

  // test('does not contain any @media queries', () => {
  //   expect.assertions(1);
  //   expect(css).not.toInclude('@media');
  // });

  // test('does not contain any @font-face rules', () => {
  //   expect.assertions(1);
  //   expect(css).not.toInclude('@font-face');
  // });

  test('does not contain any @import rules', () => {
    expect.assertions(1);
    expect(css).not.toInclude('@import');
  });

  test('does not contain any comments', () => {
    expect.assertions(4);
    expect(css).not.toInclude('/*');
    expect(css).not.toInclude('*/');
    // expect(css).not.toInclude('//'); // inline comments or URL protocol
    expect(css).not.toMatch(/(?<!:)\/\//); // "//" but not "://" (URL protocol)
    expect(css).not.toInclude('<!');
  });

  // test('does not contain ":root"', () => {
  //   expect.assertions(1);
  //   expect(css).not.toInclude(':root');
  // });

  test('compiled AST is not empty', () => {
    expect.assertions(1);
    expect(ast).not.toBeEmpty();
  });

  // test('does not have any rules with a ":root" selector', () => {
  //   expect.assertions(1);
  //   const elements = lookup(ast, ':root');
  //   expect(elements).toBeUndefined();
  // });

  // CSS custom properties (variables) should only defined in themes
  test('does not have any CSS variable declarations', () => {
    expect.assertions(1);
    let found = 0;
    walk(ast, (element) => {
      if (element.type === DECLARATION && (element.props as string).startsWith('--')) {
        found += 1;
      }
    });
    expect(found).toBe(0);
  });
});
