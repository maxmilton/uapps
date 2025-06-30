import { minify } from "@uapps/build-tools";
import { gitHash, gitRef, isDirty } from "@uapps/git-info";
import pkg from "./package.json" with { type: "json" };

const mode = Bun.env.NODE_ENV;
const dev = mode === "development";
const release = `v${pkg.version}-${gitHash()}${isDirty() ? "-dev" : ""}`;

console.time("prebuild");
await Bun.$`rm -rf dist`;
console.timeEnd("prebuild");

console.time("build:worker");
const out = await Bun.build({
  entrypoints: ["src/worker.ts"],
  outdir: "dist",
  external: ["cloudflare:*"],
  naming: "[dir]/[name].[ext]",
  format: "esm",
  env: "disable",
  define: {
    "process.env.APP_RELEASE": JSON.stringify(release),
    "process.env.NODE_ENV": JSON.stringify(mode),
    "process.env.BUGBOX_API_ENDPOINT": JSON.stringify(
      "https://io.bugbox.app/v0",
    ),
  },
  splitting: false,
  minify: !dev,
  emitDCEAnnotations: true,
  sourcemap: "linked",
});
console.timeEnd("build:worker");

if (!dev) {
  console.time("minify");
  await minify(out.outputs);
  console.timeEnd("minify");
}

console.time("build-info");
await Bun.write(
  "dist/build-info.json",
  JSON.stringify({
    ref: gitRef(),
    mode,
  }),
);
console.timeEnd("build-info");

// console.debug(out.outputs);
