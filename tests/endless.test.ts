import assert from "node:assert/strict";
import test from "node:test";
import { cityLevels } from "../config/levels.ts";
import { cityConfig } from "../config/city.ts";
import {
  createCampaign,
  startEndless,
  advanceCampaign,
  currentLevel,
  endlessIntensity,
} from "../src/game/campaign.ts";
import { isToolAvailable } from "../src/game/progression.ts";
import { updateCity } from "../src/game/city.ts";
import { updateWater } from "../src/game/city-water.ts";

test("endless entry requires victory and retains campaign completion and hats", () => {
  const s = createCampaign(() => 0);
  assert.equal(startEndless(s), false);
  s.outcome = "won";
  s.campaign!.completed = cityLevels.map((level) => level.id);
  s.campaign!.ownedHats = ["cowboy"];
  s.campaign!.equippedHat = "cowboy";
  assert.equal(
    startEndless(s, () => 0),
    true,
  );
  assert.equal(s.campaign!.level, 0);
  assert.equal(s.campaign!.endlessRound, 1);
  assert.equal(s.outcome, "playing");
  assert.equal(isToolAvailable(s, "tank"), true);
  assert.equal(s.campaign!.equippedHat, "cowboy");
  assert.deepEqual(s.campaign!.ownedHats, ["cowboy"]);
  assert.equal(s.campaign!.completed.length, cityLevels.length);
  assert.equal(startEndless(s), false);
  assert.equal(advanceCampaign(s), false);
});

test("completed endless rounds reset even when the same random level repeats", () => {
  const s = createCampaign();
  s.outcome = "won";
  startEndless(s, () => 0);
  for (const p of s.plots) {
    p.kind = "basin";
    p.moisture = 200;
  }
  s.reused = 10000;
  s.campaign!.stormCompleted = true;
  assert.equal(
    advanceCampaign(s, () => 0),
    true,
  );
  assert.equal(s.campaign!.level, 0);
  assert.equal(s.campaign!.endlessRound, 2);
  assert.equal(s.outcome, "playing");
  assert.equal(s.elapsed, 0);
  assert.equal(s.reused, 0);
  assert.equal(s.campaign!.stormCompleted, false);
  assert.ok(s.plots.every((p) => p.kind === "asphalt"));
  assert.equal(s.campaign!.wheelPending, false);
  const retry = structuredClone(s);
  assert.equal(retry.campaign!.endlessRound, 2);
  assert.equal(
    currentLevel(retry)!.weather.rainRate,
    currentLevel(s)!.weather.rainRate,
  );
});

test("rainfall and actual warming increase across rounds independent of random layout", () => {
  const states = [0, 0.999, 0].map((random, i) => {
    const s = createCampaign();
    s.outcome = "won";
    startEndless(s, () => random);
    s.campaign!.endlessRound = i + 1;
    s.machineDisabled = 100;
    return s;
  });
  const warming: number[] = [];
  const rainfall: number[] = [];
  for (const s of states) {
    const before = s.temperature;
    updateCity(s, 0.1, { x: 10000, y: 0, z: 10000 });
    warming.push(s.temperature - before);
    updateWater(s, 1, true);
    rainfall.push(s.rainfall);
    assert.equal(
      currentLevel(s)!.weather.rainRate,
      cityLevels.at(-1)!.weather.rainRate * endlessIntensity(s),
    );
    assert.ok(s.temperature < cityConfig.heatSystem.gameOverCelsius);
  }
  assert.ok(warming[1] > warming[0] && warming[2] > warming[1]);
  assert.ok(rainfall[1] > rainfall[0] && rainfall[2] > rainfall[1]);
});
