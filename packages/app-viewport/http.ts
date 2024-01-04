/* eslint-disable no-console, prefer-template */

const server = Bun.serve({
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    console.write(req.method + ' ' + path + url.search + '\n');
    return new Response(
      Bun.file('dist' + (path === '/' ? '/index.html' : path)),
    );
  },
});

console.info('listening on', server.url.origin);
