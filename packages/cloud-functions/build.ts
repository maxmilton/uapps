import { gitHash, isDirty } from '@uapps/git-ref';
import pkg from './package.json' with { type: 'json' };

const mode = Bun.env.NODE_ENV;
const dev = mode === 'development';
const release = `v${pkg.version}-${gitHash()}${isDirty() ? '-dev' : ''}`;

console.time('prebuild');
await Bun.$`rm -rf dist`;
console.timeEnd('prebuild');

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
  sourcemap: 'linked',
});
console.timeEnd('build');
console.log(out);
if (!out.success) throw new AggregateError(out.logs, 'Build failed');
