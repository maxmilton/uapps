/** @type {import("stylelint").Config} */
export default {
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
  reportUnscopedDisables: true,
  extends: [
    "stylelint-config-standard",
    "@maxmilton/stylelint-config",
    "@maxmilton/stylelint-config/tailwindcss",
    "@maxmilton/stylelint-config/xcss",
  ],
  ignoreFiles: ["**/*.bak/**", "**/dist/**", "**/node_modules/**"],
  rules: {
    "function-name-case": null,
    "media-query-no-invalid": null,
    "order/order": null, // covered by biome
    "order/properties-order": null, // covered by biome
  },
};
