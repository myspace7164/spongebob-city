import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { createOnlineServer } from "./server/http";

const levelFile = fileURLToPath(
  new URL("./config/built-levels/index.ts", import.meta.url),
);

/**
 * Dev-server only: the level builder (VITE_LEVEL_BUILDER=1 or ?builder) posts a
 * level here; it is validated and written into config/built-levels/index.ts.
 * Production builds have no such endpoint.
 */
function levelBuilderSave(): Plugin {
  return {
    name: "level-builder-save",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__level-builder/save", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("POST only");
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 200_000) req.destroy();
        });
        req.on("end", async () => {
          try {
            // Loaded through Vite so the TypeScript helpers and levels resolve as in the game.
            const { cityLevels } =
              await server.ssrLoadModule("/config/levels.ts");
            const builder = await server.ssrLoadModule(
              "/src/game/level-builder.ts",
            );
            const { levelId, level } = JSON.parse(body);
            const ids = cityLevels.map((l: { id: string }) => l.id);
            const levels = builder.parseLevelFile(
              readFileSync(levelFile, "utf8"),
            );
            levels[levelId] = builder.validateBuiltLevel(levelId, level, ids);
            writeFileSync(levelFile, builder.levelFileSource(levels));
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ saved: levelId }));
          } catch (error) {
            res.statusCode = 400;
            res.end(error instanceof Error ? error.message : "Invalid level");
          }
        });
      });
    },
  };
}

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
    levelBuilderSave(),
  ],
});
