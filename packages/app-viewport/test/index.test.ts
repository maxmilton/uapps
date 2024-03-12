import { describe, expect, test } from 'bun:test';
import { readdir } from 'node:fs/promises';

// In production builds, index.css and index.js files are generated with a hash
// in the filename. So we need to find the actual filenames to test against.
const distPath = `${import.meta.dir}/../dist`;
const indexFiles = new Bun.Glob('index-*.{css,js}').scan({ cwd: distPath });
let indexCss = 'index.css';
let indexJs = 'index.js';

for await (const file of indexFiles) {
  if (file.endsWith('.css')) {
    indexCss = file;
  } else if (file.endsWith('.js')) {
    indexJs = file;
  }
}

describe('dist files', () => {
  // FIXME: The bun file type is just inferred from the file extension, not the
  // underlying file data... so that part of this test is not very useful.

  // XXX: Files with unknown type (e.g., symlinks) fall back to the default
  // "application/octet-stream". Bun.file() does not resolve symlinks so it's
  // safe to infer that all these files are therefore regular files.
  const distFiles: [filename: string, type: string, minBytes?: number, maxBytes?: number][] = [
    ['favicon.ico', 'image/x-icon'],
    ['favicon.svg', 'image/svg+xml'],
    [indexCss, 'text/css;charset=utf-8', 1000, 1600],
    [indexJs, 'text/javascript;charset=utf-8', 1000, 2000],
    ['index.html', 'text/html;charset=utf-8', 500, 700],
    ['robots.txt', 'text/plain;charset=utf-8'],
  ];

  for (const [filename, type, minBytes, maxBytes] of distFiles) {
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    describe(filename, () => {
      const file = Bun.file(`${distPath}/${filename}`);

      test('exists with correct type', () => {
        expect.assertions(3);
        expect(file.exists()).resolves.toBeTruthy();
        expect(file.size).toBeGreaterThan(0);
        expect(file.type).toBe(type); // TODO: Keep this? Type seems to be resolved from the file extension, not the file data.
      });

      if (minBytes != null && maxBytes != null) {
        test('is within expected file size limits', () => {
          expect.assertions(2);
          expect(file.size).toBeGreaterThan(minBytes);
          expect(file.size).toBeLessThan(maxBytes);
        });
      }
    });
  }

  test('contains no extra files', async () => {
    expect.assertions(1);
    const distDir = await readdir(distPath);
    expect(distDir).toHaveLength(distFiles.length);
  });
});

const html = await Bun.file(`${distPath}/index.html`).text();

describe('index.html', () => {
  test('contains the correct title', () => {
    expect.assertions(1);
    expect(html).toContain('<title>Viewport Info</title>');
  });

  test('contains the correct CSS filename', () => {
    expect.assertions(1);
    expect(html).toContain(`<link href=${indexCss} rel=stylesheet>`);
  });

  test('contains the correct JS filename', () => {
    expect.assertions(1);
    expect(html).toContain(`<script src=${indexJs} defer></script>`);
  });
});

test('index CSS file has hash in filename', () => {
  expect.assertions(1);
  expect(indexCss).toMatch(/^index-[\da-f]+\.css$/);
});

test('index JS file has hash in filename', () => {
  expect.assertions(1);
  expect(indexJs).toMatch(/^index-[\da-f]+\.js$/);
});
