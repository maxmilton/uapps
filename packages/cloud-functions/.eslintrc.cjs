const WARN = 1;

// /** @type {import('eslint/lib/shared/types').ConfigData} */
module.exports = {
  rules: {
    '@typescript-eslint/no-unsafe-assignment': WARN,
    '@typescript-eslint/no-unsafe-member-access': WARN,
    '@typescript-eslint/restrict-template-expressions': WARN,
  },
};
