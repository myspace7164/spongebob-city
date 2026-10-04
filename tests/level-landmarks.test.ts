import assert from "node:assert/strict";
import test from "node:test";
import { cityConfig } from "../config/city.ts";
import { cityLevels, riehenringSite } from "../config/levels.ts";
import {
  createCampaign,
  currentLevel,
  landmarkPose,
  levelPosition,
} from "../src/game/campaign.ts";
import {
  checkCharacters,
  validateBuiltLevel,
} from "../src/game/level-builder.ts";
import { placePowerups } from "../src/game/powerups.ts";
import { riversideBuddyPose } from "../src/game/riverside-buddy.ts";
import { gameplayColliders } from "../src/game/world-colliders.ts";
import type { CityLevel, LevelSpot } from "../src/interfaces.ts";

const ids = cityLevels.map((l) => l.id);
const grid = (): LevelSpot[] =>
  Array.from({ length: 16 }, (_, i) => ({
    x: (i % 4) * 5,
    z: -20 - Math.floor(i / 4) * 5,
    site: "verge",
  }));
const level = (landmarks: unknown) => ({
  location: "Landmark test",
  site: { ...riehenringSite, start: [0, 0] as [number, number], landmarks },
  spots: grid(),
});

test("levels without placed objects keep the old fixed positions", () => {
  const plain = { site: { ...riehenringSite, start: [3, -2] } } as CityLevel;
  assert.deepEqual(landmarkPose(plain, "leaderboard"), {
    x: -1,
    z: -1,
    rotationY: Math.atan2(4, -1),
  });
  assert.deepEqual(landmarkPose(plain, "buddy"), {
    x: 8.5,
    z: -1.5,
    rotationY: 0,
  });
  assert.deepEqual(landmarkPose(plain, "powerup"), {
    x: -2,
    z: -2,
    rotationY: 0,
  });
  assert.deepEqual(landmarkPose(undefined, "streetSign"), {
    x: 0,
    z: -27,
    rotationY: 0,
  });
  const s = createCampaign();
  const pickup = levelPosition(s, cityConfig.landmarkDefaults.powerup);
  assert.equal(s.powerups.pickups[0].x, pickup.x);
  assert.equal(s.powerups.pickups[0].z, pickup.z);
});

test("placed objects move the sign, its collider, the buddy and the pickup", () => {
  const s = createCampaign();
  const own = currentLevel(s)!;
  const moved: CityLevel = {
    ...own,
    site: {
      ...(own.site ?? riehenringSite),
      landmarks: {
        leaderboard: { at: [6, -4], rotationY: 0.5 },
        buddy: { at: [-6, -8] },
        powerup: { at: [1, -9] },
      },
    },
  };
  assert.deepEqual(landmarkPose(moved, "leaderboard"), {
    x: 6,
    z: -4,
    rotationY: 0.5,
  });
  const index = s.campaign!.level;
  const original = cityLevels[index];
  (cityLevels as CityLevel[])[index] = moved;
  try {
    const origin = moved.origin ?? { x: 0, z: 0 };
    const sign = gameplayColliders(s, () => 0).find(
      (c) => c.id === "leaderboard-sign",
    )!;
    assert.equal(sign.shape.type, "polygon");
    const corners = sign.shape.type === "polygon" ? sign.shape.points : [];
    const centre = corners
      .reduce(([x, z], [px, pz]) => [x + px / 4, z + pz / 4], [0, 0])
      .map((n) => Math.round(n * 1e6) / 1e6);
    assert.deepEqual(centre, [origin.x + 6, origin.z - 4]);
    s.elapsed = 0;
    const buddy = riversideBuddyPose(s);
    assert.ok(
      Math.hypot(buddy.x - (origin.x - 6), buddy.z - (origin.z - 8)) < 3,
    );
    placePowerups(s, levelPosition(s, landmarkPose(moved, "powerup")));
    assert.equal(s.powerups.pickups[0].x, origin.x + 1);
    assert.equal(s.powerups.pickups[0].z, origin.z - 9);
  } finally {
    (cityLevels as CityLevel[])[index] = original;
  }
});

test("object placements survive validation and the saved file", () => {
  const ok = validateBuiltLevel(
    "erlenmatt",
    level({
      leaderboard: { at: [-4.123456, 1], rotationY: 0.123456789 },
      streetSign: { at: [0, -27] },
    }),
    ids,
  );
  assert.deepEqual(ok.site.landmarks, {
    leaderboard: { at: [-4.1, 1], rotationY: 0.1235 },
    streetSign: { at: [0, -27] },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(ok)), ok);
  assert.equal(
    validateBuiltLevel("erlenmatt", level(undefined), ids).site.landmarks,
    undefined,
  );
  for (const broken of [
    { castle: { at: [0, 0] } },
    { buddy: { at: [NaN, 0] } },
    { buddy: { at: [0] } },
    { leaderboard: { at: [0, 0], rotationY: Infinity } },
  ])
    assert.throws(
      () => validateBuiltLevel("erlenmatt", level(broken), ids),
      /Invalid object/,
    );
  assert.throws(
    () =>
      validateBuiltLevel(
        "erlenmatt",
        level({ powerup: { at: [500, 0] } }),
        ids,
      ),
    /outside/,
  );
});

test("objects standing on a spot are reported, the floating street sign is not", () => {
  const spots = grid();
  const site = {
    ...riehenringSite,
    start: [0, 0] as [number, number],
    landmarks: {
      buddy: { at: [0, -20] as [number, number] },
      streetSign: { at: [5, -20] as [number, number] },
    },
  };
  const problems = checkCharacters(site, spots);
  assert.ok(problems.includes("Riverside buddy stands on a spot."));
  assert.ok(!problems.some((p) => p.startsWith("Street sign")));
});
