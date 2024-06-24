/* eslint-disable prefer-template */

import { collect, h } from 'stage1';
import { compile } from 'stage1/macro' assert { type: 'macro' };

const supportsTouch =
  'maxTouchPoints' in navigator
    ? navigator.maxTouchPoints > 0
    : 'ontouchstart' in document.documentElement ||
      ('matchMedia' in window && matchMedia('(any-pointer:coarse)').matches);

type AppComponent = HTMLElement;
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

export const App = (): AppComponent => {
  const root = h<AppComponent>(meta.html);
  const refs = collect<Refs>(root, meta.k, meta.d);

  const update = () => {
    refs.a.nodeValue = String(window.screen.width * devicePixelRatio) + ' px';
    refs.b.nodeValue = String(window.screen.height * devicePixelRatio) + ' px';
    refs.c.nodeValue = String(window.screen.width) + ' px';
    refs.d.nodeValue = String(window.screen.height) + ' px';
    refs.e.nodeValue = String(window.innerWidth) + ' px';
    refs.f.nodeValue = String(window.innerHeight) + ' px';
    refs.g.nodeValue = String(document.documentElement.clientWidth) + ' px';
    refs.h.nodeValue = String(document.documentElement.clientHeight) + ' px';
    refs.i.nodeValue = String(devicePixelRatio);
    refs.j.nodeValue = String(window.screen.pixelDepth);
    refs.k.nodeValue = String(window.screen.colorDepth);
    refs.l.nodeValue = supportsTouch ? 'Yes' : 'No';
  };

  update();
  window.onresize = update;

  return root;
};
