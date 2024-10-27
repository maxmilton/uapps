/* eslint-disable no-bitwise */

import { basename } from 'node:path'; // eslint-disable-line unicorn/import-style
import { gitHash, isDirty } from '@uapps/git-ref';
import type { BunPlugin } from 'bun';
import * as csso from 'csso';
import * as xcss from 'ekscss';
import * as lightningcss from 'lightningcss';
import { PurgeCSS } from 'purgecss';
import * as terser from 'terser';
import pkg from './package.json' with { type: 'json' };
import xcssConfig from './xcss.config';

const mode = Bun.env.NODE_ENV;
const dev = mode === 'development';
const release = `v${pkg.version}-${gitHash()}${isDirty() ? '-dev' : ''}`;

let css = '';
// XXX: Temporary workaround to build CSS until Bun.build supports css loader
const extractCSS: BunPlugin = {
  name: 'extract-css',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      css += await Bun.file(args.path).text();
      return { contents: '', loader: 'js' };
    });
    build.onLoad({ filter: /\.xcss$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const compiled = xcss.compile(source, {
        from: args.path,
        globals: xcssConfig.globals,
        plugins: xcssConfig.plugins,
      });

      for (const warning of compiled.warnings) {
        console.error('XCSS:', warning.message);

        if (warning.file) {
          console.log(
            `  at ${[warning.file, warning.line, warning.column]
              .filter(Boolean)
              .join(':')}`,
          );
        }
      }

      css += compiled.css;
      return { contents: '', loader: 'js' };
    });
  },
};

// TODO: Handle source maps
async function minifyCSS(
  cssCode: string,
  jsArtifact: Blob & { path: string },
  htmlCode: string,
) {
  const jsCode = await jsArtifact.text();
  const purged = await new PurgeCSS().purge({
    content: [
      { extension: '.js', raw: jsCode },
      { extension: '.html', raw: htmlCode },
    ],
    css: [{ raw: cssCode }],
    safelist: ['html', 'body'],
    // blocklist: [],
  });
  const minified = lightningcss.transform({
    filename: 'popup.css',
    code: Buffer.from(purged[0].css),
    minify: true,
    targets: {
      chrome: 60 << 16,
      edge: 79 << 16,
      firefox: 55 << 16,
      safari: (11 << 16) | (1 << 8),
    },
  });

  for (const warning of minified.warnings) {
    console.error('CSS:', warning.message);
  }

  // TODO: Not ideal as it will inherit the same hash as the JS file, but once
  // bun build supports "css" loader we won't have to worry about this.
  const cssPath = jsArtifact.path.replace(/\.js$/, '.css');

  // await Bun.write(cssPath, minified.code.toString());

  const minified2 = csso.minify(minified.code.toString(), {
    filename: 'login.css',
    forceMediaMerge: true, // somewhat unsafe
    // usage: {
    //   blacklist: {
    //     classes: [
    //       'button', // #apply mapped to 'button'
    //       'disabled', // not actually used
    //     ],
    //   },
    // },
    // debug: true,
  });

  await Bun.write(cssPath, minified2.css);
}

// TODO: Handle source maps
async function minifyJS(artifact: Blob & { path: string }) {
  let source = await artifact.text();

  // Improve var collapsing; terser doesn't do this so we do it manually
  source = source.replaceAll('const ', 'let ');

  const result = await terser.minify(source, {
    ecma: 2020,
    module: true,
    compress: {
      // Prevent functions being inlined
      reduce_funcs: false,
      // XXX: Comment out to keep performance markers for debugging
      pure_funcs: ['performance.mark', 'performance.measure'],
      passes: 3, // helps clean up some var assignments from earlier passes
    },
    mangle: {
      properties: {
        regex: /^\$\$/,
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  await Bun.write(artifact.path, result.code!);
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

async function buildHTML(jsArtifact: Blob & { path: string }) {
  const jsPath = basename(jsArtifact.path);
  const cssPath = jsPath.replace(/\.js$/, '.css');

  const html = minifyHTML(`
    <!doctype html>
    <meta charset=utf-8>
    <meta name=viewport content="width=device-width,user-scalable=no">
    <link href=/favicon.svg rel=icon>
    <title>Viewport Info</title>
    <link rel=preconnect href="https://fonts.bunny.net">
    <link href=${cssPath} rel=stylesheet>
    <script src=https://cdn.jsdelivr.net/npm/trackx@0/modern.js crossorigin></script>
    <script>window.trackx&&(trackx.setup("https://api.trackx.app/v1/ze3tss9sk1z"),trackx.meta.app="viewport",trackx.meta.release="${release}",trackx.ping());</script>
    <script src=${jsPath} defer></script>
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
  naming: {
    entry: dev ? '[dir]/[name].[ext]' : '[dir]/[name]-[hash].[ext]',
    chunk: dev ? '[dir]/[name].[ext]' : '[dir]/[name]-[hash].[ext]',
    asset: dev ? '[dir]/[name].[ext]' : '[dir]/[name]-[hash].[ext]',
  },
  target: 'browser',
  format: 'esm',
  define: {
    'process.env.APP_RELEASE': JSON.stringify(release),
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  loader: {
    '.svg': 'text',
  },
  plugins: [extractCSS],
  // minify: !dev,
  minify: {
    whitespace: !dev,
    identifiers: !dev,
    // FIXME: Bun macros break if syntax minify is disabled (due to string
    // interpolation and concatenation not being resolved).
    syntax: true,
  },
  // TODO: Always output source maps once we fix handling them in minified JS/CSS
  sourcemap: dev ? 'linked' : 'none',
});
console.timeEnd('build');
console.log(out);

console.time('html');
const html = await buildHTML(out.outputs[0]);
console.timeEnd('html');

if (dev) {
  await Bun.write('dist/index.css', css);
} else {
  console.time('minifyCSS');
  await minifyCSS(css, out.outputs[0], html);
  console.timeEnd('minifyCSS');

  console.time('minifyJS');
  await minifyJS(out.outputs[0]);
  console.timeEnd('minifyJS');
}
