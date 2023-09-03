/* eslint-disable import/no-extraneous-dependencies, no-console, no-bitwise */
/* eslint-disable security/detect-non-literal-fs-filename, security/detect-object-injection */

import esbuild from 'esbuild';
import {
  decodeUTF8,
  encodeUTF8,
  minifyTemplates,
  writeFiles,
} from 'esbuild-minify-templates';
import { xcss } from 'esbuild-plugin-ekscss';
import { gitHash, isDirty } from 'git-ref';
import * as lightningcss from 'lightningcss';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PurgeCSS } from 'purgecss';
import pkg from './package.json' assert { type: 'json' };

const mode = process.env.NODE_ENV;
const dev = mode === 'development';
const dir = path.resolve(); // similar to __dirname
const release = `v${pkg.version}-${gitHash()}${isDirty() ? '-dev' : ''}`;

/**
 * @param {esbuild.OutputFile[]} outputFiles
 * @param {string} ext - File extension to match.
 * @returns {{ file: esbuild.OutputFile; index: number; }}
 */
function findOutputFile(outputFiles, ext) {
  const index = outputFiles.findIndex((outputFile) =>
    outputFile.path.endsWith(ext),
  );
  return { file: outputFiles[index], index };
}

/** @type {esbuild.Plugin} */
const analyzeMeta = {
  name: 'analyze-meta',
  setup(build) {
    if (!build.initialOptions.metafile) return;
    build.onEnd((result) => {
      if (result.metafile) {
        esbuild
          .analyzeMetafile(result.metafile)
          .then(console.log)
          .catch(console.error);
      }
    });
  },
};

/**
 * @param {string} title
 * @param {string} jsPath
 * @param {string} cssPath
 */
function makeHtml(title, jsPath, cssPath) {
  return `<!doctype html>
<meta charset=utf-8>
<meta name=viewport content="width=device-width">
<link href=/favicon.svg rel=icon>
<title>${title}</title>
<link rel=preconnect href="https://fonts.bunny.net">
<link href=${cssPath} rel=stylesheet>
<script src=https://cdn.jsdelivr.net/npm/trackx@0/modern.js crossorigin></script>
<script>window.trackx&&(trackx.setup("https://api.trackx.app/v1/ze3tss9sk1z"),trackx.meta.app="viewport",trackx.meta.release="${release}",trackx.ping());</script>
<script src=${jsPath} defer></script>
<noscript>You need to enable JavaScript to run this app.</noscript>`;
}

/** @type {(opts: { title: string }) => esbuild.Plugin} */
const buildHtml = (opts) => ({
  name: 'build-html',
  setup(build) {
    const distPath = path.join(dir, 'dist');

    build.onEnd(async (result) => {
      if (result.outputFiles) {
        const outJS = findOutputFile(result.outputFiles, '.js');
        const outCSS = findOutputFile(result.outputFiles, '.css');

        const html = makeHtml(
          opts.title,
          path.relative(distPath, outJS.file.path),
          path.relative(distPath, outCSS.file.path),
        );

        // eslint-disable-next-line no-param-reassign
        result.outputFiles[result.outputFiles.length] = {
          path: path.join(distPath, 'index.html'),
          contents: encodeUTF8(html),
          hash: '',
          get text() {
            return decodeUTF8(this.contents);
          },
        };
      } else {
        await fs.writeFile(
          path.join(distPath, 'index.html'),
          makeHtml(opts.title, 'app.js', 'app.css'),
          'utf8',
        );
      }
    });
  },
});

/** @type {esbuild.Plugin} */
const minifyCSS = {
  name: 'minify-css',
  setup(build) {
    if (build.initialOptions.write !== false) return;

    build.onEnd(async (result) => {
      if (result.outputFiles) {
        const outHTML = findOutputFile(result.outputFiles, '.html');
        const outJS = findOutputFile(result.outputFiles, '.js');
        const outCSS = findOutputFile(result.outputFiles, '.css');

        const purged = await new PurgeCSS().purge({
          content: [
            { extension: '.html', raw: decodeUTF8(outHTML.file.contents) },
            { extension: '.js', raw: decodeUTF8(outJS.file.contents) },
          ],
          css: [{ raw: decodeUTF8(outCSS.file.contents) }],
          sourceMap: dev,
          safelist: ['html', 'body'],
          blocklist: ['svg'],
        });
        const minified = lightningcss.transform({
          filename: outCSS.file.path,
          code: Buffer.from(purged[0].css),
          minify: true,
          sourceMap: dev,
          targets: {
            chrome: 60 << 16,
            edge: 79 << 16,
            firefox: 55 << 16,
            safari: (11 << 16) | (1 << 8),
          },
        });

        for (const warning of minified.warnings) {
          console.error('CSS WARNING:', warning.message);
        }

        // eslint-disable-next-line no-param-reassign
        result.outputFiles[outCSS.index].contents = encodeUTF8(
          minified.code.toString(),
        );

        if (minified.map) {
          const outCSSMap = findOutputFile(result.outputFiles, '.css.map');
          // eslint-disable-next-line no-param-reassign
          result.outputFiles[outCSSMap.index].contents = encodeUTF8(
            minified.map.toString(),
          );
        }
      }
    });
  },
};

/** @type {esbuild.Plugin} */
const minifyJS = {
  name: 'minify-js',
  setup(build) {
    if (!build.initialOptions.minify) return;

    build.onEnd(async (result) => {
      if (!result.outputFiles) return;

      for (const file of result.outputFiles) {
        if (path.extname(file.path) === '.js') {
          // eslint-disable-next-line no-await-in-loop
          const out = await build.esbuild.transform(decodeUTF8(file.contents), {
            loader: 'js',
            minify: true,
            // target: build.initialOptions.target,
          });

          file.contents = encodeUTF8(out.code);
        }
      }
    });
  },
};

/** @type {esbuild.BuildOptions} */
const esbuildConfig = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/app.js',
  entryNames: dev ? '[name]' : '[name]-[hash]',
  assetNames: dev ? '[name]' : '[name]-[hash]',
  chunkNames: dev ? '[name]' : '[name]-[hash]',
  platform: 'browser',
  target: 'es2015',
  define: {
    'process.env.APP_RELEASE': JSON.stringify(release),
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  plugins: [
    xcss(),
    minifyTemplates(),
    buildHtml({ title: 'Viewport Info' }),
    minifyCSS,
    minifyJS,
    writeFiles(),
    analyzeMeta,
  ],
  bundle: true,
  minify: !dev,
  mangleProps: /^\$\$/,
  sourcemap: dev,
  write: dev,
  metafile: !dev && process.stdout.isTTY,
  logLevel: 'debug',
};

if (dev) {
  const context = await esbuild.context(esbuildConfig);
  await context.watch();
} else {
  await esbuild.build(esbuildConfig);
}
