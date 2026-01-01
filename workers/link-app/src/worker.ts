export default {
  async fetch(request, env, ctx): Promise<Response> {
    // const url = new URL(request.url);
    // switch (url.pathname) {
    //   case "/message":
    //     return new Response("Hello, World!");
    //   case "/random":
    //     return new Response(crypto.randomUUID());
    //   default:
    //     return new Response("Not Found", { status: 404 });
    // }

    const url = new URL(request.url);
    const path = url.pathname;

    if (
      request.method === "GET"
      && path.length === "/api/link/XXXXXX".length // Short URL token is 6 characters long
      && path.startsWith("/api/link/")
    ) {
      const short = path.slice(11);
    } else if (request.method === "POST" && path === "/api/link") {
      // extract short and url from request body
      const { short, url } = await request.json();
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
