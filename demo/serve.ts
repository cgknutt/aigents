// a tiny static server for the demo page (and for filming it)
const root = new URL(".", import.meta.url).pathname;
const port = Number(process.env.PORT ?? 4830);
Bun.serve({ port, fetch(req) { const p = new URL(req.url).pathname; return new Response(Bun.file(root + (p === "/" ? "index.html" : p))); } });
console.log(`aigents demo: http://localhost:${port}`);
