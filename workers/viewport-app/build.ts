import { artifactPath, assert, minify, xcss } from "@uapps/build-tools";
import { gitHash, gitRef, isDirty } from "@uapps/git-info";
import pkg from "./package.json" with { type: "json" };
import xcssConfig from "./xcss.config.mjs";

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
      <meta name="viewport" content="width=device-width,user-scalable=no">
      <link href="/favicon.svg" rel="icon">
      <title>Viewport Info</title>
      <link href="/${css}" rel="stylesheet">
      <script src="https://io.bugbox.app/v0/bugbox.js" crossorigin data-key="${Bun.env.FRONTEND_BUGBOX_API_KEY}" data-env="${Bun.env.ENV}" data-release="${release}"></script>
      <script src="/${js}" defer></script>
    </head>
    <body>
      <noscript>JavaScript is required</noscript>
    </body>
    </html>
  `.replace(/^\s+/gm, "");

  artifacts.push({
    path: "dist/index.html",
    type: "text/html;charset=utf-8",
    size: html.length,
    sourcemap: null,
    // @ts-expect-error - not async
    text: () => html,
  } satisfies Bun.BuildArtifact);

  await Bun.write("dist/index.html", html);

  return { html, css, js };
}

console.time("prebuild");
await Bun.$`rm -rf dist`;
await Bun.$`cp -r static dist`;
console.timeEnd("prebuild");

console.time("build");
const out1 = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  naming: dev ? "[dir]/[name].[ext]" : "[dir]/[name]-[hash].[ext]",
  target: "browser",
  format: "esm",
  define: {
    "process.env.APP_RELEASE": JSON.stringify(release),
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
  plugins: [xcss(xcssConfig)],
  emitDCEAnnotations: true,
  minify: !dev,
  sourcemap: "linked",
});
console.timeEnd("build");

console.time("html");
const out2 = await buildHTML(out1.outputs);
console.timeEnd("html");

if (!dev) {
  console.time("minify");
  // FIXME: Uncomment once bun is fixed.
  // await minify(out1.outputs);
  console.timeEnd("minify");
}

console.time("build-info");
await Bun.write(
  "dist/build-info.json",
  JSON.stringify({
    ref: gitRef(),
    mode,
    css: out2.css,
    js: out2.js,
  }),
);
console.timeEnd("build-info");
