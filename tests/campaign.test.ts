import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { cityConfig as c } from "../config/city.ts";
import { cityLevels } from "../config/levels.ts";
import {
  advanceCampaign,
  connectRunoff,
  createCampaign,
  currentLevel,
  levelAchievements,
  levelPosition,
  recyclePlot,
} from "../src/game/campaign.ts";
import {
  performCityAction as act,
  updateCity,
  weather,
} from "../src/game/city.ts";
import { downhillNeighbours, updateWater } from "../src/game/city-water.ts";
import {
  assignElevations,
  levelScenery,
  terrainFromBuffer,
} from "../src/game/terrain.ts";
import type { CityState } from "../src/interfaces.ts";
const at = (s: CityState, id: number) => ({ ...s.plots[id], y: 0 });
const total = (s: CityState) =>
  s.sponge +
  s.evaporated +
  s.infiltrated +
  s.plots.reduce((n, p) => n + p.surface + p.moisture + p.stored, 0);
/** Generic rule tests use a placeholder grid without street-site limits. */
const onPlaceholderLevel = (s: CityState, level: number) => {
  s.campaign!.level = level;
  for (const p of s.plots) {
    Object.assign(p, cityLevels[level].layout[p.id]);
    delete p.site;
  }
};
const connect = (s: CityState, from: number, to: number) => {
  connectRunoff(s, from, at(s, from));
  connectRunoff(s, to, at(s, to));
};

test("campaign starts with the four story levels and cannot skip incomplete achievements", () => {
  const s = createCampaign();
  assert.deepEqual(
    cityLevels.map((level) => level.id),
    ["riehenring", "erlenmatt", "st-johann", "voltanord"],
  );
  assert.equal(currentLevel(s)?.id, "riehenring");
  assert.equal(advanceCampaign(s), false);
  assert.equal(s.campaign!.level, 0);
  assert.ok(levelAchievements(s).some((goal) => !goal.done));
  assert.equal(s.outcome, "playing");
  updateCity(s, 0, at(s, 0));
  updateCity(s, Number.NaN, at(s, 0));
  assert.equal(s.elapsed, 0);
  s.elapsed = 26;
  assert.equal(weather(s).raining, true);
  assert.equal(s.campaign!.stormCompleted, false);
});

test("plot 15 is freely usable and no drying achievement remains", () => {
  const s = createCampaign();
  act(s, "karate", at(s, 15), 15);
  assert.equal(s.plots[15].kind, "soil");
  assert.equal(
    levelAchievements(s).some((goal) => /trocken/i.test(goal.label)),
    false,
  );
});

test("runoff requires reachable safe destinations, rejects loops and conserves water with saturated ground", () => {
  const s = createCampaign();
  onPlaceholderLevel(s, 3);
  for (const [id, kind] of [
    [0, "roof"],
    [1, "tank"],
    [2, "basin"],
    [3, "tank"],
  ] as const)
    act(s, kind, at(s, id), id);
  connectRunoff(s, 0, { x: 99, y: 0, z: 99 });
  assert.equal(s.campaign!.connectFrom, null);
  connectRunoff(s, 0, at(s, 0));
  connectRunoff(s, 15, at(s, 15));
  assert.equal(s.plots[0].drainsTo, undefined);
  connectRunoff(s, 1, at(s, 1));
  assert.equal(s.plots[0].drainsTo, 1);
  connect(s, 1, 3);
  connect(s, 3, 1);
  assert.equal(s.plots[3].drainsTo, undefined);
  s.campaign!.connectFrom = null;
  connect(s, 3, 2);
  s.plots[0].stored = c.storageCapacity;
  s.plots[0].surface = 200;
  s.plots[3].stored = c.storageCapacity;
  s.plots[3].surface = 200;
  s.plots[2].moisture = c.soilCapacity;
  const before = total(s);
  updateWater(s, 1, false);
  assert.ok(s.plots[0].stored < c.storageCapacity);
  assert.ok(s.plots[2].surface > 0);
  assert.ok(
    s.plots.every(
      (p) =>
        p.surface >= 0 &&
        p.stored <= c.storageCapacity &&
        p.moisture <= c.soilCapacity,
    ),
  );
  assert.ok(Math.abs(total(s) - before) < 1e-8);
});

