/* eslint-disable @typescript-eslint/restrict-plus-operands, prefer-template */

import './index.xcss';

import { h } from 'stage1';

const supportsTouch = 'maxTouchPoints' in navigator
  ? navigator.maxTouchPoints > 0
  : 'ontouchstart' in document.documentElement
      || (matchMedia && matchMedia('(any-pointer:coarse)').matches);

type RefNodes = {
  a: Text;
  b: Text;
  c: Text;
  d: Text;
  e: Text;
  f: Text;
  g: Text;
};

const view = h(`
  <main>
    <h1 class="tc orange5">Viewport Info</h1>

    <dl>
      <dt>Screen width</dt>
      <dd>#a</dd>

      <dt>Screen height</dt>
      <dd>#b</dd>

      <dt>innerWidth</dt>
      <dd>#c</dd>

      <dt>innerHeight</dt>
      <dd>#d</dd>

      <dt>clientWidth</dt>
      <dd>#e</dd>

      <dt>clientHeight</dt>
      <dd>#f</dd>

      <dt>devicePixelRatio</dt>
      <dd>#g</dd>

      <dt>pixelDepth</dt>
      <dd>${window.screen.pixelDepth}</dd>

      <dt>colorDepth</dt>
      <dd>${window.screen.colorDepth}</dd>

      <dt>Supports touch</dt>
      <dd>${supportsTouch ? 'Yes' : 'No'}</dd>
    </dl>
  </main>
`);

function App() {
  const root = view;
  const refs = view.collect<RefNodes>(root);

  const update = () => {
    refs.a.nodeValue = window.screen.width + ' px';
    refs.b.nodeValue = window.screen.height + ' px';
    refs.c.nodeValue = window.innerWidth + ' px';
    refs.d.nodeValue = window.innerHeight + ' px';
    refs.e.nodeValue = document.documentElement.clientWidth + ' px';
    refs.f.nodeValue = document.documentElement.clientHeight + ' px';
    refs.g.nodeValue = devicePixelRatio + '';
  };

  update();
  window.addEventListener('resize', update);

  return root;
}

document.body.append(
  App(),
  h(`
  <footer class="mv4 fss muted tc">
    © <a href=https://maxmilton.com class="normal muted">Max Milton</a> ・ ${process
    .env
    .APP_RELEASE!} ・ <a href=https://github.com/maxmilton/uapps/issues>report bug</a>
  </footer>
`),
);
