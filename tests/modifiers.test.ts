import assert from "node:assert/strict";
import test from "node:test";
import { levelModifiers } from "../config/modifiers.ts";
import { cityConfig as c } from "../config/city.ts";
import {
  advanceCampaign,
  createCampaign,
  startNextCampaignLevel,
} from "../src/game/campaign.ts";
import {
  effectivePlayerVisualScale,
  modifierMultiplier,
  chooseLevelModifier,
  modifierAtWheelPointer,
  wheelLandingRotation,
} from "../src/game/level-modifiers.ts";
import { createPlayer, updatePlayer } from "../src/game/player.ts";
import { spongeCapacity, updateCity } from "../src/game/city.ts";

function satisfyCurrentLevel(state: ReturnType<typeof createCampaign>): void {
  state.plots.forEach((plot, index) => {
    plot.kind = index < 3 ? "tree" : "basin";
    plot.surface = 0;
    plot.moisture = index < 3 ? c.moistureHealthy : 0;
  });
  Object.assign(state, { reused: 2000, heat: 0, flood: 0 });
  state.campaign!.stormCompleted = true;
}

test("wheel lists eight weighted outcomes with a transparent 60/40 split", () => {
  assert.equal(levelModifiers.length, 8);
  for (let index = 0; index < levelModifiers.length; index += 1) {
    const current = levelModifiers[index]!;
    const next = levelModifiers[(index + 1) % levelModifiers.length]!;
    assert.notEqual(current.kind, next.kind);
  }
  assert.equal(
    levelModifiers
      .filter((entry) => entry.kind === "positive")
      .reduce((sum, entry) => sum + entry.weight, 0) /
      levelModifiers.reduce((sum, entry) => sum + entry.weight, 0),
    0.6,
  );
  assert.equal(
    levelModifiers
      .filter((entry) => entry.kind === "negative")
      .reduce((sum, entry) => sum + entry.weight, 0) /
      levelModifiers.reduce((sum, entry) => sum + entry.weight, 0),
    0.4,
  );
  assert.equal(
    chooseLevelModifier(() => 0),
    "speedBoost",
  );
  assert.equal(
    chooseLevelModifier(() => 0.999999),
    "heatWave",
  );
  for (const modifier of levelModifiers) {
    assert.equal(
      modifierAtWheelPointer(wheelLandingRotation(modifier.id) + 6 * 360),
      modifier.id,
    );
  }
});

test("one selected modifier starts only the next level and expires at its completion", () => {
  const state = createCampaign();
  satisfyCurrentLevel(state);
  assert.equal(advanceCampaign(state), true);
  assert.equal(state.campaign!.wheelPending, true);
  assert.equal(state.campaign!.activeModifier, null);
  assert.equal(state.campaign!.level, 0);
  assert.equal(startNextCampaignLevel(state), false);
  state.campaign!.pendingModifier = "miniSponge";
  assert.equal(startNextCampaignLevel(state), true);
  assert.equal(state.campaign!.activeModifier, "miniSponge");
  assert.equal(state.campaign!.wheelPending, false);
  assert.equal(modifierMultiplier(state, "playerScale"), 0.2);
  assert.equal(modifierMultiplier(state, "waterCapacity"), 1);
  assert.equal(spongeCapacity(state), c.capacity);
  assert.equal(effectivePlayerVisualScale(state), 0.2);
  assert.equal(effectivePlayerVisualScale(state, 2.5), 0.2);
  state.upgraded = true;
  assert.equal(spongeCapacity(state), c.upgradedCapacity);
  satisfyCurrentLevel(state);
  assert.equal(advanceCampaign(state), true);
  assert.equal(state.campaign!.activeModifier, null);
  assert.equal(state.campaign!.wheelPending, true);
});

test("temporary effects calculate from base values without stat drift", () => {
  const state = createCampaign();
  const player = createPlayer();
  state.campaign!.activeModifier = "speedBoost";
  updatePlayer(
    player,
    { forward: 1, right: 0, run: false, jump: false },
    0,
    0.1,
    undefined,
    modifierMultiplier(state, "playerSpeed"),
  );
  assert.ok(player.velocity.z < 0);
  assert.equal(modifierMultiplier(state, "playerSpeed"), 1.25);
  state.campaign!.activeModifier = null;
  const next = createPlayer();
  updatePlayer(next, { forward: 1, right: 0, run: false, jump: false }, 0, 0.1);
  assert.ok(Math.abs(player.velocity.z / next.velocity.z - 1.25) < 0.001);
  state.campaign!.activeModifier = "waterBoost";
  assert.equal(spongeCapacity(state), c.capacity * 1.25);
  state.campaign!.activeModifier = null;
  assert.equal(spongeCapacity(state), c.capacity);
  const expectations = [
    ["slowBeton", "betonSpeed", 0.75],
    ["doubleCoins", "coinReward", 2],
    ["reducedWater", "absorptionSpeed", 0.75],
    ["angryBeton", "betonSpeed", 1.2],
    ["heatWave", "heatWarming", 1.12],
  ] as const;
  for (const [id, key, expected] of expectations) {
    state.campaign!.activeModifier = id;
    assert.equal(modifierMultiplier(state, key), expected);
  }
  const normal = createCampaign();
  const hot = createCampaign();
  hot.campaign!.activeModifier = "heatWave";
  updateCity(normal, 0.5, { x: 0, y: 0, z: 0 });
  updateCity(hot, 0.5, { x: 0, y: 0, z: 0 });
  assert.ok(hot.temperature > normal.temperature);
});
