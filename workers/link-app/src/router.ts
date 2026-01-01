import { append, create } from "stage1/fast";
import { Status } from "#net.ts";
import HomePage from "#pages/home.ts";
import LinkPage from "#pages/link.ts";
import { AppError } from "#utils.ts";

const STUB_BASE_URL = "http://x";

export const navigateTo = (url: string): void => {
  location.hash = url;
};

// https://github.com/lukeed/navaid/blob/master/src/index.js#L52
export const handleRouteClick = (event: MouseEvent): void => {
  if (
    event.ctrlKey
    || event.metaKey
    || event.altKey
    || event.shiftKey
    || event.button
    || event.defaultPrevented
  ) {
    return;
  }

  const link = (event.target as Element).closest("a");
  const href = link?.getAttribute("href");

  if (!href || link!.target || link!.host !== location.host || href[0] === "#") {
    return;
  }

  event.preventDefault();
  navigateTo(href);
};

type RouterComponent = HTMLElement;

export const Router = (): RouterComponent => {
  const root = create("main");

  const handleHashChange = () => {
    const url = new URL(location.hash.slice(1), STUB_BASE_URL);
    const path = url.pathname;

    root.textContent = "";

    if (path === "/") {
      append(HomePage(), root);
    } else if (path.length === 23) {
      append(LinkPage(path.slice(1)), root);
    } else {
      throw new AppError("Not Found", Status.NOT_FOUND);
    }
  };

  window.onhashchange = handleHashChange;
  handleHashChange();

  return root;
};
