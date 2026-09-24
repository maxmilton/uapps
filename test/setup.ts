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

function setupMocks(): void {
  global.devicePixelRatio = window.devicePixelRatio;

  // @ts-expect-error - noop stub
  global.performance.mark = () => {};
  // @ts-expect-error - noop stub
  global.performance.measure = () => {};
}

export async function reset(): Promise<void> {
  // oxlint-disable-next-line typescript/no-unnecessary-condition
  if (global.happyDOM) {
    await happyDOM.abort();
    window.close();
  }

  setupDOM();
  setupMocks();
}

await reset();
