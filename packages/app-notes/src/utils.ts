import type { Session } from '@supabase/supabase-js';
import { prepend } from 'stage1';
import { store } from 'stage1/store';
import { Nav } from './components/Nav';
import { routeTo } from './router';
import { supabase } from './supabase';

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
