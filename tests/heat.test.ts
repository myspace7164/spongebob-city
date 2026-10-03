import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { cityConfig as c } from "../config/city.ts";
import { createCity, performCityAction, updateCity } from "../src/game/city.ts";
import { spongeWaterMorphWeights } from "../src/game/assets.ts";
import { createCityFireView } from "../src/game/city-fire-view.ts";
import type { CityState, PlotKind } from "../src/interfaces.ts";

const at = (s: CityState, id: number) => ({ ...s.plots[id], y: 0 });
function advance(s: CityState, seconds: number) {
  const steps = Math.ceil(seconds * 60);
  const dt = seconds / steps;
  for (let i = 0; i < steps; i++) updateCity(s, dt, { x: 0, y: 0, z: -10 });
}
function temperatureAfterOneSecond(kind: PlotKind, raining = false): number {
  const s = createCity();
  s.plots.forEach((plot) => {
    plot.kind = kind;
    if (kind === "tree") plot.moisture = c.moistureHealthy;
  });
  s.machineDisabled = 20;
  if (raining) s.elapsed = c.dryDuration - 1;
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
  assert.ok(asphalt.temperature < 27.3, "ten seconds must not cause a spike");
  assert.ok(asphalt.temperature > shade.temperature);
  assert.ok(asphalt.heat > 0);
});

test("Dr. Beton sealing adds gradual heat pressure beyond the sealed surface", () => {
  const idle = createCity();
  const production = createCity();
  for (const state of [idle, production])
    state.plots.forEach((plot) => (plot.kind = "soil"));
  idle.machineDisabled = 20;
  production.saboteur.phase = "sealing";
  production.saboteur.targetId = 0;
  production.saboteur.sealTime = 100;
  updateCity(idle, 1, { x: 0, y: 0, z: -10 });
  updateCity(production, 1, { x: 0, y: 0, z: -10 });
  assert.ok(production.temperature > idle.temperature);
  assert.ok(production.temperature - idle.temperature < 0.005);
});

test("rain and each Schwammstadt cooling source lower the warming rate", () => {
  const asphalt = temperatureAfterOneSecond("asphalt");
  assert.ok(temperatureAfterOneSecond("tree") < asphalt);
  assert.ok(temperatureAfterOneSecond("soil") < asphalt);
  assert.ok(temperatureAfterOneSecond("pond") < asphalt);
  assert.ok(temperatureAfterOneSecond("shade") < asphalt);
  assert.ok(temperatureAfterOneSecond("asphalt", true) < asphalt);
});

test("heat above 36 C gradually dries SpongeBob and suppresses WaterFull", () => {
  const atThreshold = spongeWaterMorphWeights(400, 400, 36);
  const justAbove = spongeWaterMorphWeights(400, 400, 36.1);
  const warmer = spongeWaterMorphWeights(400, 400, 40);
  assert.equal(atThreshold.dry, 0);
  assert.equal(atThreshold.waterFull, 1);
  assert.ok(justAbove.dry > 0 && justAbove.dry < 0.02);
  assert.ok(warmer.dry > 0 && warmer.dry < 1);
  assert.ok(warmer.waterFull < 1);
  assert.equal(spongeWaterMorphWeights(400, 400, 44).dry, 1);
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
