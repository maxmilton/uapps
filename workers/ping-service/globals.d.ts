declare module "bun" {
  interface Env {
    readonly APP_RELEASE: string;
    readonly BUGBOX_API_ENDPOINT: string;
  }
}

// declare global {
//   // var global: typeof globalThis;
//   var process: Env & NodeJS.ProcessEnv & ImportMetaEnv;

// interface ProcessEnv {
//   readonly APP_RELEASE: string;
//   readonly BUGBOX_API_ENDPOINT: string;
// }

// declare global {
//   // var process: Env & NodeJS.ProcessEnv & ImportMetaEnv;
//   var process: ProcessEnv;
// }
