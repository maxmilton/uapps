import eslint from '@eslint/js';
import mm from '@maxmilton/eslint-config';
import security from 'eslint-plugin-security';
import unicorn from 'eslint-plugin-unicorn';
import ts from 'typescript-eslint';

const OFF = 0;
const ERROR = 2;

export default ts.config(
  eslint.configs.recommended,
  ...ts.configs.strictTypeChecked,
  ...ts.configs.stylisticTypeChecked,
  unicorn.configs['flat/recommended'],
  mm.configs.recommended,
  security.configs.recommended,
  {
    linterOptions: {
      reportUnusedDisableDirectives: ERROR,
    },
    languageOptions: {
      parserOptions: {
        project: ['tsconfig.json', 'tsconfig.node.json'],
        projectService: {
          allowDefaultProject: ['*.mjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // bad browser support
      'unicorn/prefer-at': OFF,
      // prefer to clearly separate Bun and DOM
      'unicorn/prefer-global-this': OFF,

      /* Performance and byte savings */
      // byte savings
      'no-plusplus': OFF,
      // forEach is often faster
      'unicorn/no-array-for-each': OFF,
      // byte savings (minification doesn't currently automatically remove)
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
    files: ['packages/*/build.ts'],
    rules: {
      'no-await-in-loop': OFF,
      'no-console': OFF,
    },
  },
  {
    ignores: ['*.bak', 'coverage/**', 'packages/*/dist/**'],
  },
);
