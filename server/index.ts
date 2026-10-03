import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { createOnlineServer } from "./http";
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
const server = createServer(async (req, res) => {
  if (await online.handle(req, res)) return;
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end();
    return;
  }
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
    const stat = statSync(path);
    if (!stat.isFile()) throw new Error("Not a file");
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
});
server.listen(Number(process.env.PORT ?? 3000), "0.0.0.0", () =>
  console.log("Sponge City server ready"),
);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => {
    online.close();
    server.close(() => process.exit(0));
  });
