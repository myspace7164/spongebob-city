import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { cityConfig as c } from "../config/city.ts";
import { cityLevels } from "../config/levels.ts";
import { createCampaign, startCampaignAt } from "../src/game/campaign.ts";
import {
  createCity,
  performCityAction,
  updateCity,
  weather,
} from "../src/game/city.ts";
import { spongeWaterMorphWeights } from "../src/game/assets.ts";
import { createCityFireView } from "../src/game/city-fire-view.ts";
import { activeLevelBounds } from "../src/game/active-level-area.ts";
import type { CityState, PlotKind } from "../src/interfaces.ts";

function placeSaboteurAndTargetInsideActiveLevel(state: CityState): void {
  const area = activeLevelBounds(state);
  const x = (area.minX + area.maxX) / 2;
  const z = (area.minZ + area.maxZ) / 2;
  Object.assign(state.plots[0]!, { x, z, levelId: area.levelId ?? undefined });
  Object.assign(state.saboteur, {
    x,
    z,
    destinationX: x,
    destinationZ: z,
    lastValidX: x,
    lastValidZ: z,
    levelId: area.levelId,
  });
}

const at = (s: CityState, id: number) => ({ ...s.plots[id], y: 0 });
function advance(s: CityState, seconds: number) {
  const steps = Math.ceil(seconds * 60);
  const dt = seconds / steps;
  for (let i = 0; i < steps; i++) updateCity(s, dt, { x: 0, y: 0, z: -10 });
}
function temperatureAfterOneSecond(
  kind: PlotKind,
  raining = false,
  level?: number,
): number {
  const s = level === undefined ? createCity() : startCampaignAt(level);
  if (level !== undefined) {
    if (raining) s.elapsed = cityLevels[level].weather.dryDuration - 1;
  }
  s.plots.forEach((plot) => {
    plot.kind = kind;
    if (kind === "tree") plot.moisture = c.moistureHealthy;
  });
  s.machineDisabled = 20;
  if (raining && level === undefined) s.elapsed = c.dryDuration - 1;
  updateCity(s, 1, { x: 0, y: 0, z: -10 });
  return s.temperature;
}

test("city temperature starts normal and concrete warms it gradually", () => {
  const asphalt = createCity();
  const shade = createCity();
  asphalt.machineDisabled = shade.machineDisabled = 20;
  shade.plots.forEach((plot) => (plot.kind = "shade"));
  assert.equal(asphalt.temperature, 27);
  advance(asphalt, 10);
  advance(shade, 10);
  assert.ok(asphalt.temperature > 27);
  assert.ok(asphalt.temperature < 27.5, "ten seconds must not cause a spike");
  assert.ok(asphalt.temperature > shade.temperature);
  assert.ok(asphalt.heat > 0);
});

test("campaign warming pressure rises proportionally across every level", () => {
  const temperatures = cityLevels.map((_, level) => {
    const s = createCampaign();
    s.campaign!.level = level;
    s.machineDisabled = 100;
    advance(s, 10);
    return s.temperature;
  });
  assert.equal(temperatures.length, cityLevels.length);
  for (let i = 1; i < temperatures.length; i++) {
    assert.ok(
      temperatures[i] > temperatures[i - 1],
      `level ${i + 1} should warm faster than level ${i}`,
    );
    assert.ok(
      temperatures[i] - c.heatSystem.startingCelsius < 0.5,
      "ten seconds should not cause an instant heat spike",
    );
  }
  const firstRise = temperatures[0] - c.heatSystem.startingCelsius;
  const lastRise = temperatures.at(-1)! - c.heatSystem.startingCelsius;
  assert.ok(lastRise > firstRise * 1.5);
});

test("concrete production heat also scales while every cooling source still works", () => {
  const productionPressure = cityLevels.map((_, level) => {
    const idle = startCampaignAt(level);
    const production = startCampaignAt(level);
    idle.machineDisabled = 100;
    for (const state of [idle, production])
      state.plots.forEach((plot) => (plot.kind = "soil"));
    for (const state of [idle, production])
      placeSaboteurAndTargetInsideActiveLevel(state);
    production.saboteur.phase = "sealing";
    production.saboteur.targetId = 0;
    production.saboteur.sealTime = 100;
    updateCity(idle, 1, { x: 0, y: 0, z: 0 });
    updateCity(production, 1, { x: 0, y: 0, z: 0 });
    return production.temperature - idle.temperature;
  });
  for (let i = 1; i < productionPressure.length; i++)
    assert.ok(productionPressure[i] > productionPressure[i - 1]);

  for (let level = 0; level < cityLevels.length; level++) {
    const asphalt = temperatureAfterOneSecond("asphalt", false, level);
    assert.ok(temperatureAfterOneSecond("asphalt", true, level) < asphalt);
    for (const kind of ["tree", "soil", "pond", "shade"] as const)
      assert.ok(
        temperatureAfterOneSecond(kind, false, level) < asphalt,
        `${kind} should cool level ${level + 1}`,
      );
  }
});

test("Dr. Beton sealing adds gradual heat pressure beyond the sealed surface", () => {
  const idle = createCity();
  const production = createCity();
  for (const state of [idle, production])
    state.plots.forEach((plot) => (plot.kind = "soil"));
  for (const state of [idle, production])
    placeSaboteurAndTargetInsideActiveLevel(state);
  idle.machineDisabled = 20;
  production.saboteur.phase = "sealing";
  production.saboteur.targetId = 0;
  production.saboteur.sealTime = 100;
  updateCity(idle, 1, { x: 0, y: 0, z: -10 });
  updateCity(production, 1, { x: 0, y: 0, z: -10 });
  assert.ok(production.temperature > idle.temperature);
  assert.ok(production.temperature - idle.temperature < 0.01);
});

