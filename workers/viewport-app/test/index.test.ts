import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { validate } from "@maxmilton/test-utils/html";
import buildInfo from "../dist/build-info.json" with { type: "json" };

const distPath = `${import.meta.dir}/../dist`;
const { css, js } = buildInfo;

test("index CSS file found", () => {
  expect.assertions(1);
  expect(css).toBeDefined();
});

test("index JS file found", () => {
  expect.assertions(1);
  expect(js).toBeDefined();
});

describe("dist files", () => {
  // FIXME: The bun file type is just inferred from the file extension, not the
  // underlying file data... so that part of this test is not very useful.

  // XXX: Files with unknown type (e.g., symlinks) fall back to the default
  // "application/octet-stream". Bun.file() does not resolve symlinks so it's
  // safe to infer that all these files are therefore regular files.
  const distFiles: [filename: string, type: string, minBytes?: number, maxBytes?: number][] = [
    ["_headers", "application/octet-stream"],
    ["build-info.json", "application/json;charset=utf-8"],
    ["favicon.ico", "image/x-icon"],
    ["favicon.svg", "image/svg+xml"],
    ["humans.txt", "text/plain;charset=utf-8", 100, 200],
    [css, "text/css;charset=utf-8", 1300, 1800],
    // FIXME: Uncomment once bun supports CSS source maps.
    // [`${indexCSS}.map`, 'application/json;charset=utf-8', 100, 10_000],
    [js, "text/javascript;charset=utf-8", 1000, 2000],
    [`${js}.map`, "application/json;charset=utf-8"],
    ["index.html", "text/html;charset=utf-8", 400, 600],
    ["robots.txt", "text/plain;charset=utf-8"],
  ];

  for (const [filename, type, minBytes, maxBytes] of distFiles) {
    describe(filename, () => {
      const file = Bun.file(`${distPath}/${filename}`);

      test("exists with correct type", () => {
        expect.assertions(3);
        expect(file.exists()).resolves.toBeTruthy();
        expect(file.size).toBeGreaterThan(0);
        expect(file.type).toBe(type); // TODO: Keep this? Type seems to be resolved from the file extension, not the file data.
      });

      if (typeof minBytes === "number" && typeof maxBytes === "number") {
        test("is within expected file size limits", () => {
          expect.assertions(2);
          expect(file.size).toBeGreaterThan(minBytes);
          expect(file.size).toBeLessThan(maxBytes);
        });
      }
    });
  }

  test("contains no extra files", async () => {
    expect.assertions(1);
    const distDir = await readdir(distPath);
    expect(distDir).toHaveLength(distFiles.length);
  });

  test.each(distFiles.filter(([filename]) => filename.endsWith(".html")))(
    "%s contains valid HTML",
    async (filename) => {
      const file = Bun.file(`${distPath}/${filename}`);
      const html = await file.text();
      const result = validate(html);
      expect(result.valid).toBeTrue();
    },
  );
});

const html = await Bun.file(`${distPath}/index.html`).text();

describe("index.html", () => {
  test("contains the correct title", () => {
    expect.assertions(1);
    expect(html).toContain("<title>Viewport Info</title>");
  });

  test("contains the correct CSS filename", () => {
    expect.assertions(1);
    expect(html).toContain(`<link href=/${css} rel=stylesheet>`);
  });

  test("contains the correct JS filename", () => {
    expect.assertions(1);
    expect(html).toContain(`<script src=/${js} defer></script>`);
  });
});

test("CSS file has hash in filename", () => {
  expect.assertions(1);
  expect(css).toMatch(/^index-[\da-z]+\.css$/);
});

test("JS file has hash in filename", () => {
  expect.assertions(1);
  expect(js).toMatch(/^index-[\da-z]+\.js$/);
});
