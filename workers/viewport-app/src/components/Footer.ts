import { interpolate } from "#macros.ts" with { type: "macro" };
import { h } from "stage1/fast";
import { compile } from "stage1/macro" with { type: "macro" };

const meta = compile(
  // FIXME: This is a convoluted workaround for a bug in the bun macro system,
  // where it crashes when doing string literal template interpolation.
  // https://github.com/oven-sh/bun/issues/3830
  interpolate(
    `
      <footer>
        © <a href=https://maxmilton.com class=ml>Max Milton</a> | %%1%% | <a href=https://github.com/maxmilton/uapps/issues>report bug</a>
      </footer>
    `,
    [process.env.APP_RELEASE],
  ),
  { keepSpaces: true },
);

export const Footer = (): HTMLElement => h<HTMLElement>(meta.html);
