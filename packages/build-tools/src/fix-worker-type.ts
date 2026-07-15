// FIXME: This is a temporary workaround for broken types in the generated
// worker type definitions.

const file = Bun.file("./worker-configuration.d.ts");
const exists = await file.exists();
if (!exists) throw new Error("worker-configuration.d.ts not found");

const source = await file.text();
const fixed = source.replace('import("./dist/worker")', 'import("./src/worker")');
await Bun.write("./worker-configuration.d.ts", fixed);
