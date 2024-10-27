// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck 😢
/* eslint-disable @typescript-eslint/no-unsafe-return */

import framework from '@ekscss/framework/config';
import { extend } from '@ekscss/framework/utils';
import { ctx, onBeforeBuild } from 'ekscss';

onBeforeBuild(() => {
  // Cheeky abuse of ekscss ctx to stop unwanted style imports
  ctx.dependencies.push(
    Bun.resolveSync('@ekscss/framework/level2/a11y.xcss', '.'),
    Bun.resolveSync('@ekscss/framework/level2/form.xcss', '.'),
  );
});

export default extend(framework, {
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
