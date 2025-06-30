declare module "bun" {
  interface Env {
    readonly APP_RELEASE: string;
    readonly FRONTEND_BUGBOX_API_KEY: string;
  }
}