test("recycling restores build choices without new grants or deleting retained water", () => {
  const s = createCampaign();
  onPlaceholderLevel(s, 3);
  const budget = s.budget;
  act(s, "tank", at(s, 0), 0);
  const grants = s.funding.earned;
  s.plots[0].stored = 1000;
  const before = total(s);
  recyclePlot(s, 0, at(s, 0));
  assert.equal(s.plots[0].kind, "soil");
  assert.equal(s.budget, budget + grants);
  assert.equal(total(s), before);
  recyclePlot(s, 0, at(s, 0));
  assert.equal(s.budget, budget + grants);
});

test("separated shaded plots do not satisfy a connected shade zone", () => {
  const s = createCampaign();
  onPlaceholderLevel(s, 2);
  act(s, "shade", at(s, 0), 0);
  act(s, "shade", at(s, 14), 14);
  const goal = () =>
    levelAchievements(s).find((g) => g.metric === "shadeConnected")!;
  assert.equal(goal().done, false);
  act(s, "shade", at(s, 1), 1);
  assert.equal(goal().done, true);
});

test("St. Johann has no rooftop connection objective and keeps its other goals", () => {
  const s = createCampaign();
  onPlaceholderLevel(s, 2);
  assert.deepEqual(
    currentLevel(s)?.goals.map((goal) => goal.metric),
    [
      "roofs",
      "shadeConnected",
      "healthyTrees",
      "reused",
      "heat",
      "flood",
      "stormCompleted",
    ],
  );
  assert.equal(
    levelAchievements(s).some((goal) => goal.metric === "roofRoutes"),
    false,
  );
  s.campaign!.level = 3;
  assert.equal(
    currentLevel(s)?.goals.some((goal) => goal.metric === "roofRoutes"),
    true,
  );
});

/** Same legal play on flat ground, or with real terrain heights so water runs downhill. */
function playLegalStrategy(elevate?: (s: CityState) => void) {
  const s = createCampaign();
  const construction = [
    [
      [0, "basin"],
      [1, "basin"],
      [5, "karate"],
      [6, "karate"],
    ],
    [
      [0, "basin"],
      [1, "basin"],
      [2, "karate"],
      [2, "tree"],
      [3, "karate"],
      [3, "tree"],
      [4, "karate"],
      [4, "tree"],
      [5, "karate"],
      [6, "karate"],
    ],
    [
      [0, "basin"],
      [1, "basin"],
      [2, "karate"],
      [2, "tree"],
      [3, "karate"],
      [3, "tree"],
      [4, "karate"],
      [4, "tree"],
      [7, "roof"],
      [8, "roof"],
      [9, "shade"],
      [10, "shade"],
    ],
    [
      [0, "basin"],
      [1, "basin"],
      [2, "karate"],
      [2, "tree"],
      [3, "karate"],
      [3, "tree"],
      [4, "karate"],
      [4, "tree"],
      [7, "roof"],
      [8, "roof"],
      [9, "shade"],
      [10, "shade"],
      [11, "tank"],
      [12, "tank"],
      [13, "pond"],
    ],
  ] as const;
  for (let level = 0; level < cityLevels.length; level++) {
    assert.equal(s.campaign!.level, level);
    assert.equal(s.outcome, "playing");
    elevate?.(s);
    const initialWater = total(s) - s.rainfall;
    for (const [id, kind] of construction[level]) act(s, kind, at(s, id), id);
    if (level === 3) {
      connect(s, 7, 0);
      connect(s, 8, 1);
      connect(s, 11, 0);
      connect(s, 12, 13);
    }
    let levelWaterBeforeCompletion = 0;
    let rainfallBeforeCompletion = 0;
    for (
      let step = 0;
      step < 4000 && s.campaign!.level === level && s.outcome === "playing";
      step++
    ) {
      if (s.machineDisabled < 1)
        act(s, "machine", { ...levelPosition(s, c.machine), y: 0 }, null);
      const plot15 = s.plots[15];
      const source =
        plot15.surface > 0
          ? plot15
          : [...s.plots].sort((a, b) => b.surface - a.surface)[0];
      act(s, "absorb", at(s, source.id), source.id, 30);
      const trees = s.plots
        .filter((p) => p.kind === "tree")
        .sort((a, b) => a.moisture - b.moisture);
      const ground = s.plots
        .filter((p) => ["soil", "basin"].includes(p.kind))
        .sort((a, b) => a.moisture - b.moisture);
      const storage = s.plots
        .filter((p) => ["tank", "pond", "roof"].includes(p.kind))
        .sort((a, b) => a.stored - b.stored);
      const destination =
        trees[0]?.moisture < 220
          ? trees[0]
          : (storage.find((p) => p.stored < 1300) ?? ground[0]);
      if (destination)
        act(s, "spray", at(s, destination.id), destination.id, 30);
      levelWaterBeforeCompletion = total(s);
      rainfallBeforeCompletion = s.rainfall;
      updateCity(s, 0.1, at(s, 0));
    }
    assert.equal(
      s.outcome,
      level === 3 ? "won" : "playing",
      JSON.stringify(levelAchievements(s)),
    );
    assert.equal(
      s.campaign!.completed.length,
      level + 1,
      JSON.stringify(levelAchievements(s)),
    );
    assert.ok(
      Math.abs(
        levelWaterBeforeCompletion - rainfallBeforeCompletion - initialWater,
      ) < 1e-6,
    );
    if (level < 3) {
      assert.equal(s.campaign!.level, level + 1);
      assert.equal(s.elapsed, 0);
      assert.ok(
        s.plots.every(
          (p) =>
            p.kind === "asphalt" &&
            p.moisture === 0 &&
            p.stored === 0 &&
            p.drainsTo === undefined,
        ),
      );
      assert.equal(s.sponge, 0);
      assert.equal(s.budget, c.budget);
      assert.ok(
        s.plots[0].x !== cityLevels[level].layout[0].x ||
          s.plots[0].z !== cityLevels[level].layout[0].z,
      );
      assert.equal(s.reused, 0);
      assert.equal(s.campaign!.stormCompleted, false);
    }
  }
  assert.deepEqual(
    s.campaign!.completed,
    cityLevels.map((level) => level.id),
  );
  const finished = structuredClone(s);
  updateCity(s, 1, at(s, 0));
  assert.equal(advanceCampaign(s), false);
  assert.deepEqual(s, finished);
}

