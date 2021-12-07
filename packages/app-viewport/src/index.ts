import { h } from 'stage1';
import './index.xcss';

declare global {
  interface HTMLElement {
    /** `stage1` synthetic click event handler. */
    __click(event: MouseEvent): void;
  }
}

let supportsTouch: boolean;

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent
if ('maxTouchPoints' in navigator) {
  supportsTouch = navigator.maxTouchPoints > 0;
} else {
  const mq = matchMedia('(pointer:coarse)');
  if (mq && mq.media === '(pointer:coarse)') {
    supportsTouch = !!mq.matches;
  } else if ('orientation' in window) {
    supportsTouch = true; // deprecated, but good fallback
  } else {
    supportsTouch = /\b(blackberry|webos|iphone|iemobile|android|windows phone|ipad|ipod)\b/i.test(
      navigator.userAgent,
    );
  }
}

type RefNodes = {
  dl: HTMLDListElement;
};

const view = h(`
  <main id=main>
    <h1 class="tc orange5">Viewport Info</h1>

    <dl #dl></dl>
  </main>
`);

function App() {
  const root = view;
  const { dl } = view.collect<RefNodes>(root);

  const update = () => {
    dl.innerHTML = `
      <dt>Screen width</dt>
      <dd>${window.screen.width} px</dd>

      <dt>Screen height</dt>
      <dd>${window.screen.height} px</dd>

      <dt>innerWidth</dt>
      <dd>${window.innerWidth} px</dd>

      <dt>innerHeight</dt>
      <dd>${window.innerHeight} px</dd>

      <dt>clientWidth</dt>
      <dd>${document.documentElement.clientWidth} px</dd>

      <dt>clientHeight</dt>
      <dd>${document.documentElement.clientHeight} px</dd>

      <dt>devicePixelRatio</dt>
      <dd>${devicePixelRatio}</dd>

      <dt>pixelDepth</dt>
      <dd>${window.screen.pixelDepth}</dd>

      <dt>colorDepth</dt>
      <dd>${window.screen.colorDepth}</dd>

      <dt>Supports touch</dt>
      <dd>${supportsTouch ? 'Yes' : 'No'}</dd>
    `;
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
