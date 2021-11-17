/* eslint-disable import/no-extraneous-dependencies, no-param-reassign, no-console */

import csso from 'csso';
import esbuild from 'esbuild';
import {
  decodeUTF8,
  encodeUTF8,
  minifyTemplates,
  writeFiles,
} from 'esbuild-minify-templates';
import { xcss } from 'esbuild-plugin-ekscss';
import fs from 'fs/promises';
import { gitHash, isDirty } from 'git-ref';
import path from 'path';
import { PurgeCSS } from 'purgecss';
import { minify } from 'terser';

const mode = process.env.NODE_ENV;
const dev = mode === 'development';
const dir = path.resolve(); // no __dirname in node ESM
/** @type {import('./package.json')} */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const pkg = JSON.parse(await fs.readFile('./package.json', 'utf8'));
const release = `v${pkg.version}-${gitHash()}${isDirty() ? '-dev' : ''}`;

/**
 * @param {esbuild.OutputFile[]} outputFiles
 * @param {string} ext - File extension to match.
 * @returns {{ file: esbuild.OutputFile; index: number; }}
 */
function findOutputFile(outputFiles, ext) {
  const index = outputFiles.findIndex((outputFile) => outputFile.path.endsWith(ext));
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
<link rel=preconnect href=https://fonts.googleapis.com>
<link rel=preconnect href=https://fonts.gstatic.com crossorigin>
<link href=${cssPath} rel=stylesheet>
<link href="https://fonts.googleapis.com/css2?family=Rubik&display=swap" rel=stylesheet>
<script src=https://cdn.jsdelivr.net/npm/trackx@0/default.js crossorigin></script>
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
        const outputJs = findOutputFile(result.outputFiles, '.js').file;
        const outputCss = findOutputFile(result.outputFiles, '.css').file;

        const html = makeHtml(
          opts.title,
          path.relative(distPath, outputJs.path),
          path.relative(distPath, outputCss.path),
        );

        result.outputFiles[result.outputFiles.length] = {
          path: path.join(distPath, 'index.html'),
          contents: encodeUTF8(html),
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
const minifyCss = {
  name: 'minify-css',
  setup(build) {
    if (build.initialOptions.write !== false) return;

    build.onEnd(async (result) => {
      if (result.outputFiles) {
        const outputHtml = findOutputFile(result.outputFiles, '.html').file;
        const outputJs = findOutputFile(result.outputFiles, '.js').file;
        const { file, index } = findOutputFile(result.outputFiles, '.css');

        const purgedcss = await new PurgeCSS().purge({
          content: [
            { extension: '.html', raw: decodeUTF8(outputHtml.contents) },
            { extension: '.js', raw: decodeUTF8(outputJs.contents) },
          ],
          css: [{ raw: decodeUTF8(file.contents) }],
          safelist: ['html', 'body'],
        });
        const { css } = csso.minify(purgedcss[0].css, {
          restructure: true,
          forceMediaMerge: true,
        });

        result.outputFiles[index].contents = encodeUTF8(css);
      }
    });
  },
};

/** @type {esbuild.Plugin} */
const minifyJs = {
  name: 'minify-js',
  setup(build) {
    if (build.initialOptions.write !== false) return;

    build.onEnd(async (result) => {
      if (result.outputFiles) {
        const distPath = path.join(dir, 'dist');
        const outMap = findOutputFile(result.outputFiles, '.js.map');
        const outJS = findOutputFile(result.outputFiles, '.js');

        const { code = '', map = '' } = await minify(
          decodeUTF8(outJS.file.contents),
          {
            ecma: 2020,
            compress: {
              comparisons: false,
              passes: 2,
              inline: 2,
              unsafe: true,
            },
            sourceMap: {
              content: decodeUTF8(outMap.file.contents),
              filename: path.relative(distPath, outJS.file.path),
              url: path.relative(distPath, outMap.file.path),
            },
          },
        );

        result.outputFiles[outMap.index].contents = encodeUTF8(map.toString());
        result.outputFiles[outJS.index].contents = encodeUTF8(code);
      }
    });
  },
};

await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/app.js',
  entryNames: dev ? '[name]' : '[name]-[hash]',
  assetNames: dev ? '[name]' : '[name]-[hash]',
  chunkNames: dev ? '[name]' : '[name]-[hash]',
  platform: 'browser',
  target: ['chrome78', 'firefox77', 'safari11', 'edge44'],
  define: {
    'process.env.APP_RELEASE': JSON.stringify(release),
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  plugins: [
    xcss(),
    minifyTemplates(),
    buildHtml({ title: 'Viewport Info' }),
    minifyCss,
    minifyJs,
    writeFiles(),
    analyzeMeta,
  ],
  banner: { js: '"use strict";' },
  bundle: true,
  minify: !dev,
  sourcemap: true,
  watch: dev,
  write: dev,
  metafile: !dev && process.stdout.isTTY,
  logLevel: 'debug',
});
