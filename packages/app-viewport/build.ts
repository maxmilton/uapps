/* eslint-disable no-bitwise */

import { basename } from 'node:path'; // eslint-disable-line unicorn/import-style
import { gitHash, isDirty } from '@uapps/git-ref';
import type { BuildArtifact, BunPlugin } from 'bun';
import * as csso from 'csso';
import type { Usage } from 'csso';
import * as xcss from 'ekscss';
import * as lightningcss from 'lightningcss';
import type { Warning } from 'lightningcss';
import { PurgeCSS, type RawContent } from 'purgecss';
import * as terser from 'terser';
import type { MinifyOptions } from 'terser';
import pkg from './package.json' with { type: 'json' };
import xcssConfig from './xcss.config';

const mode = Bun.env.NODE_ENV;
const dev = mode === 'development';
const release = `v${pkg.version}-${gitHash()}${isDirty() ? '-dev' : ''}`;

const xcssPlugin: BunPlugin = {
  name: 'xcss',
  setup(build) {
    build.onLoad({ filter: /\.xcss$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const compiled = xcss.compile(source, {
        from: args.path,
        globals: xcssConfig.globals,
        plugins: xcssConfig.plugins,
      });

      for (const warning of compiled.warnings) {
        console.error('[XCSS]', warning.message);

        if (warning.file) {
          console.log(
            `  at ${[warning.file, warning.line, warning.column]
              .filter(Boolean)
              .join(':')}`,
          );
        }
      }

      return { contents: compiled.css, loader: 'css' };
    });
  },
};

/** Print lightningcss compile warnings. */
function printWarnings(warnings: Warning[]): void {
  for (const warning of warnings) {
    console.error(`[LightningCSS] ${warning.type}:`, warning.message);
    console.log(
      `  at ${warning.loc.filename}:${String(warning.loc.line)}:${String(warning.loc.column)}`,
    );
    if (warning.value) {
      console.log(warning.value);
    }
  }
}

async function minifyCSS(
  artifacts: BuildArtifact[],
  htmlCode: string,
  safelist: string[] = ['html', 'body'],
  blocklist: Usage['blacklist'] = {},
): Promise<void> {
  const content: RawContent[] = [{ extension: '.html', raw: htmlCode }];
  const purgecss = new PurgeCSS();
  const encoder = new TextEncoder();

  for (const artifact of artifacts) {
    if (artifact.kind === 'entry-point' || artifact.kind === 'chunk') {
      content.push({ extension: '.js', raw: await artifact.text() });
    }
  }

  for (const artifact of artifacts) {
    if (artifact.kind === 'asset' && artifact.path.endsWith('.css')) {
      const filename = basename(artifact.path);
      const source = await artifact.text();
      const purged = await purgecss.purge({
        content,
        css: [
          {
            raw: source
              // HACK: Workaround for JS style sourcemap comments rather than CSS.
              //  ↳ This is a bug in bun: https://github.com/oven-sh/bun/issues/15532
              .replace(/\/\/# debugId=[\w]+\n/, '')
              .replace(
                /\/\/# sourceMappingURL=([-\w.]+\.css\.map)\n?$/,
                '/*# sourceMappingURL=$1 */',
              ),
          },
        ],
        safelist,
      });
      const minified = lightningcss.transform({
        filename,
        code: encoder.encode(purged[0].css),
        minify: true,
        targets: {
          chrome: 60 << 16, // FIXME: Set to >= 123 ?... Actually seems fine with no junk
          edge: 79 << 16,
          firefox: 55 << 16,
          safari: (11 << 16) | (1 << 8),
        },
      });
      printWarnings(minified.warnings);
      const minified2 = csso.minify(minified.code.toString(), {
        filename,
        forceMediaMerge: true, // somewhat unsafe
        usage: {
          blacklist: blocklist,
        },
        // debug: true,
      });

      await Bun.write(artifact.path, minified2.css);
    }
  }
}

async function minifyJS(
  artifacts: BuildArtifact[],
  options?: Omit<MinifyOptions, 'sourceMap'>,
): Promise<void> {
  for (const artifact of artifacts) {
    if (artifact.kind === 'entry-point' || artifact.kind === 'chunk') {
      const source = await artifact.text();
      const sourceMap = artifact.sourcemap;
      const result = await terser.minify(source, {
        ecma: 2020,
        module: true,
        format: {
          wrap_func_args: true,
          wrap_iife: true,
        },
        compress: {
          comparisons: false,
          negate_iife: false,
          reduce_funcs: false,
        },
        mangle: {
          properties: {
            regex: /^\$\$/,
          },
        },
        ...options,
        sourceMap: sourceMap
          ? {
              content: await sourceMap.text(),
              filename: basename(artifact.path),
              url: basename(sourceMap.path),
            }
          : false,
      });

      if (result.code) {
        await Bun.write(artifact.path, result.code);
      }
      if (sourceMap && result.map) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        await Bun.write(sourceMap.path, result.map.toString());
      }
    }
  }
}

