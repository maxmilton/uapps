import "@maxmilton/test-utils/extend";

import { setupDOM } from "@maxmilton/test-utils/dom";

// HACK: Make imported *.xcss files return empty to prevent test errors.
// oxlint-disable-next-line vitest/require-hook
Bun.plugin({
  name: "xcss",
  setup(build) {
    build.onLoad({ filter: /\.xcss$/u }, () => ({
      contents: "",
      loader: "css",
    }));
  },
});

const noop = () => {};

function setupMocks(): void {
  global.devicePixelRatio = window.devicePixelRatio;

  // @ts-expect-error - noop stub
  global.performance.mark = noop;
  // @ts-expect-error - noop stub
  global.performance.measure = noop;
}

export async function reset(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (global.happyDOM) {
    await happyDOM.abort();
    window.close();
  }

  setupDOM();
  setupMocks();
}

await reset();
