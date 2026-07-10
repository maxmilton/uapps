export default {
  async scheduled(_controller, env, _ctx) {
    await fetch(`${process.env.BUGBOX_API_ENDPOINT}/${await env.BUGBOX_API_KEY.get()}/ping`, {
      method: "POST",
      keepalive: true,
      mode: "no-cors",
      headers: {
        referer: await env.BUGBOX_REFERRER.get(),
      },
      // eslint-disable-next-line unicorn/prefer-await
    }).catch((error: unknown) => {
      // Capture error to avoid process termination due to unhandled rejection.
      // oxlint-disable-next-line no-console
      console.error(error);
    });
  },
} satisfies ExportedHandler<Env>;
