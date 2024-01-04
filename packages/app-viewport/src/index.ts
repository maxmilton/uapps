/* eslint-disable prefer-template */

import './index.xcss';

import { compile } from 'stage1/macro' assert { type: 'macro' };
import { collect, h } from 'stage1/runtime';
import { interpolate } from './macros' assert { type: 'macro' };

const supportsTouch =
  'maxTouchPoints' in navigator
    ? navigator.maxTouchPoints > 0
    : 'ontouchstart' in document.documentElement ||
      ('matchMedia' in window && matchMedia('(any-pointer:coarse)').matches);

type Refs = {
  a: Text;
  b: Text;
  c: Text;
  d: Text;
  e: Text;
  f: Text;
  g: Text;
  h: Text;
  i: Text;
  j: Text;
  k: Text;
  l: Text;
};

const meta = compile(`
  <main>
    <h1>Viewport Info</h1>

    <dl>
      <dt>Screen width</dt>
      <dd>@a</dd>

      <dt>Screen height</dt>
      <dd>@b</dd>

      <dt>Pixel width</dt>
      <dd>@c</dd>

      <dt>Pixel height</dt>
      <dd>@d</dd>

      <dt>innerWidth</dt>
      <dd>@e</dd>

      <dt>innerHeight</dt>
      <dd>@f</dd>

      <dt>clientWidth</dt>
      <dd>@g</dd>

      <dt>clientHeight</dt>
      <dd>@h</dd>

      <dt>devicePixelRatio</dt>
      <dd>@i</dd>

      <dt>pixelDepth</dt>
      <dd>@j</dd>

      <dt>colorDepth</dt>
      <dd>@k</dd>

      <dt>Supports touch</dt>
      <dd>@l</dd>
    </dl>
  </main>
`);

const App = () => {
  const root = h(meta.html);
  const refs = collect<Refs>(root, meta.k, meta.d);

  const update = () => {
    refs.a.nodeValue = window.screen.width * devicePixelRatio + ' px';
    refs.b.nodeValue = window.screen.height * devicePixelRatio + ' px';
    refs.c.nodeValue = window.screen.width + ' px';
    refs.d.nodeValue = window.screen.height + ' px';
    refs.e.nodeValue = window.innerWidth + ' px';
    refs.f.nodeValue = window.innerHeight + ' px';
    refs.g.nodeValue = document.documentElement.clientWidth + ' px';
    refs.h.nodeValue = document.documentElement.clientHeight + ' px';
    refs.i.nodeValue = devicePixelRatio + '';
    refs.j.nodeValue = window.screen.pixelDepth + '';
    refs.k.nodeValue = window.screen.colorDepth + '';
    refs.l.nodeValue = supportsTouch ? 'Yes' : 'No';
  };

  update();
  window.onresize = update;

  return root;
};

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

document.body.append(App(), h(footerMeta.html));
