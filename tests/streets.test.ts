import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { cityConfig as c } from "../config/city.ts";
import { cityLevels, riehenringSite } from "../config/levels.ts";
import { advanceCampaign, createCampaign } from "../src/game/campaign.ts";
import { performCityAction as act } from "../src/game/city.ts";
import { clampToLevel, playToMap, sceneryPose } from "../src/game/streets.ts";
import type { CityState, RoadNetwork } from "../src/interfaces.ts";

const network: RoadNetwork = JSON.parse(
  readFileSync("public/maps/basel-roads.json", "utf8"),
);
const at = (s: CityState, id: number) => ({ ...s.plots[id], y: 0 });
const riehenring = network.roads
  .filter((road) => road.name === "Riehenring")
  .flatMap((road) => road.segments)
  .filter(([a, b]) => a[0] !== b[0] || a[1] !== b[1]);
/** Distance from a map point to the nearest Riehenring centreline segment. */
function toCentreline([x, z]: [number, number]): number {
  return Math.min(
    ...riehenring.map(([a, b]) => {
      const dx = b[0] - a[0],
        dz = b[1] - a[1];
      const t = Math.max(
        0,
        Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)),
      );
      return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
    }),
  );
}

test("scenery pose and play-to-map conversion are inverse transforms", () => {
  const pose = sceneryPose(riehenringSite);
  const cos = Math.cos(pose.rotationY),
    sin = Math.sin(pose.rotationY);
  for (const [x, z] of [
    [0, 0],
    [-11.5, -100],
    [8, 12],
  ]) {
    const [mx, mz] = playToMap(riehenringSite, x, z);
    assert.ok(Math.abs(cos * mx + sin * mz + pose.x - x) < 1e-6);
    assert.ok(Math.abs(-sin * mx + cos * mz + pose.z - z) < 1e-6);
  }
  assert.deepEqual(sceneryPose(undefined), { rotationY: 0, x: 0, z: 0 });
});

test("Riehenring spots lie on the real street and the street runs along the play area", () => {
  const level = cityLevels[0];
  assert.equal(level.site, riehenringSite);
  assert.equal(level.layout.length, c.plotCount);
  const b = riehenringSite.bounds;
  for (const spot of level.layout) {
    assert.ok(spot.site, "every Riehenring plot has a street site");
    assert.ok(spot.x >= b.minX && spot.x <= b.maxX);
    assert.ok(spot.z >= b.minZ && spot.z <= b.maxZ);
    assert.ok(toCentreline(playToMap(riehenringSite, spot.x, spot.z)) < 14);
  }
  for (const [i, a] of level.layout.entries())
    for (const other of level.layout.slice(i + 1))
      assert.ok(Math.hypot(a.x - other.x, a.z - other.z) >= 5, "tiles overlap");
  // Walking straight ahead (-Z) follows the street centreline.
  for (const z of [0, -40, -80])
    assert.ok(toCentreline(playToMap(riehenringSite, 0, z)) < 4);
  for (const hub of [c.sandy, c.machine]) {
    assert.ok(hub.x >= b.minX - 1 && hub.x <= b.maxX + 1);
    assert.ok(hub.z >= b.minZ && hub.z <= b.maxZ);
  }
});

test("walking is clamped to the street corridor or the placeholder square", () => {
  const position = { x: 40, y: 0, z: -500 };
  clampToLevel(position, riehenringSite);
  assert.deepEqual(position, { x: 11.5, y: 0, z: -100 });
  const square = { x: 40, y: 0, z: -500 };
  clampToLevel(square, undefined);
  assert.deepEqual(square, {
    x: c.bounds.maxX,
    y: 0,
    z: c.bounds.minZ,
  });
});

test("each street site only takes the techniques that fit it", () => {
  const s = createCampaign();
  const kind = (id: number) => s.plots[id].kind;
  // Parking bay (5): unsealing for permeable paving, no rain garden.
  act(s, "basin", at(s, 5), 5);
  assert.equal(kind(5), "asphalt");
  assert.match(s.feedback, /permeable|pavers/);
  act(s, "karate", at(s, 5), 5);
  assert.equal(kind(5), "soil");
  // Swale (0): rain garden yes, tree no.
  act(s, "karate", at(s, 0), 0);
  act(s, "tree", at(s, 0), 0);
  assert.equal(kind(0), "soil");
  assert.match(s.feedback, /Fits here: .*Rain garden/i);
  act(s, "basin", at(s, 0), 0);
  assert.equal(kind(0), "basin");
  // Verge (2): tree pit after unsealing.
  act(s, "karate", at(s, 2), 2);
  act(s, "tree", at(s, 2), 2);
  assert.equal(kind(2), "tree");
  // Building edge (7): green roof.
  act(s, "roof", at(s, 7), 7);
  assert.equal(kind(7), "roof");
});

test("street sites stay on Riehenring; later placeholder levels have no site limits", () => {
  const s = createCampaign();
  for (const [id, kind] of [
    [0, "basin"],
    [1, "basin"],
    [2, "karate"],
    [3, "karate"],
  ] as const)
    act(s, kind, at(s, id), id);
  s.plots.forEach((p) => (p.surface = 0));
  Object.assign(s, { heat: 50, flood: 0, reused: 400 });
  s.campaign!.stormCompleted = true;
  assert.equal(advanceCampaign(s), true);
  assert.equal(cityLevels[1].site, undefined);
  assert.ok(s.plots.every((p) => p.site === undefined));
  assert.equal(s.plots[0].kind, "basin");
});
