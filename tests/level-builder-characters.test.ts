import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { cityConfig as c } from "../config/city.ts";
import {
  applyBuiltLevel,
  cityLevels,
  riehenringSite,
} from "../config/levels.ts";
import {
  createCampaign,
  npcPosition,
  startCampaignAt,
} from "../src/game/campaign.ts";
import { performCityAction as act } from "../src/game/city.ts";
import { castPosition } from "../src/game/cast.ts";
import { categoryAt, decodeGroundPng } from "../src/game/ground-data.ts";
import {
  checkCharacters,
  placeNpcs,
  validateBuiltLevel,
} from "../src/game/level-builder.ts";
import { playToMap } from "../src/game/streets.ts";
import type { GroundMeta } from "../src/game/ground-style.ts";
import type { BuiltLevel, LevelSpot } from "../src/interfaces.ts";

/** Street along −Z: buildings for x < −10, sidewalk to −6, road, island 1–3. */
const surface = (x: number) =>
  x < -10
    ? "building"
    : x < -6
      ? "sidewalk"
      : x >= 1 && x < 3
        ? "island"
        : x >= 9
          ? "paved"
          : "road";
const walk = new Set(["sidewalk", "paved", "green", "island", "other"]);
const spots: LevelSpot[] = Array.from({ length: 4 }, (_, i) => ({
  x: 2,
  z: -10 - i * 6,
  site: "swale",
}));
const bounds = { minX: -15, maxX: 15, minZ: -60, maxZ: 8 };

test("characters land on free walkable ground with Sandy close to the spawn", () => {
  const { npcs, warnings } = placeNpcs([-8, 0], spots, bounds, (x) =>
    surface(x),
  );
  assert.deepEqual(warnings, []);
  const all = Object.entries(npcs);
  assert.equal(all.length, 5);
  for (const [id, [x, z]] of all) {
    assert.ok(walk.has(surface(x)), `${id} on ${surface(x)}`);
    assert.ok(
      spots.every((s) => Math.abs(x - s.x) > 1.6 || Math.abs(z - s.z) > 1.6),
      `${id} on a spot`,
    );
  }
  for (const [i, [, a]] of all.entries())
    for (const [, b] of all.slice(i + 1))
      assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) >= 3);
  const sandy = Math.hypot(npcs.sandy[0] + 8, npcs.sandy[1]);
  assert.ok(sandy >= 3 && sandy <= 6);
  assert.ok(npcs.patrick[0] < -8 || npcs.krabs[0] > -8);
  assert.deepEqual(
    placeNpcs([-8, 0], spots, bounds, (x) => surface(x)).npcs,
    npcs,
    "deterministic",
  );
  // Nothing walkable: defaults with a warning each.
  assert.equal(
    placeNpcs([0, 0], spots, bounds, () => "building").warnings.length,
    5,
  );
});

test("the land-cover tiles decode like the converter wrote them", async () => {
  const meta: GroundMeta = JSON.parse(
    readFileSync("public/maps/basel-ground.json", "utf8"),
  );
  const tile = meta.tiles[1];
  const data = await decodeGroundPng(
    tile,
    readFileSync(`public/maps/${tile.file}`),
    (b) => inflateSync(b),
  );
  // Riehenring: road ahead of the start, sidewalk at the left edge.
  assert.equal(
    categoryAt(meta, [data], ...playToMap(riehenringSite, 0, -40)),
    "road",
  );
  assert.equal(
    categoryAt(meta, [data], ...playToMap(riehenringSite, -8, -12)),
    "sidewalk",
  );
  assert.equal(categoryAt(meta, [], 0, 0), "other");
});

test("spawn facing and character positions are validated and kept", () => {
  const ids = cityLevels.map((l) => l.id);
  const level = {
    location: "Test",
    site: {
      ...riehenringSite,
      start: [-5, -9] as [number, number],
      startYaw: 1.2345678,
      npcs: { sandy: [-8, -12] as [number, number] },
    },
    spots: Array.from({ length: 16 }, (_, i) => ({
      x: (i % 4) * 4,
      z: -Math.floor(i / 4) * 4,
      site: "verge" as const,
    })),
  };
  const saved = validateBuiltLevel("erlenmatt", level, ids);
  assert.equal(saved.site.startYaw, 1.2346);
  assert.deepEqual(saved.site.npcs, { sandy: [-8, -12] });
  const bad = (site: object) => () =>
    validateBuiltLevel(
      "erlenmatt",
      { ...level, site: { ...level.site, ...site } },
      ids,
    );
  assert.throws(bad({ startYaw: NaN }));
  assert.throws(bad({ npcs: { sandy: [500, 0] } }));
  assert.throws(bad({ npcs: { gary: [0, 0] } }));
  assert.throws(bad({ start: [500, 0] }));
  assert.deepEqual(
    checkCharacters({ ...level.site, npcs: { sandy: [0, -40] } }, level.spots),
    ["Sandy is more than 12 m from the spawn; the upgrade is hard to find."],
  );
});

test("a level's own character positions move Sandy's workshop and Dr. Beton's start", () => {
  const defaults = createCampaign();
  const own = cityLevels[0].site?.npcs?.sandy;
  assert.deepEqual(
    npcPosition(defaults, "sandy"),
    own ? { x: own[0], z: own[1] } : c.npcDefaults.sandy,
  );
  const built: BuiltLevel = {
    location: "Test square",
    site: {
      ...riehenringSite,
      start: [0, 0],
      npcs: { sandy: [5, 5], beton: [-3, -30] },
    },
    spots: cityLevels[1].layout.map((p, i) => ({
      x: (i % 4) * 5,
      z: -Math.floor(i / 4) * 5 - 10,
      site: "verge",
    })),
  };
  const original = cityLevels[1];
  try {
    const index = applyBuiltLevel("erlenmatt", built);
    assert.equal(cityLevels[index].location, "Test square");
    const s = startCampaignAt(index);
    assert.equal(s.campaign!.level, index);
    assert.deepEqual(npcPosition(s, "sandy"), { x: 5, z: 5 });
    const wanderingSandy = castPosition(s, 1);
    assert.ok(Math.hypot(wanderingSandy.x - 5, wanderingSandy.z - 5) < 2);
    assert.deepEqual({ x: s.saboteur.x, z: s.saboteur.z }, { x: -3, z: -30 });
    // The upgrade works next to the new Sandy, not at the old place.
    act(
      s,
      "upgrade",
      { x: c.npcDefaults.sandy.x, y: 0, z: c.npcDefaults.sandy.z },
      null,
    );
    assert.equal(s.upgraded, false);
    act(s, "upgrade", { x: 5, y: 0, z: 6 }, null);
    assert.equal(s.upgraded, true);
  } finally {
    (cityLevels as typeof cityLevels & object[])[1] = original;
  }
});

test("without saved levels the game is unchanged: no spawn, facing or character overrides", async () => {
  const { builtLevels } = await import("../config/built-levels/index.ts");
  if (Object.keys(builtLevels).length) return; // a saved level changes its own level only
  for (const level of cityLevels) {
    assert.equal(level.site?.start, undefined);
    assert.equal(level.site?.startYaw, undefined);
    assert.equal(level.site?.npcs, undefined);
    assert.ok(level.layout.every((spot) => spot.builds === undefined));
  }
  // The defaults are exactly the positions the game always used.
  const s = createCampaign();
  assert.deepEqual(npcPosition(s, "sandy"), c.sandy);
  assert.deepEqual(npcPosition(s, "beton"), c.machine);
  assert.deepEqual({ x: s.saboteur.x, z: s.saboteur.z }, c.machine);
});
