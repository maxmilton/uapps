// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck 😢
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-extraneous-dependencies */

'use strict'; // eslint-disable-line strict, lines-around-directive

const framework = require('@ekscss/framework/config');
const { merge } = require('dset/merge');

/** @type {(import('rollup-plugin-ekscss').XCSSConfig)} */
module.exports = merge(framework, {
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
