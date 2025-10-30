import js from "@eslint/js";
import mm from "@maxmilton/eslint-config";
import oxlint from "eslint-plugin-oxlint";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";
import ts from "typescript-eslint";

export default defineConfig(
  js.configs.recommended,
  ts.configs.strictTypeChecked,
  ts.configs.stylisticTypeChecked,
  // @ts-expect-error - broken upstream types
  unicorn.configs.recommended,
  mm.configs.recommended,
  oxlint.configs["flat/all"],
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
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
      quotes: ["error", "double", { avoidEscape: true }],
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
