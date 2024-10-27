import eslint from '@eslint/js';
import mm from '@maxmilton/eslint-config';
import security from 'eslint-plugin-security';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

const OFF = 0;
const WARN = 1;
const ERROR = 2;

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
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
          allowDefaultProject: ['*.js', '*.cjs', '*.mjs'],
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
      '@typescript-eslint/restrict-plus-operands': WARN,
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