test("sealed platforms warm the city compared with unsealed platforms", () => {
  const sealed = createCity();
  const unsealed = createCity();
  sealed.plots.forEach((plot) => (plot.kind = "asphalt"));
  unsealed.plots.forEach((plot) => (plot.kind = "soil"));
  sealed.machineDisabled = unsealed.machineDisabled = 100;
  advance(sealed, 10);
  advance(unsealed, 10);
  assert.ok(sealed.temperature > unsealed.temperature);
  assert.ok(sealed.temperature - unsealed.temperature < 1);
});

test("rain and each Schwammstadt cooling source lower the warming rate", () => {
  const asphalt = temperatureAfterOneSecond("asphalt");
  assert.ok(temperatureAfterOneSecond("tree") < asphalt);
  assert.ok(temperatureAfterOneSecond("soil") < asphalt);
  assert.ok(temperatureAfterOneSecond("pond") < asphalt);
  assert.ok(temperatureAfterOneSecond("shade") < asphalt);
  assert.ok(temperatureAfterOneSecond("asphalt", true) < asphalt);
});

test("heat above 30 C progressively dries SpongeBob and suppresses WaterFull", () => {
  const atThreshold = spongeWaterMorphWeights(400, 400, 30);
  const warmer = spongeWaterMorphWeights(400, 400, 37.5);
  const hotter = spongeWaterMorphWeights(400, 400, 42.5);
  const cooler = spongeWaterMorphWeights(400, 400, 29.99);
  assert.equal(cooler.dry, 0);
  assert.equal(atThreshold.dry, c.heatSystem.dryStartInfluence);
  assert.ok(atThreshold.waterFull < 1);
  assert.equal(spongeWaterMorphWeights(400, 400, 45).dry, 1);
  assert.ok(warmer.dry > 0 && warmer.dry < 1);
  assert.ok(warmer.waterFull < 1);
  assert.ok(hotter.dry > warmer.dry && hotter.dry < 1);
});

test("stored water smoothly spans dry, normal and full character endpoints", () => {
  const at = (litres: number) => spongeWaterMorphWeights(litres, 400, 27);
  assert.deepEqual(at(0), { dry: 1, waterFull: 0 });
  assert.ok(at(1).dry > 0.99 && at(1).dry < 1);
  assert.ok(at(100).dry >= 0.7 && at(100).dry <= 0.8);
  assert.deepEqual(at(200), { dry: 0, waterFull: 0 });
  assert.equal(at(300).waterFull, 0.5);
  assert.ok(at(396).waterFull > 0.99);
  assert.deepEqual(at(400), { dry: 0, waterFull: 1 });
});

test("less-frequent rain still cycles through every campaign level", () => {
  for (const level of cityLevels) {
    assert.ok(level.weather.dryDuration > level.weather.rainDuration);
    assert.ok(level.weather.rainRate < 16);
    const s = startCampaignAt(cityLevels.indexOf(level));
    s.elapsed = level.weather.dryDuration;
    assert.equal(weather(s).raining, true);
  }
});

test("fires start above 40 C, grow gradually, and consume stored water when sprayed", () => {
  const s = createCity();
  s.plots.forEach((plot) => (plot.kind = "asphalt"));
  s.machineDisabled = 200;
  s.temperature = 45;
  updateCity(s, 0.1, { x: 0, y: 0, z: -10 });
  assert.equal(s.fires.length, 1);
  const fire = s.fires[0];
  const initialIntensity = fire.intensity;
  updateCity(s, 1, { x: 0, y: 0, z: -10 });
  assert.ok(s.fires[0].intensity > initialIntensity);
  assert.ok(s.fires[0].intensity < initialIntensity + 0.01);
  assert.equal(
    s.fires.length,
    1,
    "additional fires wait for their configured interval",
  );

  s.sponge = 100;
  fire.intensity = 0.5;
  performCityAction(s, "spray", at(s, fire.plotId), fire.plotId, 50);
  assert.equal(s.sponge, 50);
  assert.equal(s.fires.length, 0);
  assert.equal(s.reused, 50);
});

test("fire view creates and removes lightweight 3D flame geometry", () => {
  const root = new THREE.Group();
  const update = createCityFireView(root);
  const state = createCity();
  const fire = { id: 1, plotId: 0, intensity: 0.7, size: 2 as const };
  update([fire], state.plots, { x: 0, z: 0 }, () => 0, 2);
  const view = root.getObjectByName("CityFire_1");
  assert.ok(view);
  assert.equal(view.children.length, 2);
  assert.ok(view.children.every((object) => (object as THREE.Mesh).isMesh));
  assert.ok(
    view.children.every(
      (object) => (object as THREE.Mesh).geometry instanceof THREE.ConeGeometry,
    ),
  );
  update([], state.plots, { x: 0, z: 0 }, () => 0, 3);
  assert.equal(root.getObjectByName("CityFire_1"), undefined);
});

test("fire frequency tiers increase and temperatures over 60 C end the game once", () => {
  assert.ok(c.heatSystem.fireIntervals[0] > c.heatSystem.fireIntervals[1]);
  assert.ok(c.heatSystem.fireIntervals[1] > c.heatSystem.fireIntervals[2]);
  assert.ok(c.heatSystem.fireIntervals[2] > c.heatSystem.fireIntervals[3]);
  const s = createCity();
  s.temperature = 60.01;
  updateCity(s, 1 / 60, { x: 0, y: 0, z: -10 });
  assert.equal(s.outcome, "lost");
  assert.equal(s.lossReason, "The city has overheated.");
  const elapsed = s.elapsed;
  updateCity(s, 1, { x: 0, y: 0, z: -10 });
  assert.equal(s.elapsed, elapsed);
});
