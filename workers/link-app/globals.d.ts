import type { meta, send } from 'bugbox';
import type { report } from 'bugbox/bugreport';
import type { ONCLICK } from 'stage1/fast';

declare module 'bun' {
  interface Env {
    readonly APP_RELEASE: string;

    readonly FRONTEND_APP_ORIGIN: string;
    readonly FRONTEND_APP_API_ENDPOINT: string;
  }
}

declare global {
  interface HTMLElement {
    /** `stage1` synthetic click event handler. */
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    [ONCLICK]?(event: MouseEvent): false | void | Promise<void>;
  }

  interface Window {
    /** Injected by bugbox.js script in HTML. */
    readonly bugbox?: {
      readonly meta: typeof meta;
      readonly send: typeof send;
      readonly report: typeof report;
    };
  }

  let bugbox: Window['bugbox'];
}
