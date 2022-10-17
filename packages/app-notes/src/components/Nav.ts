import './Nav.xcss';

import { html } from 'stage1';
import { supabase } from '../supabase';

type NavComponent = HTMLElement;
type Refs = {
  toggle: HTMLButtonElement;
  subnav: HTMLDivElement;
  logout: HTMLButtonElement;
};

const view = html`
  <nav class="con dfc mb3">
    <a href="/" class="fsn">
      <img src="/favicon.svg" id="logo" alt="Notes" />
    </a>
    <a href="/" class="nav-item dn! ns-dib!">Notes</a>
    <a href="/?view=trash" class="nav-item">Trash</a>

    <div class="pos-r ml-auto">
    <button class="button-subnav button-clear nav-item" title="Show submenu" #toggle>
      <svg class="icon icon-user" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="10" r="3"/>
        <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855"/>
      </svg>
    </button>
    <div id="subnav" class="pos-a r0" hidden #subnav>
      <a href="/import" class="nav-item">Import</a>
      <a href=/stats class="nav-item">Stats</a>
      <button class="button-clear nav-item wsn" #logout>Sign out</button>
    </div>
  </div>
  </nav>
`;

export function Nav(): NavComponent {
  const root = view.cloneNode(true) as NavComponent;
  const refs = view.collect<Refs>(root);
  let hideSubnav = true;

  refs.toggle.__click = () => {
    hideSubnav = !hideSubnav;
    refs.subnav.hidden = hideSubnav;

    if (!hideSubnav) {
      document.addEventListener(
        'click',
        () => {
          hideSubnav = true;
          refs.subnav.hidden = true;
        },
        { once: true },
      );
    }
  };

  refs.logout.__click = async () => {
    try {
      const res = await supabase.auth.signOut();
      if (res.error) {
        throw new Error(res.error.message);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      // append(Alert(error), refs.feedback);
    }
  };

  // TODO: Remove?
  const updateActive = () => {
    for (const menuItem of root.querySelectorAll('.nav-item')) {
      if (
        (menuItem as HTMLAnchorElement).href
        === window.location.origin + window.location.hash.slice(1)
      ) {
        menuItem.setAttribute('aria-current', 'page');
      } else {
        menuItem.removeAttribute('aria-current');
      }
    }
  };
  window.addEventListener('hashchange', updateActive);
  updateActive();

  return root;
}
