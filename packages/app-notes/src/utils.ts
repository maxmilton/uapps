import type { Session } from '@supabase/supabase-js';
import { prepend } from 'stage1';
import { Nav } from './components/Nav';
import { routeTo } from './router';
import { supabase } from './supabase';

type Handler<T, K extends keyof T> = (value: T[K], prev: T[K]) => any;
type Handlers<T> = Record<keyof T, Handler<T, keyof T>[]>;
type StoreOn<T> = <K extends keyof T>(key: K, callback: Handler<T, K>) => void;
type StoreOff<T> = <K extends keyof T>(key: K, callback: Handler<T, K>) => void;

export function store<T extends Record<string, any>>(
  initialState: T,
): T & { on: StoreOn<T>; off: StoreOff<T> } {
  const handlers = {} as Handlers<T>;

  const proxy = new Proxy(initialState, {
    set(target, property, value, receiver) {
      if (typeof property === 'string' && handlers[property]) {
        for (const listener of handlers[property]) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          listener(value, target[property]);
        }
      }
      return Reflect.set(target, property, value, receiver);
    },
  }) as T & { on: StoreOn<T>; off: StoreOff<T> };

  proxy.on = (property, callback) => {
    // @ts-expect-error- FIXME:!
    (handlers[property] ??= []).push(callback);
  };
  proxy.off = (property, callback) => {
    // @ts-expect-error- FIXME:!
    // eslint-disable-next-line no-bitwise
    handlers[property]?.splice(handlers[property].indexOf(callback) >>> 0, 1);
  };

  // Object.defineProperties(proxy, {
  //   on: {
  //     value: (property, callback) => {
  //       (handlers[property] ??= []).push(callback);
  //     },
  //   },
  //   off: {
  //     value: (property, callback) => {
  //       handlers[property]?.splice(
  //         handlers[property].indexOf(callback) >>> 0,
  //         1,
  //       );
  //     },
  //   },
  // });

  return proxy;
}

export const state = store({
  session: null as Session | null,
});

let navComponent: HTMLElement;

state.on('session', (session) => {
  if (!session) {
    routeTo('/login');
    navComponent?.remove();
  } else {
    navComponent ??= prepend(Nav(), document.body);
  }
});

const listener = supabase.auth.onAuthStateChange((_type, session) => {
  state.session = session;
});

if (listener.error) {
  // eslint-disable-next-line no-console
  console.error(listener.error);
}
