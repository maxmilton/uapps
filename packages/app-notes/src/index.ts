import './index.xcss';

import { append, createFragment, setupSyntheticEvent } from 'stage1';
import type * as trackx from 'trackx/modern';
import { Footer } from './components/Footer';
import { ImportPage } from './pages/import';
import { LoginPage } from './pages/login';
import { NotesPage } from './pages/notes';
import { StatsPage } from './pages/stats';
import { Router, handleClick, routeTo, type Route } from './router';
import { supabase } from './supabase';

declare global {
  interface HTMLElement {
    /** `stage1` synthetic click event handler. */
    __click?(event: MouseEvent): void | Promise<void>;
  }
  interface Window {
    // Injected via CDN script in HTML
    trackx?: typeof trackx;
  }
}

// Set dynamic meta data within the app bundle rather than the HTML file so the
// inline <script> code is static and we can use a constant CSP hash
if (window.trackx) {
  window.trackx.meta.release = process.env.APP_VERSION;

  if (process.env.NODE_ENV !== 'production') {
    window.trackx.meta.NODE_ENV = process.env.NODE_ENV || 'NULL';
  }
}

const routes = new Map<string, Route>([
  ['/', NotesPage],
  ['/login', LoginPage],
  ['/import', ImportPage],
  ['/stats', StatsPage],
]);

const frag = createFragment();

const router = append(Router(routes), frag);
append(Footer(), frag);
append(frag, document.body);

document.body.__click = handleClick;
setupSyntheticEvent('click');

if (!supabase.auth.session()) {
  if (window.location.hash === '#/login') {
    router.update();
  } else {
    routeTo('/login');
  }
} else if (window.location.hash === '#/login') {
  routeTo('/');
} else {
  router.update();
}
