import { createServer } from "node:http";
import { createReadStream, statSync, realpathSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { createOnlineServer } from "./http.ts";
import {
  production,
  publicOrigin,
  securityHeaders,
  validateProductionConfig,
} from "./security.ts";
validateProductionConfig();
process.umask(0o077);
const online = createOnlineServer(),
  root = resolve("dist");
const types: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".glb": "model/gltf-binary",
  ".bin": "application/octet-stream",
};
if (!statSync(resolve(root, "index.html")).isFile())
  throw new Error("Run npm run build before starting the server.");
const server = createServer(
  {
    maxHeaderSize: 8192,
    headersTimeout: 10000,
    requestTimeout: 15000,
    keepAliveTimeout: 5000,
    connectionsCheckingInterval: 1000,
  },
  async (req, res) => {
    securityHeaders(res);
    try {
      if (production && req.headers.host !== new URL(publicOrigin!).host) {
        res.writeHead(421);
        res.end("Unknown host");
        return;
      }
      if (await online.handle(req, res)) return;
    } catch {
      if (res.headersSent) res.destroy();
      else {
        res.writeHead(500);
        res.end("Request failed");
      }
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    res.setTimeout(30000, () => res.destroy());
    try {
      let path = resolve(
        root,
        "." +
          decodeURIComponent(
            new URL(req.url ?? "/", "http://localhost").pathname,
          ),
      );
      if (!path.startsWith(root + sep) && path !== root) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (path === root) path = resolve(root, "index.html");
      if (
        path
          .slice(root.length)
          .split(sep)
          .some((part) => part.startsWith(".")) ||
        !realpathSync(path).startsWith(realpathSync(root) + sep)
      ) {
        res.writeHead(403);
        res.end();
        return;
      }
      const stat = statSync(path);
      if (!stat.isFile()) throw new Error("Not a file");
      if (stat.size === 0) {
        res.writeHead(200, { "Content-Length": 0 });
        res.end();
        return;
      }
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      const start = range ? Number(range[1]) : 0,
        end =
          range && range[2]
            ? Math.min(Number(range[2]), stat.size - 1)
            : stat.size - 1;
      if (start > end || start >= stat.size) {
        res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
        res.end();
        return;
      }
      res.writeHead(range ? 206 : 200, {
        "Content-Type": types[extname(path)] ?? "application/octet-stream",
        "Content-Length": end - start + 1,
        "Accept-Ranges": "bytes",
        "X-Content-Type-Options": "nosniff",
        ...(range
          ? { "Content-Range": `bytes ${start}-${end}/${stat.size}` }
          : {}),
      });
      if (req.method === "HEAD") res.end();
      else
        createReadStream(path, { start, end })
          .on("error", () => res.destroy())
          .pipe(res);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  },
);
server.maxConnections = 512;
server.maxHeadersCount = 64;
server.maxRequestsPerSocket = 1000;
server.listen(
  Number(process.env.PORT ?? 3000),
  process.env.HOST ?? "127.0.0.1",
  () =>
    console.log(
      `Sponge City server ready on port ${(server.address() as { port: number }).port}`,
    ),
);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => {
    setTimeout(() => process.exit(0), 10000).unref();
    server.close(() => process.exit(0));
    online.close();
    server.closeIdleConnections();
  });
