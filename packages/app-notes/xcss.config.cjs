// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck 😢
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-var-requires, import/no-extraneous-dependencies, strict */

'use strict';

const framework = require('@ekscss/framework/config');
const { extend } = require('@ekscss/framework/utils');
const { xcss } = require('ekscss');

module.exports = extend(framework, {
  globals: {
    fontStack: 'Rubik, sans-serif',

    // App is textual data heavy and therefore needs a small font-size
    textSize: '17px',

    media: {
      ns: '(min-width: 40.01rem)',
      m: '(min-width: 40.01rem) and (max-width: 60rem)',
      l: '(min-width: 60.01rem)',
    },

    containerWidthMax: '75rem', // 1275px @ 17px textSize
    containerNarrowWidthMax: '37.5rem', // 637.5px @ 17px textSize
    gutterCol: '1rem',

    color: {
      primary: (x) => x.color.blue4,
      background: (x) => x.color.black,
      text: (x) => x.color.light4,
      shadow: (x) => x.fn.color('#000').alpha(0.35),
    },

    form: {
      helpTextColor: (x) => x.color.gray3,
      // checkboxCheckedBackgroundColor: (x) => x.color.rose3,
      // checkboxCheckedBorderColor: (x) => x.color.rose4,
    },

    input: {
      textColor: (x) => x.color.light2,
      backgroundColor: (x) => x.color.dark3,
      placeholderTextColor: (x) => x.color.gray4,
      outlineSize: '2px',
      border: (x) => xcss`1px solid ${x.color.gray1}`,
      hoverBorderColor: (x) => x.color.gray4,
      disabledBackgroundColor: (x) => x.color.dark1,
      disabledBorder: (x) => x.color.dark5,
    },

    button: {
      level3: {
        backgroundColorFrom: (x) => x.color.dark4,
        backgroundColorTo: (x) => x.color.dark3,
        hoverBackgroundColor: (x) => x.color.dark2,
      },
      primary: {
        // backgroundColorFrom: (x) => x.color.rose2,
        // backgroundColorTo: (x) => x.color.rose1,
        // borderColor: (x) => x.color.rose4,
        borderColor: (x) => x.color.blue4,
        // hoverBackgroundColor: (x) => x.color.rose1,
      },
      success: {
        backgroundColorFrom: (x) => x.color.green4,
        backgroundColorTo: (x) => x.color.green3,
        borderColor: (x) => x.color.green5,
        hoverBackgroundColor: (x) => x.color.green2,
      },
      danger: {
        backgroundColorFrom: (x) => x.color.red4,
        backgroundColorTo: (x) => x.fn.color(x.color.red3).lighten(0.06),
        borderColor: (x) => x.color.red5,
        hoverBackgroundColor: (x) => x.color.red2,
      },
    },

    card: {
      backgroundColor: (x) => x.color.dark1,
      shadow: (x) => xcss`0 2px 8px ${x.color.shadow}`,
      bodyMargin: '1rem 1.4rem',
    },

    // App specific config properties
    app: {
      media: {
        // Special case to use compact layout on very small screens
        xs: '(max-width: 500px)',
      },

      shadow: (x) => xcss`0 0.1em 0.5em ${x.fn.color(x.color.dark2).alpha(0.7)}`,
    },
  },
});
