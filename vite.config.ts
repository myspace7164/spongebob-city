import { defineConfig } from "vite";
import { createOnlineServer } from "./server/http";
export default defineConfig({
  plugins: [
    {
      name: "sponge-online",
      configureServer(server) {
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
      },
    },
  ],
});
