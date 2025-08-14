import js from "@eslint/js";
import mm from "@maxmilton/eslint-config";
import oxlint from "eslint-plugin-oxlint";
import unicorn from "eslint-plugin-unicorn";
import ts from "typescript-eslint";

const OFF = 0;
const ERROR = 2;

/** @type {import("typescript-eslint").ConfigArray} */
const config = ts.config(
  js.configs.recommended,
  ts.configs.strictTypeChecked,
  ts.configs.stylisticTypeChecked,
  unicorn.configs.recommended,
  mm.configs.recommended,
  oxlint.configs["flat/all"],
  {
    linterOptions: {
      reportUnusedDisableDirectives: ERROR,
    },
    languageOptions: {
      parserOptions: {
        extraFileExtensions: [".bun"],
        project: [
          "tsconfig.json",
          "tsconfig.bun.json",
          "tsconfig.node.json",
          "workers/*/tsconfig.json",
        ],
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      quotes: [ERROR, "double", { avoidEscape: true }],

      // Bad browser support
      "unicorn/prefer-at": OFF,
      // Prefer to clearly separate Bun and DOM
      "unicorn/prefer-global-this": OFF,

      /* Performance and byte savings */
      // byte savings
      "no-plusplus": OFF,
      // forEach is often faster
      "unicorn/no-array-for-each": OFF,
      // byte savings (minification doesn't currently automatically remove)
      "unicorn/switch-case-braces": [ERROR, "avoid"],

      /* stage1 */
      // Underscores in synthetic event handler names
      "no-underscore-dangle": OFF,
      "unicorn/prefer-add-event-listener": OFF,
      "unicorn/prefer-dom-node-append": OFF,
      "unicorn/prefer-query-selector": OFF,
    },
  },
  {
    ignores: [
      "**/*.bak",
      "**/dist",
      "coverage",
      "workers/*/worker-configuration.d.ts",
    ],
  },
);

export default config;
