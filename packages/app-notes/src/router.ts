import { append, create, h } from 'stage1';

const FAKE_BASE_URL = 'http://x';

export function routeTo(url: string): void {
  window.location.hash = url;
}

// https://github.com/lukeed/navaid/blob/master/src/index.js#L52
export function handleClick(event: MouseEvent): void {
  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey ||
    event.button ||
    event.defaultPrevented
  ) {
    return;
  }

  const link = (event.target as HTMLElement).closest('a');
  const href = link && link.getAttribute('href');

  if (
    !href ||
    link.target ||
    link.host !== window.location.host ||
    href[0] === '#'
  ) {
    return;
  }

  event.preventDefault();
  routeTo(href);
}

function on404() {
  // eslint-disable-next-line no-console
  console.error('Route not found');
  return h('<p class=con>Page Not Found - <a href=/>Go home</a><p>');
}

type RouterComponent = HTMLDivElement & { update: () => void };
export type Route = (params: URLSearchParams) => Element;
type Routes = Map<string, Route>;

export function Router(routes: Routes): RouterComponent {
  const root = create('div') as RouterComponent;

  const update = () => {
    const url = new URL(window.location.hash.slice(1), FAKE_BASE_URL);
    const page = routes.get(url.pathname);

    root.textContent = '';
    append((page || on404)(url.searchParams), root);
  };

  window.onhashchange = update;
  root.update = update;

  return root;
}
