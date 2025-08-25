import type { meta, send } from "bugbox";
import type { ONCLICK } from "stage1/fast";

declare module "bun" {
  interface Env {
    readonly ENV: "production" | "development" | "testing";
    readonly APP_RELEASE: string;

    readonly FRONTEND_APP_ORIGIN: string;
    readonly FRONTEND_APP_API_ENDPOINT: string;
    readonly FRONTEND_BUGBOX_API_KEY: string;
  }
}

declare global {
  interface HTMLElement {
    /** `stage1` synthetic click event handler. */
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    [ONCLICK]?(event: MouseEvent): false | void | Promise<void>;
  }

  interface Window {
    /** Injected by bugbox.js CDN script in HTML. */
    readonly bugbox?: {
      readonly meta: typeof meta;
      readonly send: typeof send;
    };
  }

  // oxlint-disable-next-line no-var, vars-on-top
  var bugbox: Window["bugbox"];
}
