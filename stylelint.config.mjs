/** @type {import('stylelint').Config} */
export default {
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
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
  },
};
