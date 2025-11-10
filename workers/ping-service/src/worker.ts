export default {
  async scheduled(_controller, env, _ctx) {
    await fetch(`${process.env.BUGBOX_API_ENDPOINT}/${env.BUGBOX_API_KEY}/ping`, {
      method: "POST",
      keepalive: true,
      mode: "no-cors",
      headers: {
        referer: env.BUGBOX_REFERRER,
      },
    }).catch((error: unknown) => {
      // Capture error to avoid process termination due to unhandled rejection.
      // oxlint-disable-next-line no-console
      console.error(error);
    });
  },
} satisfies ExportedHandler<Env>;
