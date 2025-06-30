/* oxlint-disable no-bitwise */

import * as swc from "@swc/core";
import * as html from "@swc/html";
import * as xcss from "ekscss";
import * as lightningcss from "lightningcss";
import { basename } from "node:path"; // eslint-disable-line unicorn/import-style
import { PurgeCSS, type RawContent, type UserDefinedOptions } from "purgecss";

// import * as csso from 'csso';

// https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver#browser_compatibility
// https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_fonts/Variable_fonts_guide
const targets: lightningcss.Targets = {
  // and_chr: 66 << 16,
  android: 66 << 16,
  chrome: 66 << 16,
  edge: 79 << 16,
  firefox: 69 << 16,
  ios_saf: (13 << 16) | (4 << 8),
  safari: (13 << 16) | (1 << 8),
  // and_ff: 79 << 16,
  // op_mob: 47 << 16,
  // opera: 51 << 16,
  // samsung: 9 << 16,
};

export function xcssPlugin(xcssConfig: xcss.XCSSCompileOptions): Bun.BunPlugin {
  return {
    name: "xcss",
    setup(build) {
      build.onLoad({ filter: /\.xcss$/ }, async (args) => {
        const source = await Bun.file(args.path).text();
        const compiled = xcss.compile(source, {
          from: args.path,
          globals: xcssConfig.globals,
          plugins: xcssConfig.plugins,
        });

        for (const warning of compiled.warnings) {
          console.error("[XCSS]", warning.message);
          if (warning.file) {
            console.log(
              `  at ${
                [warning.file, warning.line, warning.column].filter(Boolean)
                  .join(":")
              }`,
            );
          }
        }

        return { contents: compiled.css, loader: "css" };
      });
    },
  };
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
        wrap_func_args: true,
      },
      mangle: {
        props: {
          regex: String.raw`^\$\$`,
        },
      },
      sourceMap: Boolean(artifact.sourcemap),
      ...options.js,
    });
    await Bun.write(artifact.path, result.code);
    if (artifact.sourcemap && result.map) {
      await Bun.write(artifact.sourcemap.path, result.map);
    }
    content.push({ extension: ".js", raw: result.code });
  }

  for (const artifact of artifactsCss) {
    const filename = basename(artifact.path);
    const source = await artifact.text();
    const [purged] = await (purgecss ??= new PurgeCSS()).purge({
      content,
      css: [{ raw: source }],
      safelist: ["html", "body"],
      sourceMap: Boolean(artifact.sourcemap),
      ...options.css,
    });
    const minified = lightningcss.transform({
      filename,
      code: encoder.encode(purged.css),
      minify: true,
      targets,
      include: lightningcss.Features.Colors
        | lightningcss.Features.Nesting
        | lightningcss.Features.MediaQueries,
      exclude: lightningcss.Features.FontFamilySystemUi
        | lightningcss.Features.LogicalProperties
        | lightningcss.Features.DirSelector
        | lightningcss.Features.LightDark,
      sourceMap: Boolean(artifact.sourcemap),
      inputSourceMap: purged.sourceMap!,
    });
    if (minified.warnings.length > 0) console.error(minified.warnings);
    await Bun.write(artifact.path, minified.code);
    if (artifact.sourcemap && minified.map) {
      await Bun.write(artifact.sourcemap.path, minified.map);
    }
    // const minified2 = csso.minify(minified.code.toString(), {
    //   restructure: true,
    //   forceMediaMerge: true, // somewhat unsafe
    //   // debug: true,
    // });
    // await Bun.write(artifact.path, minified2.css);
    // if (artifact.sourcemap && minified2.map) {
    //   await Bun.write(artifact.sourcemap.path, minified2.map.toString());
    // }
  }
}
