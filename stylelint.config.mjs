/** @type {import('stylelint').Config} */
export default {
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
  extends: ['stylelint-config-standard', '@maxmilton/stylelint-config'],
  ignoreFiles: ['**/*.bak/**', '**/dist/**', '**/node_modules/**'],
  rules: {
    'import-notation': null,
    'function-name-case': null,
    'function-no-unknown': null,
    'media-query-no-invalid': null,
  },
};
