import "./index.xcss";

import { append, fragment, handleClick, ONCLICK } from "stage1/fast";
import { Footer } from "#components/Footer.ts";
import { Status } from "#net.ts";
import ErrorPage from "#pages/error.ts";
import { handleRouteClick, Router } from "#router.ts";
import { AppError } from "#utils.ts";

function renderErrorPage(error: unknown) {
  if (!(error instanceof AppError) || error.code !== Status.NOT_FOUND) {
    window.history.pushState(null, "", "/error");
  }

  // The app has a single <main> element used as the router root
  const main = document.querySelector("main");
  if (main) {
    // render within router root
    main.textContent = "";
    append(ErrorPage(error), main);
  } else {
    // router not loaded yet, render full page
    document.body.textContent = "";
    append(ErrorPage(error), document.body);
    append(Footer(), document.body);
  }
}

window.addEventListener("error", (event) => {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  renderErrorPage(event.error || event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  renderErrorPage(event.reason);
});

const container = fragment();
append(Router(), container);
append(Footer(), container);
append(container, document.body);

document.body[ONCLICK] = handleRouteClick;
document.onclick = handleClick;
