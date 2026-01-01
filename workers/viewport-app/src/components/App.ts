import { collect, h } from "stage1/fast";
import { compile } from "stage1/macro" with { type: "macro" };

const supportsTouch =
  "maxTouchPoints" in navigator
    ? navigator.maxTouchPoints > 0
    : "ontouchstart" in document.documentElement
      || ("matchMedia" in window && matchMedia("(any-pointer:coarse)").matches);

type AppComponent = HTMLElement;
interface Refs {
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
}

const meta = compile<Refs>(`
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
  const refs = collect<Refs>(root, meta.d);

  const update = () => {
    refs[meta.ref.a].nodeValue = String(window.screen.width * devicePixelRatio) + " px";
    refs[meta.ref.b].nodeValue = String(window.screen.height * devicePixelRatio) + " px";
    refs[meta.ref.c].nodeValue = String(window.screen.width) + " px";
    refs[meta.ref.d].nodeValue = String(window.screen.height) + " px";
    refs[meta.ref.e].nodeValue = String(window.innerWidth) + " px";
    refs[meta.ref.f].nodeValue = String(window.innerHeight) + " px";
    refs[meta.ref.g].nodeValue = String(document.documentElement.clientWidth) + " px";
    refs[meta.ref.h].nodeValue = String(document.documentElement.clientHeight) + " px";
    refs[meta.ref.i].nodeValue = String(devicePixelRatio);
    refs[meta.ref.j].nodeValue = String(window.screen.pixelDepth);
    refs[meta.ref.k].nodeValue = String(window.screen.colorDepth);
    refs[meta.ref.l].nodeValue = supportsTouch ? "Yes" : "No";
  };

  update();
  window.onresize = update;

  return root;
};
