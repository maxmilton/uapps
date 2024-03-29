/* eslint-disable no-console */

import { gitHash, isDirty } from '@uapps/git-ref';
import pkg from './package.json' assert { type: 'json' };

const mode = Bun.env.NODE_ENV;
const dev = mode === 'development';
const release = `v${pkg.version}-${gitHash()}${isDirty() ? '-dev' : ''}`;

console.time('build');
const out = await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  target: 'node',
  format: 'esm',
  define: {
    'process.env.APP_RELEASE': JSON.stringify(release),
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  minify: !dev,
  sourcemap: 'external',
});
console.timeEnd('build');
console.log(out);
