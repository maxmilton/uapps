import { compile, DECLARATION, type Element, FONT_FACE, lookup, MEDIA, walk } from "@maxmilton/test-utils/css";
import { describe, expect, test } from "bun:test";
import buildInfo from "../dist/build-info.json" with { type: "json" };
import xcssConfig from "../xcss.config.mjs";

describe("xcss config", () => {
  test("contains only expected plugins", () => {
    expect.assertions(3);
    expect(xcssConfig.plugins).toBeArrayOfSize(3);
    // HACK: We can't use fn.name because the plugins are minified, so we check
    // that a known unique error code is present in the stringified source.
    expect(xcssConfig.plugins?.[0].toString()).toInclude("import-empty"); // @ekscss/plugin-import
    expect(xcssConfig.plugins?.[1].toString()).toInclude("apply-empty"); // @ekscss/plugin-apply
    // TODO: Check for @ekscss/plugin-prefixer
  });
});

const css = await Bun.file(`${import.meta.dir}/../dist/${buildInfo.css}`)
  .text();
const ast = compile(css);

test("compiled AST is not empty", () => {
  expect.assertions(1);
  expect(ast).not.toBeEmpty();
});

test("does not contain any @import rules", () => {
  expect.assertions(1);
  expect(css).not.toInclude("@import");
});

test('does not contain a ":root" selector', () => {
  expect.assertions(1);
  expect(css).not.toInclude(":root");
});

test("does not contain any comments", () => {
  expect.assertions(4);
  expect(css).not.toInclude("/*");
  expect(css).not.toInclude("*/");
  expect(css).not.toMatch(/(?<!:)\/\//); // "//" but not "://" (URL protocol)
  expect(css).not.toInclude("<!");
});

test("does not have any CSS variable declarations", () => {
  expect.assertions(1);
  let found = 0;
  walk(ast, (element) => {
    if (element.type === DECLARATION && (element.props as string).startsWith("--")) {
      found += 1;
    }
  });
  expect(found).toBe(0);
});

test("has a single @font-face query (Hyperlegible font)", () => {
  expect.assertions(4);
  const fontFaceQueries: Element[] = [];
  walk(ast, (element) => {
    if (element.type === FONT_FACE) {
      fontFaceQueries.push(element);
    }
  });
  expect(fontFaceQueries).toHaveLength(1);
  const firstChild = fontFaceQueries[0].children[0] as Element;
  expect(firstChild.type).toBe(DECLARATION);
  expect(firstChild.props).toBe("font-family");
  expect(firstChild.children).toBe("Hyperlegible");
});

// "@media (min-width:60.01rem)"
test("has a single @media query", () => {
  expect.assertions(1);
  let found = 0;
  walk(ast, (element) => {
    if (element.type === MEDIA) {
      found += 1;
    }
  });
  expect(found).toBe(1);
});

const wellKnownSelectors = [
  "body",
  "html",
  "main",
  "footer",
  "h1",
  "a",
  "a:focus",
  "a:hover",
  "dl",
  "dt",
  "dd",
  ".ml",
  ".link",
];

test.each(wellKnownSelectors)("has %s styles", (selector) => {
  expect.assertions(2);
  const elements = lookup(ast, selector);
  expect(elements).toBeArray();
  expect(elements?.length).toBeGreaterThan(0);
});
