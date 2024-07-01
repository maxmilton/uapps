// FIXME: eslint-plugin-import seems broken here
/* eslint-disable import/no-unresolved */

import { fixupPluginRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import eslint from '@eslint/js';
import security from 'eslint-plugin-security';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const OFF = 0;
const WARN = 1;
const ERROR = 2;

export default tseslint.config(
  eslint.configs.recommended,
  ...compat.extends('airbnb-base').map((config) => ({
    ...config,
    plugins: {}, // delete
  })),
  ...compat.extends('airbnb-typescript/base'),
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  // eslint-disable-next-line
  unicorn.configs['flat/recommended'],
  security.configs.recommended,
  {
    linterOptions: {
      reportUnusedDisableDirectives: WARN,
    },
    languageOptions: {
      parserOptions: {
        project: ['tsconfig.json', 'tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // settings: {
    //   'import/resolver': {
    //     typescript: {
    //       alwaysTryTypes: true,
    //       project: ['tsconfig.json', 'tsconfig.node.json'],
    //       // project: true,
    //     },
    //   },
    // },
    plugins: {
      import: fixupPluginRules(
        compat.plugins('eslint-plugin-import')[0].plugins?.import ?? {},
      ),
    },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': ERROR,
      '@typescript-eslint/no-confusing-void-expression': WARN,
      '@typescript-eslint/restrict-plus-operands': WARN,
      'import/prefer-default-export': OFF,
      'no-restricted-syntax': OFF,
      'no-void': OFF,
      'unicorn/filename-case': OFF,
      'unicorn/import-style': WARN,
      'unicorn/no-abusive-eslint-disable': WARN,
      'unicorn/no-null': OFF,
      'unicorn/prefer-module': WARN,
      'unicorn/prefer-top-level-await': WARN,
      'unicorn/prevent-abbreviations': OFF,
      // bad browser support
      'unicorn/prefer-at': OFF,

      /* Covered by biome formatter */
      '@typescript-eslint/indent': OFF,
      'function-paren-newline': OFF,
      'implicit-arrow-linebreak': OFF,
      'max-len': OFF,
      'object-curly-newline': OFF,
      'operator-linebreak': OFF,
      'unicorn/no-nested-ternary': OFF,

      /* Performance and byte savings */
      // byte savings
      'no-plusplus': OFF,
      'unicorn/no-array-callback-reference': WARN,
      // forEach is often faster (in Chrome and Firefox but not Safari)
      'unicorn/no-array-for-each': OFF,
      // bad browser support and slower
      'unicorn/prefer-string-replace-all': OFF,
      // byte savings (esbuild minify doesn't currently automatically remove)
      'unicorn/switch-case-braces': [ERROR, 'avoid'],

      /* stage1 */
      // underscores in synthetic event handler names
      'no-underscore-dangle': OFF,
      'unicorn/prefer-add-event-listener': OFF,
      'unicorn/prefer-dom-node-append': OFF,
      'unicorn/prefer-query-selector': OFF,
    },
  },
  {
    files: [
      '*.config.mjs',
      '*.config.ts',
      '*.d.ts',
      '*.spec.ts',
      '*.test.ts',
      'packages/*/*.config.ts',
      'packages/*/build.ts',
      'packages/*/test/**',
      'test/**',
    ],
    rules: {
      'import/no-extraneous-dependencies': OFF,
    },
  },
  {
    ignores: ['*.bak', 'packages/*/dist/**'],
  },
);
