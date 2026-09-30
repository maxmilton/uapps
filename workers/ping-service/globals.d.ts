declare module "bun" {
  interface Env {
    readonly APP_RELEASE: string;
    readonly BUGBOX_API_ENDPOINT: string;
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly CI?: string;
    }
  }
}
