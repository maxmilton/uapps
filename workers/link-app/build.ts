import { artifactPath, assert, minify, xcss } from "@uapps/build-tools";
import { gitHash, gitRef, isDirty } from "@uapps/git-info";
import pkg from "./package.json" with { type: "json" };
import xcssConfig from "./xcss.config.js";

const mode = Bun.env.NODE_ENV;
const dev = mode === "development";
const release = `v${pkg.version}-${gitHash()}${isDirty() ? "-dev" : ""}`;

async function buildHTML(artifacts: Bun.BuildArtifact[]) {
  assert(Boolean(Bun.env.ENV));
  assert(Bun.env.FRONTEND_BUGBOX_API_KEY.length === 22);

  const js = artifactPath(artifacts, "index", "js");
  const css = artifactPath(artifacts, "index", "css");
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
      <link href="/hyperlegible.woff2" rel="preload" as="font" type="font/woff2" crossorigin>
      <link href="/${css}" rel="stylesheet">
      <script src="https://io.bugbox.app/v0/bugbox.js" crossorigin data-key="${Bun.env.FRONTEND_BUGBOX_API_KEY}" data-env="${Bun.env.ENV}" data-release="${release}"></script>
      <script src="/${js}" defer></script>
    </head>
    <body>
      <noscript>JavaScript is required</noscript>
    </body>
    </html>
  `.replace(/^\s+/gm, "");
  const html404 = `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>404 Not Found</title>
      <script src="https://io.bugbox.app/v0/bugbox.js" crossorigin data-key="${Bun.env.FRONTEND_BUGBOX_API_KEY}" data-env="${Bun.env.ENV}" data-release="${release}"></script>
    </head>
    <body>
      <h1>404 Not Found</h1>
      <p>The resource you are looking for does not exist.</p>
    </body>
    </html>
  `.replace(/^\s+/gm, "");

  artifacts.push(
    {
      path: "dist/index.html",
      type: "text/html;charset=utf-8",
      size: html.length,
      sourcemap: null,
      // @ts-expect-error - not async
      text: () => html,
    } satisfies Bun.BuildArtifact,
    {
      path: "dist/404.html",
      type: "text/html;charset=utf-8",
      size: html404.length,
      // @ts-expect-error - not async
      text: () => html404,
    } satisfies Bun.BuildArtifact,
  );

  await Bun.write("dist/index.html", html);
  await Bun.write("dist/404.html", html404);

  return { html, html404, css, js };
}

console.time("prebuild");
await Bun.$`rm -rf dist`;
await Bun.$`cp -r static dist`;
console.timeEnd("prebuild");

console.time("build:worker");
const out1 = await Bun.build({
  entrypoints: ["src/worker.ts"],
  outdir: "dist",
  external: ["cloudflare:*"],
  naming: "[dir]/[name].[ext]",
  format: "esm",
  env: "disable",
  define: {
    "process.env.APP_RELEASE": JSON.stringify(release),
    "process.env.NODE_ENV": JSON.stringify(mode),
    // 'process.env.FRONTEND_API_ENDPOINT': JSON.stringify(
    //   Bun.env.FRONTEND_API_ENDPOINT,
    // ),
  },
  splitting: false,
  minify: !dev,
  emitDCEAnnotations: true,
  sourcemap: "linked",
});
console.timeEnd("build:worker");

console.time("build:app");
const out2 = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  external: ["/*.woff2"],
  naming: dev ? "[dir]/[name].[ext]" : "[dir]/[name]-[hash].[ext]",
  target: "browser",
  format: "esm",
  define: {
    "process.env.APP_RELEASE": JSON.stringify(release),
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
  loader: {
    ".svg": "text",
  },
  plugins: [xcss(xcssConfig)],
  emitDCEAnnotations: true,
  minify: !dev,
  sourcemap: "linked",
});
console.timeEnd("build:app");

console.time("html");
const out3 = await buildHTML(out2.outputs);
console.timeEnd("html");

if (!dev) {
  console.time("minify");
  await minify(out1.outputs);
  // FIXME: Uncomment once bun is fixed.
  // await minify(out2.outputs);
  console.timeEnd("minify");
}

console.time("build-info");
await Bun.write(
  "dist/build-info.json",
  JSON.stringify({
    ref: gitRef(),
    mode,
    css: out3.css,
    js: out3.js,
  }),
);
console.timeEnd("build-info");
