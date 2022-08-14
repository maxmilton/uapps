const OFF = 0;

module.exports = {
  rules: {
    'no-restricted-syntax': OFF,
    // stage1 uses underscores in synthetic event handler names
    'no-underscore-dangle': OFF,
    'no-void': OFF,
  },
};
