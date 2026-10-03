import assert from "node:assert/strict";
import test from "node:test";
import { cityLevels, riehenringSite } from "../config/levels.ts";
import { readFileSync } from "node:fs";
import {
  areaBounds,
  cleanLocation,
  imageToMap,
  mapToImage,
  mapToWorld,
  nearestStreet,
  unionBounds,
  autoBounds,
  checkLayout,
  levelFileSource,
  mapToPlay,
  parseLevelFile,
  siteFromView,
  spotBuilds,
  validateBuiltLevel,
} from "../src/game/level-builder.ts";
import { playToMap, sceneryPose, worldToMap } from "../src/game/streets.ts";
import type { LevelSpot, RoadNetwork } from "../src/interfaces.ts";

const ids = cityLevels.map((l) => l.id);
/** A 4 × 4 grid of spots 4 m apart, every one of `site`. */
const grid = (site: LevelSpot["site"], builds?: LevelSpot["builds"]) =>
  Array.from({ length: 16 }, (_, i) => ({
    x: (i % 4) * 5,
    z: -Math.floor(i / 4) * 5,
    site,
    ...(builds ? { builds } : {}),
  }));

test("map and play coordinates convert both ways for any site", () => {
  for (const site of [
    riehenringSite,
    siteFromView([120, -40], [0.6, -0.8], "Test"),
  ]) {
    const [mx, mz] = playToMap(site, 3, -17);
    const [x, z] = mapToPlay(site, mx, mz);
    assert.ok(Math.abs(x - 3) < 1e-6 && Math.abs(z + 17) < 1e-6);
  }
});

test("a site made from the view points play −Z where the camera looks", () => {
  const site = siteFromView([100, 200], [1, 0], "East");
  const [ax, az] = playToMap(site, 0, 0);
  const [bx, bz] = playToMap(site, 0, -10);
  assert.ok(Math.abs(ax - 100) < 1e-6 && Math.abs(az - 200) < 1e-6);
  assert.ok(Math.abs(bx - ax - 10) < 1e-3 && Math.abs(bz - az) < 1e-3);
});

test("bounds wrap the start and every spot's square with a margin", () => {
  const b = autoBounds([{ x: 10, z: -20, site: "verge" }], [0, 0], 8);
  // Squares are the game's 4.7 m tiles.
  assert.deepEqual(b, { minX: -8, maxX: 20.4, minZ: -30.3, maxZ: 8 });
});

test("per-spot techniques override the site type", () => {
  assert.deepEqual([...spotBuilds({ x: 0, z: 0, site: "parking" })], []);
  assert.deepEqual(
    spotBuilds({ x: 0, z: 0, site: "parking", builds: ["tank"] }),
    ["tank"],
  );
});

test("the layout check reports missing spots, overlaps and unreachable goals", () => {
  const level4 = cityLevels[3].goals;
  assert.ok(
    checkLayout(grid("swale").slice(0, 10), []).some((p) =>
      p.includes("6 more"),
    ),
  );
  const overlapping = grid("swale");
  overlapping[1] = { ...overlapping[0], x: overlapping[0].x + 1 };
  assert.ok(checkLayout(overlapping, []).some((p) => p.includes("overlap")));
  // Parking only: no tanks, ponds, roofs or shade for level 4.
  const parking = checkLayout(grid("parking"), level4);
  assert.ok(parking.some((p) => p.includes("tank")));
  assert.ok(parking.some((p) => p.includes("shade")));
  // Every technique on every spot: level 4 is reachable.
  const all = grid(undefined, [
    "tree",
    "basin",
    "roof",
    "pond",
    "shade",
    "tank",
  ]);
  assert.deepEqual(
    checkLayout(
      all.map((s) => ({ ...s, site: "swale" as const })),
      level4,
    ),
    [],
  );
});

