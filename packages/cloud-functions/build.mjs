// FIXME: Remove these lint exceptions once linting can handle mjs
//  ↳ When TS 4.6+ is released and typescript-eslint has support
//  ↳ https://github.com/typescript-eslint/typescript-eslint/issues/3950
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-extraneous-dependencies, no-console */

import esbuild from 'esbuild';
import { gitHash, isDirty } from 'git-ref';
import { createRequire } from 'module';

// workaround for node import not working with *.json
// @ts-expect-error - valid in node ESM
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const mode = process.env.NODE_ENV;
const dev = mode === 'development';
const release = `v${pkg.version}-${gitHash()}${isDirty() ? '-dev' : ''}`;

/**
 * @param {esbuild.BuildResult} buildResult
 * @returns {Promise<esbuild.BuildResult>}
 */
async function analyzeMeta(buildResult) {
  if (buildResult.metafile) {
    console.log(await esbuild.analyzeMetafile(buildResult.metafile));
  }

  return buildResult;
}

const out = await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  platform: 'node',
  target: ['node14'], // TODO: Use `node16` after fixing issue with nullish coalescing operator (??)
  external: [
    'firebase-admin',
    'firebase-functions',
    'source-map-support',
    'source-map',
  ],
  define: {
    'process.env.APP_RELEASE': JSON.stringify(release),
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  banner: { js: '"use strict";' },
  bundle: true,
  sourcemap: true,
  minify: !dev,
  legalComments: 'external',
  logLevel: 'debug',
});

await analyzeMeta(out);
