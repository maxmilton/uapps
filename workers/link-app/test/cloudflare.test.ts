import { describe, expect, test } from "bun:test";
import wrangler from "../wrangler.jsonc" with { type: "jsonc" };

describe("static site", () => {
  test("contains an assets directory", () => {
    expect.assertions(1);
    expect(wrangler).toHaveProperty("assets.directory", "./dist");
  });

  test("will upload source maps", () => {
    expect.assertions(1);
    expect(wrangler).toHaveProperty("upload_source_maps", true);
  });
});

describe("worker", () => {
  test("contain a worker", () => {
    expect.assertions(1);
    expect(wrangler).toHaveProperty("main");
  });

  // test("has expected path", () => {
  //   expect.assertions(1);
  //   expect(wrangler.main).toBe("./dist/worker.js");
  // });
});
