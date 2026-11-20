import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { serve } from "bun";

const staticRoot = resolve(import.meta.dir, "dist");
const indexPath = resolve(staticRoot, "index.html");

const server = serve({
  hostname: "0.0.0.0",
  port: Number(process.env.PORT ?? 3111),
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    const filePath = resolve(staticRoot, `.${pathname}`);
    if (
      filePath !== staticRoot &&
      !filePath.startsWith(`${staticRoot}${sep}`)
    ) {
      return new Response("Not Found", { status: 404 });
    }

    let responsePath = filePath;
    try {
      if (!(await stat(filePath)).isFile()) {
        responsePath = indexPath;
      }
    } catch {
      if (extname(pathname)) {
        return new Response("Not Found", { status: 404 });
      }
      responsePath = indexPath;
    }

    const responseFile = Bun.file(responsePath);
    if (!(await responseFile.exists())) {
      return new Response("Not Found", { status: 404 });
    }

    return new Response(request.method === "HEAD" ? null : responseFile, {
      headers: {
        "Cache-Control":
          responsePath === indexPath
            ? "no-cache"
            : "public, max-age=31536000, immutable",
        "Content-Type": responseFile.type,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    });
  },
});

console.log(`SPA server listening on ${server.url}`);
