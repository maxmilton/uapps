// FIXME: Remove these lint exceptions once linting can handle mjs
//  ↳ When TS 4.6+ is released and typescript-eslint has support
//  ↳ https://github.com/typescript-eslint/typescript-eslint/issues/3950
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
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
import { createRequire } from 'module';
import path from 'path';
import { PurgeCSS } from 'purgecss';
import { minify } from 'terser';

// workaround for node import not working with *.json
// @ts-expect-error - valid in node ESM
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const mode = process.env.NODE_ENV;
const dev = mode === 'development';
const dir = path.resolve(); // no __dirname in node ESM
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
    // @ts-expect-error - FIXME:!
    build.onEnd((result) => esbuild.analyzeMetafile(result.metafile).then(console.log));
  },
};

/**
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
<script>window.trackx&&(trackx.setup("https://api.trackx.app/v1/ze3tss9sk1z/event"),trackx.meta.app="viewport-info",trackx.meta.release="${release}",trackx.ping("https://api.trackx.app/v1/ze3tss9sk1z/ping"));</script>
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
        const outputJsMap = findOutputFile(result.outputFiles, '.js.map');
        const { file, index } = findOutputFile(result.outputFiles, '.js');

        const { code, map } = await minify(decodeUTF8(file.contents), {
          ecma: 2020,
          compress: {
            passes: 2,
            unsafe_methods: true,
            unsafe_proto: true,
          },
          sourceMap: {
            content: decodeUTF8(outputJsMap.file.contents),
            filename: path.relative(distPath, file.path),
            url: path.relative(distPath, outputJsMap.file.path),
          },
        });

        // @ts-expect-error - map is string
        result.outputFiles[outputJsMap.index].contents = encodeUTF8(map);
        // @ts-expect-error - FIXME: code is defined
        result.outputFiles[index].contents = encodeUTF8(code);
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
