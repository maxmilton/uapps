/* eslint-disable import/no-extraneous-dependencies, no-console */

import esbuild from 'esbuild';
import fs from 'fs/promises';
import { gitHash, isDirty } from 'git-ref';

const mode = process.env.NODE_ENV;
const dev = mode === 'development';
/** @type {import('./package.json')} */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,unicorn/prefer-json-parse-buffer
const pkg = JSON.parse(await fs.readFile('./package.json', 'utf8'));
const release = `v${pkg.version}-${gitHash()}${isDirty() ? '-dev' : ''}`;

const out = await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  platform: 'node',
  // TODO: Use `node16` after fixing issue with parsing the nullish coalescing
  // operator (??) in firebase deploy
  target: ['node12'],
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

if (out.metafile) {
  console.log(await esbuild.analyzeMetafile(out.metafile));
}
