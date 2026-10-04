import assert from "node:assert/strict";
import test from "node:test";
import { cityConfig as c } from "../config/city.ts";
import {
  createCity,
  cityMetrics,
  performCityAction as act,
  spongeCapacity,
  updateCity,
  weather,
} from "../src/game/city.ts";
import type { CityState } from "../src/interfaces.ts";
import {
  activeLevelBounds,
  belongsToActiveLevel,
} from "../src/game/active-level-area.ts";
import { activeBetonTargets } from "../src/game/sabotage.ts";
const at = (s: CityState, id: number) => ({ ...s.plots[id], y: 0 });
const build = (
  s: CityState,
  action: "tree" | "basin" | "roof" | "tank" | "pond" | "shade",
  id: number,
) => {
  if (s.plots[id].kind === "asphalt") act(s, "karate", at(s, id), id);
  return act(s, action, at(s, id), id);
};
const totalWater = (s: CityState) =>
  s.sponge +
  s.evaporated +
  s.infiltrated +
  s.plots.reduce((sum, p) => sum + p.surface + p.moisture + p.stored, 0);
function advance(s: CityState, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 60); i++)
    updateCity(s, 1 / 60, { x: 0, y: 0, z: -10 });
}

test("limited sponge transfers water into useful finite capacity; asphalt cannot receive it", () => {
  const s = createCity();
  const initial = totalWater(s);
  s.plots[1].surface = 0;
  s.plots[0].surface = 1000;
  const before = totalWater(s);
  act(s, "absorb", at(s, 0), 0, 1000);
  assert.equal(s.sponge, c.capacity);
  assert.equal(s.plots[0].surface, 600);
  act(s, "spray", at(s, 1), 1, 500);
  assert.equal(s.reused, 0);
  assert.equal(s.sponge, c.capacity);
  act(s, "karate", at(s, 1), 1);
  act(s, "tree", at(s, 1), 1);
  act(s, "spray", at(s, 1), 1, 500);
  assert.equal(s.plots[1].moisture, c.soilCapacity);
  assert.equal(s.sponge, 50);
  assert.equal(s.reused, 350);
  assert.equal(totalWater(s), before);
  assert.ok(initial > 0);
});

test("construction requires reach, soil, available budget and an unused plot", () => {
  const s = createCity();
  const budget = s.budget;
  assert.match(act(s, "tree", at(s, 0), 0), /sealed/i);
  assert.equal(s.budget, budget);
  assert.equal(s.plots[0].kind, "asphalt");
  for (const action of ["basin", "roof", "tank", "pond", "shade"] as const) {
    assert.match(act(s, action, at(s, 0), 0), /sealed/i);
    assert.equal(s.budget, budget);
    assert.equal(s.plots[0].kind, "asphalt");
  }
  act(s, "karate", { x: 100, y: 0, z: 100 }, 0);
  assert.equal(s.budget, budget);
  act(s, "karate", at(s, 0), 0);
  build(s, "tree", 0);
  const spent = s.budget;
  act(s, "tree", at(s, 0), 0);
  if (s.plots[0].kind === "asphalt") act(s, "karate", at(s, 0), 0);
  act(s, "pond", at(s, 0), 0);
  assert.equal(s.budget, spent);
  assert.equal(s.plots[0].kind, "tree");
  s.budget = 0;
  build(s, "tank", 1);
  assert.equal(s.plots[1].kind, "asphalt");
  const earnedBeforePatrick = s.funding.earned;
  act(s, "patrick", at(s, 1), null);
  assert.equal(s.budget, s.funding.earned - earnedBeforePatrick);
  assert.ok(s.budget > 0);
  assert.ok(cityMetrics(s).permeable >= 2);
  const permeable = cityMetrics(s).permeable;
  act(s, "patrick", at(s, 15), null);
  assert.equal(cityMetrics(s).permeable, permeable);
});

test("temporary capacity expires without deleting water; cooldown and unlock are enforced", () => {
  const s = createCity();
  s.plots[0].surface = 5000;
  act(s, "maximum", at(s, 0), null);
  assert.equal(s.maximumTime, 0);
  act(s, "power", at(s, 0), null);
  assert.equal(spongeCapacity(s), c.poweredCapacity);
  act(s, "absorb", at(s, 0), 0, 1400);
  advance(s, 13);
  assert.equal(spongeCapacity(s), c.capacity);
  assert.equal(s.sponge, 1400);
  act(s, "absorb", at(s, 0), 0, 100);
  assert.equal(s.sponge, 1400);
  act(s, "power", at(s, 0), null);
  assert.equal(s.powerTime, 0);
  s.reused = 800;
  act(s, "maximum", at(s, 0), null);
  assert.equal(spongeCapacity(s), c.maximumCapacity);
  advance(s, 9);
  assert.equal(s.maximumTime, 0);
  assert.ok(s.sponge > c.capacity);
});