function minifyHTML(html: string): string {
  return (
    html
      .trim()
      // reduce any whitespace to a single space
      .replace(/\s+/g, ' ')
      // remove space adjacent to tags
      .replace(/> /g, '>')
      .replace(/ </g, '<')
      // remove HTML comments
      .replace(/<!--.*?-->/g, '')
  );
}

async function buildHTML(artifacts: BuildArtifact[]) {
  // const jsPath = basename(jsArtifact.path);
  // const cssPath = jsPath.replace(/\.js$/, '.css');

  const entrypoint = artifacts.find((a) => a.kind === 'entry-point');
  const css = artifacts.find(
    (a) => a.kind === 'asset' && a.path.endsWith('.css'),
  );
  if (!entrypoint) throw new Error('Could not find entry point JS artifact');
  if (!css) throw new Error('Could not find CSS artifact');

  const html = minifyHTML(`
    <!doctype html>
    <meta charset=utf-8>
    <meta name=viewport content="width=device-width,user-scalable=no">
    <link href=/favicon.svg rel=icon>
    <title>Viewport Info</title>
    <link rel=preconnect href="https://fonts.bunny.net">
    <link href=${basename(css.path)} rel=stylesheet>
    <script src=https://cdn.jsdelivr.net/npm/trackx@0/modern.js crossorigin></script>
    <script>window.trackx&&(trackx.setup("https://api.trackx.app/v1/ze3tss9sk1z"),trackx.meta.app="viewport",trackx.meta.release="${release}",trackx.ping());</script>
    <script src=${basename(entrypoint.path)} defer></script>
    <noscript>You need to enable JavaScript to run this app.</noscript>
  `);

  await Bun.write('dist/index.html', html);

  return html;
}

console.time('prebuild');
await Bun.$`rm -rf dist`;
await Bun.$`cp -r static dist`;
console.timeEnd('prebuild');

console.time('build');
const out = await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  naming: dev ? '[dir]/[name].[ext]' : '[dir]/[name]-[hash].[ext]',
  target: 'browser',
  format: 'esm',
  define: {
    'process.env.APP_RELEASE': JSON.stringify(release),
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  loader: {
    '.svg': 'text',
  },
  plugins: [xcssPlugin],
  experimentalCss: true,
  emitDCEAnnotations: true, // for terser
  minify: !dev,
  sourcemap: 'linked',
});
console.timeEnd('build');
console.log(out);
if (!out.success) throw new AggregateError(out.logs, 'Build failed');

console.time('html');
const html = await buildHTML(out.outputs);
console.timeEnd('html');

if (!dev) {
  console.time('minifyCSS');
  await minifyCSS(out.outputs, html);
  console.timeEnd('minifyCSS');

  console.time('minifyJS');
  await minifyJS(out.outputs, {
    compress: {
      comparisons: false,
      negate_iife: false,
      reduce_funcs: false, // prevent function inlining
      passes: 3,
      // XXX: Comment out to keep performance markers for debugging.
      pure_funcs: ['performance.mark', 'performance.measure'],
    },
  });
  console.timeEnd('minifyJS');
}
