import { defineConfig, type PreviewServer, type ViteDevServer } from "vite";
import { createOnlineServer } from "./server/http.ts";
/** Both developer and production-build previews need the same account API. */
function attachOnline(server: ViteDevServer | PreviewServer): void {
  const online = createOnlineServer();
  server.middlewares.use((req, res, next) => {
    void online
      .handle(req, res)
      .then((handled) => {
        if (!handled) next();
      })
      .catch(next);
  });
  server.httpServer?.once("close", () => online.close());
}
export default defineConfig({
  plugins: [
    {
      name: "sponge-online",
      configureServer: attachOnline,
      configurePreviewServer: attachOnline,
    },
  ],
});
