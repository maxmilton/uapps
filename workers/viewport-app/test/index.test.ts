import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { validate } from "@maxmilton/test-utils/html";
import build from "../dist/build-info.json" with { type: "json" };

const distPath = `${import.meta.dir}/../dist`;

test("index CSS file found", () => {
  expect.assertions(1);
  expect(build.css).toBeDefined();
});

test("index JS file found", () => {
  expect.assertions(1);
  expect(build.js).toBeDefined();
});

describe("dist files", () => {
  // TODO: Remove the file MIME type checks? Bun inferrs it from the file
  // extension, not the actual file data, so the usefulness is questionable.

  // NOTE: Files with unknown type (e.g., symlinks) fall back to the default
  // "application/octet-stream". Bun.file() does not resolve symlinks so it's
  // safe to infer that all these files are therefore regular files.
  const distFiles: [filename: string, type: string, minBytes?: number, maxBytes?: number][] = [
    ["_headers", "application/octet-stream"],
    ["build-info.json", "application/json;charset=utf-8"],
    ["favicon.ico", "image/x-icon"],
    ["favicon.svg", "image/svg+xml"],
    ["humans.txt", "text/plain;charset=utf-8", 100, 200],
    [build.css, "text/css;charset=utf-8", 1300, 1800],
    // TODO: Uncomment once bun supports CSS source maps.
    // [`${indexCSS}.map`, 'application/json;charset=utf-8', 100, 10_000],
    [build.js, "text/javascript;charset=utf-8", 1000, 2500],
    [`${build.js}.map`, "application/json;charset=utf-8"],
    ["index.html", "text/html;charset=utf-8", 400, 600],
    ["robots.txt", "text/plain;charset=utf-8"],
  ];

  describe.each(distFiles)("%s", (filename, type, minBytes, maxBytes) => {
    const file = Bun.file(`${distPath}/${filename}`);

    test("exists with correct MIME type", () => {
      expect.assertions(3);
      expect(file.exists()).resolves.toBeTruthy();
      expect(file.size).toBeGreaterThan(0);
      expect(file.type).toBe(type);
    });

    if (typeof minBytes === "number" && typeof maxBytes === "number") {
      test("is within expected file size limits", () => {
        expect.assertions(2);
        expect(file.size).toBeGreaterThan(minBytes);
        expect(file.size).toBeLessThan(maxBytes);
      });
    }
  });

  test("contains no extra files", async () => {
    expect.assertions(1);
    const expectedFiles = new Set(distFiles.map(([filename]) => filename));
    const distDir = await readdir(distPath);
    const extraFiles = distDir.filter((filename) => !expectedFiles.has(filename));
    expect(extraFiles).toEqual([]);
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
    expect(html).toContain(/* html */ "<title>Viewport Info</title>");
  });

  test("contains the correct CSS filename", () => {
    expect.assertions(1);
    expect(html).toContain(/* html */ `<link href=/${build.css} rel=stylesheet>`);
  });

  test("contains the correct JS filename", () => {
    expect.assertions(1);
    expect(html).toContain(/* html */ `<script src=/${build.js} defer></script>`);
  });
});

test("CSS file has hash in filename", () => {
  expect.assertions(1);
  expect(build.css).toMatch(/^index-[\da-z]+\.css$/u);
});

test("JS file has hash in filename", () => {
  expect.assertions(1);
  expect(build.js).toMatch(/^index-[\da-z]+\.js$/u);
});
