import { basename } from 'node:path'; // eslint-disable-line unicorn/import-style
import { minify, xcssPlugin } from '@uapps/build-tools';
import { gitHash, gitRef, isDirty } from '@uapps/git-ref';
import pkg from './package.json' with { type: 'json' };
import xcssConfig from './xcss.config';

const mode = Bun.env.NODE_ENV;
const dev = mode === 'development';
const release = `v${pkg.version}-${gitHash()}${isDirty() ? '-dev' : ''}`;

function buildHTML(artifacts: Bun.BuildArtifact[]) {
  const js = artifacts.find(
    (a) => a.kind === 'entry-point' && a.path.endsWith('.js'),
  );
  const css = artifacts.find((a) => a.path.endsWith('.css'));
  if (!js) throw new Error('Could not find JS artifact');
  if (!css) throw new Error('Could not find CSS artifact');

  const jsFile = basename(js.path);
  const cssFile = basename(css.path);

  const html = `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <link href="/manifest.webmanifest" rel="manifest">
      <link href="/logo.svg" rel="icon">
      <link href="/apple-touch-icon.png" rel="apple-touch-icon">
      <title>🔗</title>
      <meta name="referrer" content="origin">
      <link href="/fonts/hyperlegible.woff2" rel="preload" as="font" type="font/woff2" crossorigin>
      <link href="/${cssFile}" rel="stylesheet">
      <script src="https://io.bugbox.app/v0/bugbox.js" crossorigin data-key="AZegewhYcACr7FarO_y9DQ" data-release="${release}"></script>
      <script src="/${jsFile}" defer></script>
    </head>
    <body>
      <noscript>JavaScript is required</noscript>
    </body>
    </html>
  `;

  artifacts.push({
    path: 'dist/index.html',
    type: 'text/html;charset=utf-8',
    size: html.length,
    sourcemap: null,
    // @ts-expect-error - not async
    text: () => html,
  } satisfies Bun.BuildArtifact);

  return { html, cssFile, jsFile };
}

console.time('prebuild');
await Bun.$`rm -rf dist`;
await Bun.$`cp -r static dist`;
console.timeEnd('prebuild');

console.time('build:worker');
const out0 = await Bun.build({
  entrypoints: ['src/worker.ts'],
  outdir: 'dist',
  external: ['cloudflare:*'],
  naming: '[dir]/[name].[ext]',
  format: 'esm',
  env: 'disable',
  define: {
    'process.env.APP_RELEASE': JSON.stringify(release),
    'process.env.NODE_ENV': JSON.stringify(mode),
    // 'process.env.FRONTEND_API_ENDPOINT': JSON.stringify(
    //   Bun.env.FRONTEND_API_ENDPOINT,
    // ),
  },
  splitting: false,
  minify: !dev,
  emitDCEAnnotations: true,
  sourcemap: 'linked',
});
console.timeEnd('build:worker');

console.time('build:app');
const out1 = await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  external: ['/*.woff2'],
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
  plugins: [xcssPlugin(xcssConfig)],
  emitDCEAnnotations: true,
  minify: !dev,
  sourcemap: 'linked',
});
console.timeEnd('build:app');

console.time('html');
const out2 = buildHTML(out1.outputs);
console.timeEnd('html');

if (dev) {
  await Bun.write('dist/index.html', out2.html.replace(/^\s+/gm, ''));
} else {
  console.time('minify');
  await minify(out1.outputs);
  console.timeEnd('minify');
}

console.time('build-info');
await Bun.write(
  'dist/build-info.json',
  JSON.stringify({
    ref: gitRef(),
    mode,
    cssFile: out2.cssFile,
    jsFile: out2.jsFile,
  }),
);
console.timeEnd('build-info');

console.debug(out0.outputs, out1.outputs);
