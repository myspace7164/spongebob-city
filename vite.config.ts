import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import type { IncomingMessage } from "node:http";
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

const builtLevelsDirectory = fileURLToPath(
  new URL("./config/built-levels/", import.meta.url),
);
const libraryDirectory = join(builtLevelsDirectory, "library");
const historyDirectory = join(builtLevelsDirectory, "history");
const lineupFile = join(builtLevelsDirectory, "lineup.json");

type LibraryLevel = import("./src/interfaces.ts").LibraryLevel;
type LevelLineup = import("./src/interfaces.ts").LevelLineup;

interface LevelVersion {
  id: string;
  savedAt: string;
  level: LibraryLevel | null;
}

const libraryFile = (id: string) => join(libraryDirectory, `${id}.json`);
const historyFile = (id: string) => join(historyDirectory, `${id}.json`);
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";

function readJson<T>(path: string, missing: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return missing;
    throw error;
  }
}

function writeAtomically(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, contents);
  renameSync(temporary, path);
}

function readLibrary(): LibraryLevel[] {
  mkdirSync(libraryDirectory, { recursive: true });
  return readdirSync(libraryDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => readJson<LibraryLevel>(join(libraryDirectory, name), null!));
}

const readLineup = () =>
  readJson<LevelLineup>(lineupFile, { stages: {}, endlessOff: [] });

/** Keep the state a library file is about to lose, newest first, at most 30. */
function rememberPrevious(id: string): void {
  const history = readJson<LevelVersion[]>(historyFile(id), []);
  history.unshift({
    id: randomUUID(),
    savedAt: new Date().toISOString(),
    level: readJson<LibraryLevel | null>(libraryFile(id), null),
  });
  history.length = Math.min(history.length, 30);
  writeAtomically(historyFile(id), json(history));
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 200_000) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid request"));
      }
    });
  });
}

/**
 * Dev-server only: the level builder saves library levels and the lineup
 * here (config/built-levels). Replaced library states are kept in
 * config/built-levels/history so they can be restored. Production builds
 * have no such endpoint.
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
        void (async () => {
          try {
            // Loaded through Vite so the TypeScript helpers and levels resolve as in the game.
            const { cityLevels } =
              await server.ssrLoadModule("/config/levels.ts");
            const builder = await server.ssrLoadModule(
              "/src/game/level-builder.ts",
            );
            const levelIds: string[] = cityLevels.map(
              (l: { id: string }) => l.id,
            );
            const knownId = (id: unknown): string => {
              if (
                typeof id !== "string" ||
                !readLibrary().some((level) => level.id === id)
              )
                throw new Error("Unknown library level");
              return id;
            };
            let result: unknown;
            if (req.method === "GET" && route === "/__level-builder/library")
              result = { levels: readLibrary(), lineup: readLineup() };
            else if (
              req.method === "GET" &&
              route === "/__level-builder/history"
            ) {
              const id = knownId(url.searchParams.get("id"));
              result = {
                versions: readJson<LevelVersion[]>(historyFile(id), []).map(
                  ({ id, savedAt, level }) => ({
                    id,
                    savedAt,
                    location: level?.location ?? null,
                    author: level?.author ?? null,
                  }),
                ),
              };
            } else if (req.method !== "POST")
              throw new Error("Unsupported level builder request");
            else {
              const request = (await readBody(req)) as Record<string, unknown>;
              if (route === "/__level-builder/library") {
                const level = builder.validateLibraryLevel(
                  request.level,
                  levelIds,
                  new Date().toISOString(),
                ) as LibraryLevel;
                if (existsSync(libraryFile(level.id)))
                  rememberPrevious(level.id);
                writeAtomically(libraryFile(level.id), json(level));
                result = { level };
              } else if (route === "/__level-builder/library/delete") {
                const id = knownId(request.id);
                rememberPrevious(id);
                rmSync(libraryFile(id));
                const lineup = readLineup();
                for (const [stage, chosen] of Object.entries(lineup.stages))
                  if (chosen === id) delete lineup.stages[stage];
                lineup.endlessOff = lineup.endlessOff.filter(
                  (entry) => entry !== `library:${id}`,
                );
                writeAtomically(lineupFile, json(lineup));
                result = { lineup };
              } else if (route === "/__level-builder/lineup") {
                const lineup = builder.validateLineup(
                  request.lineup,
                  levelIds,
                  readLibrary().map((level) => level.id),
                ) as LevelLineup;
                writeAtomically(lineupFile, json(lineup));
                result = { lineup };
              } else if (route === "/__level-builder/restore") {
                const id = knownId(request.id);
                const version = readJson<LevelVersion[]>(
                  historyFile(id),
                  [],
                ).find((entry) => entry.id === request.versionId);
                if (!version?.level) throw new Error("Saved version not found");
                rememberPrevious(id);
                writeAtomically(libraryFile(id), json(version.level));
                result = { level: version.level };
              } else throw new Error("Unsupported level builder request");
            }
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
          } catch (error) {
            res.statusCode = 400;
            res.end(error instanceof Error ? error.message : "Invalid request");
          }
        })();
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
