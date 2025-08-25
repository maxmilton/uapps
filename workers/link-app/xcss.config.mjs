import framework from "@ekscss/framework/config";
import { extend, ignoreImport } from "@ekscss/framework/utils";
import { onBeforeBuild } from "ekscss";

onBeforeBuild(() => {
  ignoreImport(Bun.resolveSync("@ekscss/framework/level2/a11y.xcss", "."));
});

export default extend(framework, {
  globals: {
    fontStack: [
      "Hyperlegible",
      "system-ui",
      "sans-serif",
    ].join(", "),
    textSize: "18px",

    // App specific config properties
    app: {
      media: {
        // Special case to use compact layout on very small screens
        xs: "(max-width: 500px)",
      },
    },
  },
});