test("a legal strategy completes four independent fresh locations and conserves water within each level", () =>
  playLegalStrategy());

test("the same strategy still wins on real Basel terrain where water runs downhill", () => {
  const grid = terrainFromBuffer(
    JSON.parse(readFileSync("public/maps/basel-terrain.json", "utf8")),
    readFileSync("public/maps/basel-terrain.bin").buffer.slice(0),
  );
  playLegalStrategy((s) => {
    assignElevations(s, levelScenery(currentLevel(s), grid).groundAt);
    assert.ok(s.plots.every((p) => p.elevation !== undefined));
    if (currentLevel(s)!.site === undefined)
      assert.ok(
        s.plots.some((p) => downhillNeighbours(s, p).length > 0),
        "sloped stages send water downhill",
      );
  });
});

test("the last missing achievement blocks advancement; next neighbourhood resets water, upgrades and funds", () => {
  const s = createCampaign();
  for (const [id, kind] of [
    [0, "basin"],
    [1, "basin"],
    [2, "karate"],
    [3, "karate"],
  ] as const)
    act(s, kind, at(s, id), id);
  act(s, "upgrade", { ...c.sandy, y: 0 }, null);
  s.plots.forEach((p) => {
    p.surface = 0;
  });
  s.plots[0].moisture = 120;
  s.sponge = 275;
  s.heat = 50;
  s.flood = 0;
  s.campaign!.stormCompleted = true;
  s.reused = 399;
  assert.equal(levelAchievements(s).filter((goal) => !goal.done).length, 1);
  assert.equal(advanceCampaign(s), false);
  s.reused = 400;
  assert.equal(advanceCampaign(s), true);
  assert.equal(total(s), c.plotCount * c.initialSurface);
  assert.equal(s.sponge, 0);
  assert.equal(s.plots[0].moisture, 0);
  assert.equal(s.upgraded, false);
  assert.equal(s.budget, c.budget);
  assert.equal(s.plots[0].kind, "asphalt");
  assert.deepEqual(s.campaign!.completed, ["riehenring"]);
  assert.equal(s.campaign!.level, 1);
  assert.equal(s.reused, 0);
});
