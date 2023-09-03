/* eslint-disable prefer-template */

import './index.xcss';

import { collect, h } from 'stage1';

const supportsTouch =
  'maxTouchPoints' in navigator
    ? navigator.maxTouchPoints > 0
    : 'ontouchstart' in document.documentElement ||
      ('matchMedia' in window && matchMedia('(any-pointer:coarse)').matches);

type RefNodes = {
  a: Text;
  b: Text;
  c: Text;
  d: Text;
  e: Text;
  f: Text;
  g: Text;
  h: Text;
  i: Text;
};

const view = h(`
  <main>
    <h1 class="tc orange5">Viewport Info</h1>

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
      <dd>${window.screen.pixelDepth}</dd>

      <dt>colorDepth</dt>
      <dd>${window.screen.colorDepth}</dd>

      <dt>Supports touch</dt>
      <dd>${supportsTouch ? 'Yes' : 'No'}</dd>
    </dl>
  </main>
`);

const App = () => {
  const root = view;
  const refs = collect<RefNodes>(root, view);

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
  };

  update();
  window.addEventListener('resize', update);

  return root;
};

document.body.append(
  App(),
  h(`
  <footer class="mv4 fss muted tc">
    © <a href=https://maxmilton.com class="normal muted">Max Milton</a> ・ ${process.env.APP_RELEASE} ・ <a href=https://github.com/maxmilton/uapps/issues>report bug</a>
  </footer>
`),
);
