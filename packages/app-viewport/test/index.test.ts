import { describe, expect, test } from 'bun:test';
import { readdir } from 'node:fs/promises';
import { validate } from '@maxmilton/test-utils/html';
import { distPath, indexCSS, indexJS } from './files';

test('index CSS file found', () => {
  expect.assertions(1);
  expect(indexCSS).toBeDefined();
});

test('index JS file found', () => {
  expect.assertions(1);
  expect(indexJS).toBeDefined();
});

describe('dist files', () => {
  // FIXME: The bun file type is just inferred from the file extension, not the
  // underlying file data... so that part of this test is not very useful.

  // XXX: Files with unknown type (e.g., symlinks) fall back to the default
  // "application/octet-stream". Bun.file() does not resolve symlinks so it's
  // safe to infer that all these files are therefore regular files.
  const distFiles: [filename: string, type: string, minBytes?: number, maxBytes?: number][] = [
    ['favicon.ico', 'image/x-icon'],
    ['favicon.svg', 'image/svg+xml'],
    [indexCSS, 'text/css;charset=utf-8', 1000, 1600],
    // FIXME: Uncomment once bun supports CSS source maps.
    // [`${indexCSS}.map`, 'application/json;charset=utf-8', 100, 10_000],
    [indexJS, 'text/javascript;charset=utf-8', 1000, 2000],
    [`${indexJS}.map`, 'application/json;charset=utf-8'],
    ['index.html', 'text/html;charset=utf-8', 500, 700],
    ['robots.txt', 'text/plain;charset=utf-8'],
  ];

  for (const [filename, type, minBytes, maxBytes] of distFiles) {
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
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const distDir = await readdir(distPath);
    expect(distDir).toHaveLength(distFiles.length);
  });

  test.each(distFiles.filter(([filename]) => filename.endsWith('.html')))(
    '%s contains valid HTML',
    async (filename) => {
      const file = Bun.file(`${distPath}/${filename}`);
      const html = await file.text();
      const result = validate(html);
      expect(result.valid).toBeTrue();
    },
  );
});

const html = await Bun.file(`${distPath}/index.html`).text();

describe('index.html', () => {
  test('contains the correct title', () => {
    expect.assertions(1);
    expect(html).toContain('<title>Viewport Info</title>');
  });

  test('contains the correct CSS filename', () => {
    expect.assertions(1);
    expect(html).toContain(`<link href=${indexCSS} rel=stylesheet>`);
  });

  test('contains the correct JS filename', () => {
    expect.assertions(1);
    expect(html).toContain(`<script src=${indexJS} defer></script>`);
  });
});

test('index CSS file has hash in filename', () => {
  expect.assertions(1);
  expect(indexCSS).toMatch(/^index-[\da-z]+\.css$/);
});

test('index JS file has hash in filename', () => {
  expect.assertions(1);
  expect(indexJS).toMatch(/^index-[\da-z]+\.js$/);
});
