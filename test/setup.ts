import { expect } from 'bun:test';
import { GlobalWindow, type Window } from 'happy-dom';

declare global {
  /** Real bun console. `console` is mapped to happy-dom's virtual console. */
  // eslint-disable-next-line no-var, vars-on-top
  var console2: Console;
  // eslint-disable-next-line no-var, vars-on-top
  var happyDOM: Window['happyDOM'];
}

declare module 'bun:test' {
  interface Matchers {
    /** Asserts that a value is a plain `object`. */
    toBePlainObject(): void;
  }
}

expect.extend({
  // XXX: Although bun has a `toBeObject` matcher, it's not as useful since it
  // doesn't check for plain objects.
  toBePlainObject(received: unknown) {
    return Object.prototype.toString.call(received) === '[object Object]'
      ? { pass: true }
      : {
          pass: false,
          message: () => `expected ${String(received)} to be a plain object`,
        };
  },
});

const originalConsole = global.console;
const noop = () => {};

function setupDOM() {
  const dom = new GlobalWindow({
    // TODO: Decide if we want to use the virtual console or not
    //  ↳ https://github.com/capricorn86/happy-dom/wiki/Virtual-Console
    // console: global.console,
  });
  global.happyDOM = dom.happyDOM;
  global.console2 = originalConsole;
  // @ts-expect-error - happy-dom only implements a subset of the DOM API
  global.window = dom.window.document.defaultView;
  global.document = window.document;
  global.console = window.console;
  global.fetch = window.fetch;
  global.setTimeout = window.setTimeout;
  global.clearTimeout = window.clearTimeout;
  global.DocumentFragment = window.DocumentFragment;
  global.CSSStyleSheet = window.CSSStyleSheet;
  global.Text = window.Text;
}

function setupMocks(): void {
  // @ts-expect-error - noop stub
  global.performance.mark = noop;
  // @ts-expect-error - noop stub
  global.performance.measure = noop;

  global.devicePixelRatio = 1;
}

export async function reset(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (global.happyDOM) {
    await happyDOM.abort();
    window.close();
  }

  setupDOM();
  setupMocks();
}

await reset();
