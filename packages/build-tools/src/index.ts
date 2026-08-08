// oxlint-disable no-bitwise

import { basename, relative } from "node:path";
import * as swc from "@swc/core";
import * as html from "@swc/html";
import * as lightningcss from "lightningcss";
import { PurgeCSS, type RawContent, type UserDefinedOptions } from "purgecss";

export { xcss } from "bun-plugin-ekscss";

// https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver#browser_compatibility
// https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_fonts/Variable_fonts_guide
const targets: lightningcss.Targets = {
  android: 66 << 16,
  chrome: 66 << 16,
  edge: 79 << 16,
  firefox: 69 << 16,
  ios_saf: (13 << 16) | (4 << 8),
  safari: (13 << 16) | (1 << 8),
};

export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) throw new Error(message ?? "Assertion failed");
}

export function artifactPath(artifacts: Bun.BuildArtifact[], name: string, ext: string): string {
  // nosemgrep: detect-non-literal-regexp
  const re = new RegExp(`\\/${name}(?:-[0-9a-z]{8})?\\.${ext}$`, "u");
  const artifact = artifacts.find(({ path }) => re.test(path));
  assert(artifact !== undefined, `Artifact path ${re.source} not found`);
  return relative("dist", artifact.path);
}

export async function minify(
  artifacts: Bun.BuildArtifact[],
  options: {
    html?: html.Options;
    js?: Omit<swc.JsMinifyOptions, "sourceMap">;
    css?: Omit<UserDefinedOptions, "content" | "css" | "sourceMap">;
  } = {},
): Promise<void> {
  const artifactsHtml: Bun.BuildArtifact[] = [];
  const artifactsJs: Bun.BuildArtifact[] = [];
  const artifactsCss: Bun.BuildArtifact[] = [];
  // XXX: Don't use artifact.sourcemap; bun mispairs it with the next element of
  // outputs[] — when the build emits a CSS asset that's the CSS artifact, and
  // writing to it clobbers the CSS. Look up the map artifact by path instead.
  // Remove once https://github.com/oven-sh/bun/pull/33588 lands.
  // Also see my issue: https://github.com/oven-sh/bun/issues/37184
  const sourcemaps = new Map<string, Bun.BuildArtifact>();

  const encoder = new TextEncoder();
  const content: RawContent[] = [];
  let purgecss: PurgeCSS | undefined;

  for (const artifact of artifacts) {
    if (artifact.path.endsWith(".html")) {
      artifactsHtml.push(artifact);
    } else if (artifact.path.endsWith(".js") || artifact.path.endsWith(".mjs")) {
      artifactsJs.push(artifact);
    } else if (artifact.path.endsWith(".css")) {
      artifactsCss.push(artifact);
    } else if (artifact.kind === "sourcemap") {
      sourcemaps.set(artifact.path, artifact);
    }
  }

  for (const artifact of artifactsHtml) {
    const filename = basename(artifact.path);
    const source = await artifact.text();
    const result = await html.minify(source, {
      filename,
      collapseWhitespaces: "smart",
      removeRedundantAttributes: "smart",
      normalizeAttributes: true,
      tagOmission: false,
      ...options.html,
    });
    if (result.errors) console.error(result.errors);
    await Bun.write(artifact.path, result.code);
    content.push({ extension: ".html", raw: result.code });
  }

  for (const artifact of artifactsJs) {
    const sourcemap = sourcemaps.get(`${artifact.path}.map`);
    const source = await artifact.text();
    // https://swc.rs/docs/configuration/minification
    const result = await swc.minify(source, {
      ecma: 2020,
      module: true,
      compress: {
        comparisons: false,
        keep_infinity: true, // don't use 1/0 for Infinity; bad Chrome performance
        // TODO: Write a test for this (needs JS/TS AST), then uncomment.
        // keep_fargs: false, // good but unsafe for code that relies on func.length
        negate_iife: false,
        reduce_funcs: false, // don't inline single-use functions; better performance
        passes: 2,
        // XXX: Comment out to keep performance markers for debugging.
        pure_funcs: ["performance.mark", "performance.measure"],
      },
      format: {
        wrap_iife: true,
      },
      mangle: {
        props: {
          regex: String.raw`^\$\$`,
        },
      },
      sourceMap: Boolean(sourcemap),
      ...options.js,
    });
    await Bun.write(artifact.path, result.code);
    if (sourcemap && result.map) {
      await Bun.write(sourcemap.path, result.map);
    }
    content.push({ extension: ".js", raw: result.code });
  }

  for (const artifact of artifactsCss) {
    const filename = basename(artifact.path);
    const sourcemap = sourcemaps.get(`${artifact.path}.map`);
    const source = await artifact.text();
    const [purged] = await (purgecss ??= new PurgeCSS()).purge({
      content,
      css: [{ raw: source }],
      safelist: ["html", "body"],
      sourceMap: Boolean(sourcemap),
      ...options.css,
    });
    const minified = lightningcss.transform({
      filename,
      code: encoder.encode(purged.css),
      minify: true,
      targets,
      include:
        lightningcss.Features.Colors |
        lightningcss.Features.Nesting |
        lightningcss.Features.MediaQueries,
      exclude:
        lightningcss.Features.FontFamilySystemUi |
        lightningcss.Features.LogicalProperties |
        lightningcss.Features.DirSelector |
        lightningcss.Features.LightDark,
      sourceMap: Boolean(sourcemap),
      inputSourceMap: purged.sourceMap!,
    });
    if (minified.warnings.length > 0) console.error(minified.warnings);
    await Bun.write(artifact.path, minified.code);
    if (sourcemap && minified.map) {
      await Bun.write(sourcemap.path, minified.map);
    }
  }
}