test("Sandy upgrade enables distant bubbles, is charged once and requires visiting workshop", () => {
  const s = createCity();
  s.plots[0].surface += s.plots[3].surface;
  s.plots[3].surface = 0;
  s.sponge = 400;
  s.plots[3].kind = "tree";
  const position = { x: -4, y: 0, z: -5 };
  act(s, "spray", position, 3, 100, true);
  assert.equal(s.reused, 0);
  act(s, "upgrade", { x: 10, y: 0, z: 0 }, null);
  assert.equal(s.upgraded, false);
  const sandy = { ...c.sandy, y: 0 };
  act(s, "upgrade", sandy, null);
  assert.equal(s.upgraded, true);
  assert.equal(s.budget, c.budget - c.upgradeCost + s.funding.earned);
  act(s, "upgrade", sandy, null);
  assert.equal(s.budget, c.budget - c.upgradeCost + s.funding.earned);
  act(s, "spray", position, 3, 100);
  assert.equal(s.reused, 0);
  act(s, "spray", position, 3, 100, true);
  assert.equal(s.reused, 100 * c.bubbleWaterMultiplier);
});

test("holding B delivers 50% more water per spray action", () => {
  const s = createCity();
  s.upgraded = true;
  s.sponge = 600;
  s.plots[0].kind = "tree";
  s.plots[1].kind = "tree";
  s.plots[0].surface = 0;
  s.plots[1].surface = 0;

  act(s, "spray", at(s, 0), 0, 100);
  act(s, "spray", at(s, 1), 1, 100, true);

  assert.equal(s.plots[0].moisture, 100);
  assert.equal(s.plots[1].moisture, 100 * c.bubbleWaterMultiplier);
  assert.equal(s.sponge, 600 - 100 - 100 * c.bubbleWaterMultiplier);
});

test("rain, infiltration, evaporation and automatic tank irrigation conserve water", () => {
  const s = createCity();
  for (const [id, action] of [
    [0, "basin"],
    [1, "tank"],
    [2, "roof"],
    [3, "pond"],
  ] as const)
    build(s, action, id);
  act(s, "karate", at(s, 5), 5);
  act(s, "tree", at(s, 5), 5);
  const initial = totalWater(s);
  s.machineDisabled = 200;
  advance(s, 70);
  assert.ok(s.rainfall > 0);
  assert.ok(s.infiltrated > 0);
  assert.ok(s.plots[5].moisture > 0);
  assert.ok(Math.abs(totalWater(s) - initial - s.rainfall) < 0.00001);
  assert.ok(
    s.plots.every((p) => p.surface >= 0 && p.moisture >= 0 && p.stored >= 0),
  );
  assert.ok(cityMetrics(s).temperature < 37);
});

test("sabotage reseals a plot without destroying its water; disabling machine stops it", () => {
  const s = createCity();
  build(s, "basin", 0);
  assert.ok(belongsToActiveLevel(activeLevelBounds(s), s.plots[0], 1.8));
  assert.deepEqual(
    activeBetonTargets(s).map((plot) => plot.id),
    [0],
  );
  s.plots[0].moisture = 300;
  const initial = totalWater(s);
  s.sabotageIn = 0;
  updateCity(s, 1 / 60, at(s, 0));
  assert.equal(s.plots[0].kind, "basin");
  assert.equal(s.saboteur.phase, "approaching");
  for (let step = 0; step < 1200 && s.plots[0].kind === "basin"; step++)
    updateCity(s, 1 / 60, at(s, 0));
  assert.equal(s.plots[0].kind, "asphalt");
  assert.equal(s.plots[0].moisture, 0);
  assert.ok(Math.abs(totalWater(s) - initial) < 0.00001);
  build(s, "basin", 0);
  s.sabotageIn = 0;
  act(s, "machine", { ...s.saboteur, y: 0 }, null);
  advance(s, 10);
  assert.equal(s.plots[0].kind, "basin");
  assert.ok(s.machineDisabled > 0);
});

