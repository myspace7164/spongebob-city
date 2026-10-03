import test from "node:test";
import assert from "node:assert/strict";
import { castPosition, characterAudibility } from "../src/game/cast.ts";
import { createCampaign } from "../src/game/campaign.ts";
import { gameplayColliders } from "../src/game/world-colliders.ts";
test("character routes freeze with city time and physical footprints follow wandering cast", () => {
  const s = createCampaign();
  const start = castPosition(s, 0);
  assert.deepEqual(castPosition(s, 0), start);
  s.elapsed = 4;
  assert.notDeepEqual(castPosition(s, 0), start);
  const position = castPosition(s, 0);
  const shape = gameplayColliders(s, () => 0).find(
    (c) => c.id === "character-patrick",
  )!.shape;
  assert.equal(shape.type, "circle");
  if (shape.type === "circle") {
    assert.equal(shape.x, position.x);
    assert.equal(shape.z, position.z);
  }
});
test("character voices get louder nearby and silent outside hearing range", () => {
  assert.equal(characterAudibility(0), 1);
  assert.ok(characterAudibility(3) > characterAudibility(8));
  assert.equal(characterAudibility(13), 0);
  assert.equal(characterAudibility(100), 0);
});
