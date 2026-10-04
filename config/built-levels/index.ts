import type { LevelLineup, LibraryLevel } from "../../src/interfaces";

/**
 * Shared level library: one JSON file per level in ./library and the stage and
 * endless choices in ./lineup.json. The dev-only level builder writes them
 * (vite.config.ts); commit and push them to share levels with the team.
 */
function readJsonFiles(): Record<string, unknown> {
  // Vite (browser and dev server) bundles the files; plain Node reads them from disk.
  if (import.meta.env)
    return {
      ...import.meta.glob("./library/*.json", {
        eager: true,
        import: "default",
      }),
      ...import.meta.glob("./lineup.json", { eager: true, import: "default" }),
    };
  const fs = process.getBuiltinModule("node:fs");
  const files: Record<string, unknown> = {};
  const read = (path: string) =>
    JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
  const folder = new URL("./library/", import.meta.url);
  for (const name of fs.readdirSync(folder).sort())
    if (name.endsWith(".json"))
      files[`./library/${name}`] = read(`./library/${name}`);
  if (fs.existsSync(new URL("./lineup.json", import.meta.url)))
    files["./lineup.json"] = read("./lineup.json");
  return files;
}

const files = readJsonFiles();

/** Saved builder levels by id; the builder updates it in place after a save. */
export const levelLibrary: Record<string, LibraryLevel> = Object.fromEntries(
  Object.entries(files)
    .filter(([path]) => path.startsWith("./library/"))
    .map(([, level]) => [(level as LibraryLevel).id, level as LibraryLevel]),
);

const savedLineup = files["./lineup.json"] as Partial<LevelLineup> | undefined;
/** Stage choices and endless switches; the builder updates it in place after a save. */
export const levelLineup: LevelLineup = {
  stages: { ...savedLineup?.stages },
  endlessOff: [...(savedLineup?.endlessOff ?? [])],
};

// Saves and `git pull` update the running game in place instead of reloading the page.
if (import.meta.hot)
  import.meta.hot.accept((next) => {
    if (!next) return;
    for (const id of Object.keys(levelLibrary)) delete levelLibrary[id];
    Object.assign(levelLibrary, next.levelLibrary);
    Object.assign(levelLineup, next.levelLineup);
  });
