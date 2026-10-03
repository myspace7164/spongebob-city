import test from "node:test";
import assert from "node:assert/strict";
import { createCampaign } from "../src/game/campaign";
import { performCityAction } from "../src/game/city";
import { isToolAvailable, levelsUntilTool } from "../src/game/progression";
import { cityTools } from "../config/city";
test("level tools unlock in the same order as missions; locked actions cannot spend money or change plots", () => {
  const s = createCampaign();
  assert.deepEqual(
    cityTools.filter((t) => isToolAvailable(s, t.id)).map((t) => t.id),
    ["absorb", "spray", "karate", "basin"],
  );
  const plot = s.plots[2],
    position = { ...plot, y: 0 };
  performCityAction(s, "karate", position, 2);
  const budget = s.budget;
  performCityAction(s, "tree", position, 2);
  assert.equal(plot.kind, "soil");
  assert.equal(s.budget, budget);
  assert.equal(levelsUntilTool(s, "tank"), 3);
  s.campaign!.level = 1;
  assert.equal(isToolAvailable(s, "tree"), true);
  assert.equal(levelsUntilTool(s, "roof"), 1);
  s.campaign!.level = 2;
  assert.equal(isToolAvailable(s, "roof"), true);
  assert.equal(isToolAvailable(s, "shade"), true);
  assert.equal(isToolAvailable(s, "pond"), false);
  s.campaign!.level = 3;
  assert.ok(cityTools.every((t) => isToolAvailable(s, t.id)));
});
