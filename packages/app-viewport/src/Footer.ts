import { h } from 'stage1';
import { compile } from 'stage1/macro' assert { type: 'macro' };
import { interpolate } from './macros' assert { type: 'macro' };

// const footerMeta = compile(
//   `
//     <footer>
//       © <a href=https://maxmilton.com class=ml>Max Milton</a> ・ ${process.env.APP_RELEASE} ・ <a href=https://github.com/maxmilton/uapps/issues>report bug</a>
//     </footer>
//   `,
//   { keepSpaces: true },
// );
const footerMeta = compile(
  // FIXME: This is a convoluted workaround for a bug in the bun macro system,
  // where it crashes when doing string literal template interpolation.
  // https://github.com/oven-sh/bun/issues/3830
  interpolate(
    `
      <footer>
        © <a href=https://maxmilton.com class=ml>Max Milton</a> ・ %%1%% ・ <a href=https://github.com/maxmilton/uapps/issues>report bug</a>
      </footer>
    `,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    [process.env.APP_RELEASE!],
  ),
  { keepSpaces: true },
);

export const Footer = (): HTMLElement => h<HTMLElement>(footerMeta.html);
