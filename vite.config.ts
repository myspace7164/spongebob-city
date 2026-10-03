import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  defineConfig,
  type Plugin,
  type PreviewServer,
  type ViteDevServer,
} from "vite";
import { createOnlineServer } from "./server/http.ts";

const levelFile = fileURLToPath(
  new URL("./config/built-levels/index.ts", import.meta.url),
);
const historyDirectory = fileURLToPath(
  new URL("./config/built-levels/history/", import.meta.url),
);

interface LevelVersion {
  id: string;
  savedAt: string;
  level: import("./src/interfaces.ts").BuiltLevel | null;
}

function historyFile(levelId: string): string {
  return join(historyDirectory, `${levelId}.json`);
}

function readHistory(levelId: string): LevelVersion[] {
  try {
    return JSON.parse(
      readFileSync(historyFile(levelId), "utf8"),
    ) as LevelVersion[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function writeAtomically(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, contents);
  renameSync(temporary, path);
}

function remember(level: import("./src/interfaces.ts").BuiltLevel | null) {
  return { id: randomUUID(), savedAt: new Date().toISOString(), level };
}

/**
 * Dev-server only: the level builder applies a validated draft here. Previous
 * states are kept in config/built-levels/history so they can be restored.
 * Production builds have no such endpoint.
 */
function levelBuilderSave(): Plugin {
  return {
    name: "level-builder-save",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const route = url.pathname;
        if (!route.startsWith("/__level-builder/")) return next();
        if (route === "/__level-builder/history" && req.method === "GET") {
          void (async () => {
            try {
              const { cityLevels } =
                await server.ssrLoadModule("/config/levels.ts");
              const levelId = url.searchParams.get("levelId");
              if (!cityLevels.some((l: { id: string }) => l.id === levelId))
                throw new Error("Unknown level");
              const versions = readHistory(levelId!).map(
                ({ id, savedAt, level }) => ({
                  id,
                  savedAt,
                  location: level?.location ?? null,
                }),
              );
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ versions }));
            } catch (error) {
              res.statusCode = 400;
              res.end(
                error instanceof Error ? error.message : "Invalid request",
              );
            }
          })();
          return;
        }
        if (
          !["/__level-builder/apply", "/__level-builder/restore"].includes(
            route,
          ) ||
          req.method !== "POST"
        ) {
          res.statusCode = 405;
          res.end("Unsupported level builder request");
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 200_000) {
            res.statusCode = 413;
            res.end("Request too large");
            req.destroy();
          }
        });
        req.on("end", async () => {
          try {
            // Loaded through Vite so the TypeScript helpers and levels resolve as in the game.
            const { cityLevels } =
              await server.ssrLoadModule("/config/levels.ts");
            const builder = await server.ssrLoadModule(
              "/src/game/level-builder.ts",
            );
            const request = JSON.parse(body);
            const { levelId } = request;
            const ids = cityLevels.map((l: { id: string }) => l.id);
            if (typeof levelId !== "string" || !ids.includes(levelId))
              throw new Error("Unknown level");
            const levels = builder.parseLevelFile(
              readFileSync(levelFile, "utf8"),
            );
            const history = readHistory(levelId);
            if (route === "/__level-builder/apply") {
              const level = builder.validateBuiltLevel(
                levelId,
                request.level,
                ids,
              );
              history.unshift(remember(levels[levelId] ?? null));
              history.length = Math.min(history.length, 30);
              writeAtomically(
                historyFile(levelId),
                JSON.stringify(history, null, 2) + "\n",
              );
              levels[levelId] = level;
            } else {
              if (typeof request.versionId !== "string")
                throw new Error("Choose a saved version");
              const version = history.find(
                (entry) => entry.id === request.versionId,
              );
              if (!version) throw new Error("Saved version not found");
              history.unshift(remember(levels[levelId] ?? null));
              history.length = Math.min(history.length, 30);
              writeAtomically(
                historyFile(levelId),
                JSON.stringify(history, null, 2) + "\n",
              );
              if (version.level) levels[levelId] = version.level;
              else delete levels[levelId];
            }
            writeAtomically(levelFile, builder.levelFileSource(levels));
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
    levelBuilderSave(),
  ],
});
