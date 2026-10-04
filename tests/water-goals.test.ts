import assert from "node:assert/strict";
import test from "node:test";
import { cityLevels } from "../config/levels.ts";
import { createCampaign, levelAchievements } from "../src/game/campaign.ts";
import {
  waterUsageDisplayValue,
  waterUsageReached,
} from "../src/game/water-goals.ts";

test("water-use thresholds pass at the exact required litres", () => {
  for (const target of [100, 250, 400, 1000]) {
    assert.equal(waterUsageReached(target - 1, target), false);
    assert.equal(waterUsageReached(target, target), true);
    assert.equal(waterUsageReached(target + 1, target), true);
  }
});

test("water progress resists floating-point noise without rounding up early", () => {
  assert.equal(waterUsageReached(399.9999997, 400), true);
  assert.equal(waterUsageDisplayValue(399.9999997, 400), 400);
  assert.equal(waterUsageReached(399.5, 400), false);
  assert.equal(waterUsageDisplayValue(399.5, 400), 399);
});

test("campaign water-use objectives complete at their configured thresholds", () => {
  const state = createCampaign();
  for (const target of [400, 1000]) {
    const levelIndex = cityLevels.findIndex((level) =>
      level.goals.some(
        (goal) => goal.metric === "reused" && goal.target === target,
      ),
    );
    assert.notEqual(levelIndex, -1, `${target} L objective exists`);
    state.campaign!.level = levelIndex;
    state.reused = target - 1;
    assert.equal(
      levelAchievements(state).find((goal) => goal.metric === "reused")!.done,
      false,
    );
    state.reused = target;
    assert.equal(
      levelAchievements(state).find((goal) => goal.metric === "reused")!.done,
      true,
    );
  }
});
