// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck 😢
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-var-requires, strict */

'use strict';

const framework = require('@ekscss/framework/config');
const { extend } = require('@ekscss/framework/utils');

module.exports = extend(framework, {
  globals: {
    fontStack: 'Rubik, sans-serif',

    color: {
      primary: (x) => x.color.blue4,
      background: (x) => x.color.black,
      text: (x) => x.color.light4,
    },

    // App specific config properties
    app: {
      media: {
        // Special case to use compact layout on very small screens
        xs: '(max-width: 500px)',
      },
    },
  },
});