test("empty streets alone never win; prolonged flood loses and result freezes the clock", () => {
  const s = createCity();
  s.plots.forEach((p) => (p.surface = 0));
  s.heat = 10;
  s.reused = 3000;
  s.stormSeen = true;
  advance(s, 1);
  assert.equal(s.outcome, "playing");
  s.plots.forEach((p) => (p.surface = 3000));
  advance(s, 19);
  assert.equal(s.outcome, "lost");
  const elapsed = s.elapsed;
  const budget = s.budget;
  advance(s, 10);
  act(s, "karate", at(s, 0), 0);
  assert.equal(s.elapsed, elapsed);
  assert.equal(s.budget, budget);
  const fresh = createCity();
  updateCity(fresh, 0, at(fresh, 0));
  assert.equal(fresh.elapsed, 0);
  assert.equal(weather(fresh).raining, false);
  fresh.elapsed = c.dryDuration + 1;
  assert.equal(weather(fresh).raining, true);
  fresh.elapsed = c.dryDuration + c.rainDuration + 1;
  assert.equal(weather(fresh).raining, false);
});

test("a complete legal collect/distribute/build strategy wins the mission", () => {
  const s = createCity();
  for (const id of [0, 1, 2, 3]) {
    act(s, "karate", at(s, id), id);
    build(s, "tree", id);
  }
  for (const id of [4, 5]) build(s, "basin", id);
  for (const id of [6, 7]) build(s, "tank", id);
  for (let step = 0; step < 2400 && s.outcome === "playing"; step++) {
    if (s.machineDisabled < 1) act(s, "machine", { ...c.machine, y: 0 }, null);
    const source = [...s.plots].sort((a, b) => b.surface - a.surface)[0];
    if (s.sponge < c.capacity && source.surface > 0)
      act(s, "absorb", at(s, source.id), source.id, 30);
    const thirsty = s.plots
      .filter((p) => ["tree", "basin"].includes(p.kind))
      .sort((a, b) => a.moisture - b.moisture)[0];
    const destination =
      thirsty.moisture < 220
        ? thirsty
        : s.plots.find(
            (p) => p.kind === "tank" && p.stored < c.storageCapacity - 30,
          );
    if (destination) act(s, "spray", at(s, destination.id), destination.id, 16);
    updateCity(s, 0.1, { x: 0, y: 0, z: -10 });
  }
  assert.equal(
    s.outcome,
    "won",
    JSON.stringify({
      heat: s.heat,
      flood: s.flood,
      reused: s.reused,
      elapsed: s.elapsed,
      metrics: cityMetrics(s),
    }),
  );
  assert.ok(s.budget >= 0);
});

test("flooded and full plots reject irrigation without spending water or paying grants", () => {
  for (const kind of [
    "soil",
    "tree",
    "basin",
    "roof",
    "tank",
    "pond",
    "shade",
  ] as const) {
    const s = createCity(),
      p = s.plots[0];
    p.kind = kind;
    p.surface = 20;
    s.sponge = 100;
    const before = structuredClone(s);
    assert.match(act(s, "spray", at(s, 0), 0, 50), /flooded/);
    assert.equal(s.sponge, before.sponge);
    assert.equal(s.reused, before.reused);
    assert.deepEqual(s.funding, before.funding);
    assert.deepEqual(p, before.plots[0]);
    p.surface = 0;
    p.moisture = c.soilCapacity;
    p.stored = c.storageCapacity;
    act(s, "spray", at(s, 0), 0, 50);
    assert.equal(s.sponge, 100);
    assert.equal(s.reused, 0);
    p.moisture = 0;
    p.stored = 0;
    act(s, "spray", at(s, 0), 0, 50);
    assert.equal(s.sponge, 50);
    assert.equal(s.reused, 50);
  }
});

test("every construction tool rejects sealed plots without spending coins, awarding funding or changing water", () => {
  for (const action of [
    "tree",
    "basin",
    "roof",
    "shade",
    "pond",
    "tank",
  ] as const) {
    const s = createCity();
    const before = structuredClone(s);
    assert.match(act(s, action, at(s, 0), 0), /Unseal/);
    assert.deepEqual(s.plots, before.plots);
    assert.equal(s.budget, before.budget);
    assert.deepEqual(s.funding, before.funding);
    assert.equal(totalWater(s), totalWater(before));
    act(s, "karate", at(s, 0), 0);
    act(s, action, at(s, 0), 0);
    assert.equal(s.plots[0].kind, action);
    // Dr. Beton can reseal previously improved ground: the prerequisite applies again.
    s.plots[0].kind = "asphalt";
    const budget = s.budget;
    assert.match(act(s, action, at(s, 0), 0), /Unseal/);
    assert.equal(s.budget, budget);
  }
});
