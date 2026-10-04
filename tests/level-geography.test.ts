import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  baselLocations,
  levelLocationPools,
} from "../config/level-locations.ts";
import { applyBuiltLevel, cityLevels } from "../config/levels.ts";
import { cityConfig } from "../config/city.ts";
import { levelLocalGroundAt, levelScenery } from "../src/game/terrain.ts";
import { mapToWorld, worldToMap } from "../src/game/streets.ts";
import {
  createCampaign,
  currentLevel,
  selectCampaignLocations,
  startNextCampaignLevel,
} from "../src/game/campaign.ts";
import { buildingPlacement } from "../src/game/building-clearance.ts";

test("eight real candidates match recorded area priority and actual scenery transforms", () => {
  const evidence = JSON.parse(
    readFileSync("public/maps/risk/ranking.json", "utf8"),
  );
  assert.equal(baselLocations.length, 8);
  for (const [index, location] of baselLocations.entries()) {
    const level = {
      ...cityLevels[Math.floor(index / 2)],
      mapSite: location.site,
    };
    const sample = evidence.ranked.find(
      (s: { id: string }) => s.id === location.id,
    );
    assert.equal(sample.priority, location.priority);
    if (index)
      assert.ok(location.priority > baselLocations[index - 1].priority);
    const origin = level.origin ?? { x: 0, z: 0 };
    const mapped = worldToMap(levelScenery(level, null), origin.x, origin.z);
    assert.ok(Math.abs(mapped[0] - location.site.origin[0]) < 1e-8);
    assert.ok(Math.abs(mapped[1] - location.site.origin[1]) < 1e-8);
  }
});

test("builder markers sample terrain through the rotated and shifted scenery pose", () => {
  const grid = {
    bounds: [-100, -100, 100, 100] as [number, number, number, number],
    columns: 3,
    rows: 3,
    spacing: 100,
    heights: Float32Array.from([0, 10, 20, 20, 30, 40, 40, 50, 60]),
  };
  const level = {
    ...cityLevels[0],
    origin: { x: 35, z: -22 },
    site: {
      street: "Rotated test street",
      origin: [45, -30] as [number, number],
      heading: 0.7,
      bounds: { minX: -20, maxX: 20, minZ: -40, maxZ: 8 },
      start: [0, 0] as [number, number],
    },
  };
  const pose = levelScenery(level, grid);
  const marker: [number, number] = [52, -61];
  const [worldX, worldZ] = mapToWorld(pose, ...marker);
  assert.equal(
    levelLocalGroundAt(pose, ...marker, pose.groundAt),
    pose.groundAt(worldX, worldZ) - pose.y,
  );
  assert.notEqual(
    pose.groundAt(marker[0], marker[1]),
    pose.groundAt(worldX, worldZ),
  );
});

test("Test play and applied builder levels retain their chosen map geography", () => {
  const original = cityLevels[0];
  const site = { ...baselLocations[0].site, start: [0, 0] as [number, number] };
  try {
    applyBuiltLevel(original.id, {
      location: "Builder's chosen location",
      site,
      spots: [...original.layout],
    });
    const state = createCampaign(() => 0.999);
    const level = currentLevel(state)!;
    assert.equal(level.location, "Builder's chosen location");
    assert.equal(level.mapSite, site);
    assert.equal(levelScenery(level, null).rotationY, site.heading);
  } finally {
    (cityLevels as (typeof original)[])[0] = original;
  }
});

test("all sixteen randomized routes have four different sites with increasing urgency", () => {
  const routes = new Set<string>();
  for (let bits = 0; bits < 16; bits++) {
    let tier = 0;
    const route = selectCampaignLocations(() =>
      (bits >> tier++) & 1 ? 0.999 : 0,
    );
    routes.add(route.join("/"));
    assert.equal(new Set(route).size, 4);
    for (const [index, id] of route.entries()) {
      const candidate = baselLocations.find((c) => c.id === id)!;
      assert.ok(levelLocationPools[index].includes(candidate));
      if (index)
        assert.ok(
          candidate.priority >
            baselLocations.find((c) => c.id === route[index - 1])!.priority,
        );
    }
  }
  assert.equal(routes.size, 16);
});

test("chosen geography survives serialization, retry snapshots and next-level resets", () => {
  const s = createCampaign(() => 0.999);
  const route = [...s.campaign!.locations!];
  const restored = JSON.parse(JSON.stringify(s));
  assert.deepEqual(currentLevel(restored), currentLevel(s));
  assert.deepEqual(structuredClone(s).campaign!.locations, route);
  s.campaign!.wheelPending = true;
  s.campaign!.pendingModifier = "speedBoost";
  assert.equal(startNextCampaignLevel(s), true);
  assert.deepEqual(s.campaign!.locations, route);
  assert.equal(currentLevel(s)!.mapSite, levelLocationPools[1][1].site);
});

test("collision footprints keep every candidate's illustrative mission clearing open", () => {
  for (const random of [() => 0, () => 0.999]) {
    const s = createCampaign(random);
    for (let index = 0; index < cityLevels.length; index++) {
      s.campaign!.level = index;
      const level = currentLevel(s)!;
      const origin = level.origin ?? { x: 0, z: 0 };
      const bounds = level.site?.bounds ?? cityConfig.bounds;
      const placement = buildingPlacement(s);
      assert.ok(placement.obstacles.length > 0);
      for (const b of placement.obstacles)
        assert.ok(
          b.x + b.halfX! < origin.x + bounds.minX - 3 ||
            b.x - b.halfX! > origin.x + bounds.maxX + 3 ||
            b.z + b.halfZ! < origin.z + bounds.minZ - 3 ||
            b.z - b.halfZ! > origin.z + bounds.maxZ + 3,
        );
    }
  }
});
