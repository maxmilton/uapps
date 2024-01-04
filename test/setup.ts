import { expect } from 'bun:test';
import { GlobalWindow, type Window } from 'happy-dom';

declare global {
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

const noop = () => {};

function setupDOM() {
  const dom = new GlobalWindow({
    // TODO: Decide if we want to use the virtual console or not
    //  ↳ https://github.com/capricorn86/happy-dom/wiki/Virtual-Console
    // console: global.console,
  });
  global.happyDOM = dom.happyDOM;
  // @ts-expect-error - happy-dom only implements a subset of the DOM API
  global.window = dom.window.document.defaultView;
  global.document = window.document;
  global.console = window.console;
  global.setTimeout = window.setTimeout;
  global.clearTimeout = window.clearTimeout;
  global.DocumentFragment = window.DocumentFragment;
  global.CSSStyleSheet = window.CSSStyleSheet;
  global.Text = window.Text;
  global.fetch = window.fetch;
}

function setupMocks(): void {
  // @ts-expect-error - noop stub
  global.performance.mark = noop;
  // @ts-expect-error - noop stub
  global.performance.measure = noop;
}

export function reset(): void {
  setupDOM();
  setupMocks();
}

reset();