test("validation accepts a complete level and rejects broken ones", () => {
  const level = {
    location: "Clarastrasse",
    site: { ...riehenringSite, start: [-5, -9] as [number, number] },
    spots: grid("verge"),
  };
  const ok = validateBuiltLevel("erlenmatt", level, ids);
  assert.equal(ok.spots.length, 16);
  assert.throws(() => validateBuiltLevel("nowhere", level, ids));
  assert.throws(() =>
    validateBuiltLevel(
      "erlenmatt",
      { ...level, spots: level.spots.slice(1) },
      ids,
    ),
  );
  assert.throws(() =>
    validateBuiltLevel(
      "erlenmatt",
      {
        ...level,
        spots: [...level.spots.slice(1), { x: NaN, z: 0, site: "verge" }],
      },
      ids,
    ),
  );
  assert.throws(() =>
    validateBuiltLevel(
      "erlenmatt",
      {
        ...level,
        spots: [
          ...level.spots.slice(1),
          { x: 0, z: 0, site: "verge", builds: ["karate"] },
        ],
      },
      ids,
    ),
  );
});

test("the saved file round-trips every level", () => {
  const level = validateBuiltLevel(
    "erlenmatt",
    {
      location: "Messeplatz",
      site: { ...riehenringSite, start: [0, 0] },
      spots: grid("swale", ["pond"]),
    },
    ids,
  );
  const source = levelFileSource({ erlenmatt: level });
  assert.deepEqual(parseLevelFile(source), { erlenmatt: level });
  assert.deepEqual(parseLevelFile(levelFileSource({})), {});
});

test("every level saved from the builder can still reach its goals", async () => {
  const { builtLevels } = await import("../config/built-levels/index.ts");
  for (const level of cityLevels)
    if (builtLevels[level.id]) {
      // The saved name and place reach the game.
      assert.equal(level.location, builtLevels[level.id].location);
      assert.equal(level.site, builtLevels[level.id].site);
    }
  for (const level of cityLevels)
    if (builtLevels[level.id])
      assert.deepEqual(
        checkLayout(builtLevels[level.id].spots, level.goals),
        [],
        level.id,
      );
});

test("names are cleaned and must have 1–40 characters", () => {
  assert.equal(cleanLocation("  Clara\nstrasse  "), "Clara strasse");
  assert.throws(() => cleanLocation("   "));
  assert.throws(() => cleanLocation("x".repeat(41)));
  assert.throws(() => cleanLocation(7));
  const level = {
    location: "  Messeplatz ",
    site: { ...riehenringSite, start: [0, 0] as [number, number] },
    spots: grid("verge"),
  };
  const saved = validateBuiltLevel("erlenmatt", level, ids);
  assert.equal(saved.location, "Messeplatz");
  assert.equal(saved.site.street, "Messeplatz");
  assert.throws(() =>
    validateBuiltLevel("erlenmatt", { ...level, location: "" }, ids),
  );
});

test("world, map and photo positions convert both ways", () => {
  const pose = { ...sceneryPose(riehenringSite), x: 12, z: -3 };
  const [wx, wz] = mapToWorld(pose, 400, -900);
  const [mx, mz] = worldToMap(pose, wx, wz);
  assert.ok(Math.abs(mx - 400) < 1e-6 && Math.abs(mz + 900) < 1e-6);
  const bounds: [number, number, number, number] = [-100, -50, 100, 50];
  assert.deepEqual(imageToMap(bounds, 0, 0), [-100, -50]);
  assert.deepEqual(imageToMap(bounds, 1, 1), [100, 50]);
  assert.deepEqual(
    mapToImage(bounds, ...imageToMap(bounds, 0.25, 0.75)),
    [0.25, 0.75],
  );
});

test("the nearest street name is suggested for a place", () => {
  const roads: RoadNetwork = JSON.parse(
    readFileSync("public/maps/basel-roads.json", "utf8"),
  );
  const [x, z] = playToMap(riehenringSite, 0, -40);
  assert.equal(nearestStreet(roads, x, z), "Riehenring");
  assert.equal(nearestStreet(roads, 5000, 5000), null);
});

test("an area becomes walkable bounds that always include the spots", () => {
  const area = areaBounds(30, 110);
  assert.deepEqual(area, { minX: -15, maxX: 15, minZ: -110, maxZ: 8 });
  const both = unionBounds(area, { minX: -20, maxX: 10, minZ: -50, maxZ: 12 });
  assert.deepEqual(both, { minX: -20, maxX: 15, minZ: -110, maxZ: 12 });
});
