const OFF = 0;
const WARN = 1;
const ERROR = 2;

/** @type {import('eslint/lib/shared/types').ConfigData & { parserOptions: import('@typescript-eslint/types').ParserOptions }} */
module.exports = {
  root: true,
  reportUnusedDisableDirectives: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
  extends: [
    'eslint:recommended',
    'airbnb-base',
    'airbnb-typescript/base',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:unicorn/recommended',
    'prettier',
    'plugin:security/recommended-legacy',
  ],
  plugins: ['prettier'],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': ERROR,
    '@typescript-eslint/no-confusing-void-expression': WARN,
    'import/order': OFF, // broken with prettier
    'import/prefer-default-export': OFF,
    'no-restricted-syntax': OFF,
    'no-void': OFF,
    'prettier/prettier': WARN,
    'unicorn/filename-case': OFF,
    'unicorn/no-abusive-eslint-disable': WARN,
    'unicorn/no-null': OFF,
    'unicorn/prefer-module': WARN,
    'unicorn/prevent-abbreviations': OFF,
    // bad browser support
    'unicorn/prefer-at': OFF,

    /* Performance and byte savings */
    'no-plusplus': OFF,
    'unicorn/no-array-callback-reference': WARN,
    // forEach is often faster (in Chrome and Firefox but not Safari)
    'unicorn/no-array-for-each': OFF,
    // bad browser support and slower
    'unicorn/prefer-string-replace-all': OFF,
    // byte savings (esbuild minify doesn't currently automatically remove)
    'unicorn/switch-case-braces': [ERROR, 'avoid'],

    /* stage1 */
    '@typescript-eslint/consistent-type-definitions': OFF, // FIXME: Issue with stage1 collect Refs
    'unicorn/prefer-add-event-listener': OFF,
    'unicorn/prefer-dom-node-append': OFF,
    'unicorn/prefer-query-selector': OFF,
  },
  overrides: [
    {
      files: [
        'packages/*/test/**',
        '*.spec.ts',
        '*.test.ts',
        'build.ts',
        '*.config.ts',
        '*.d.ts',
      ],
      rules: {
        'import/no-extraneous-dependencies': OFF,
      },
    },
  ],
};
