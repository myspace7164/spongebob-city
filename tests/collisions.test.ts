import test from "node:test";
import assert from "node:assert/strict";
import { createPlayer } from "../src/game/player";
import { resolvePlayerCollisions, cityObstacles } from "../src/game/collisions";
import { castPosition, characterAudibility } from "../src/game/cast";
import { createCampaign } from "../src/game/campaign";

test("swept collision blocks sprint tunneling and slides along walls", () => {
  const p = createPlayer();
  p.position = { x: 0, y: 0, z: -8 };
  p.velocity.z = -9;
  resolvePlayerCollisions(p, { x: 0, y: 0, z: 0 }, [
    { x: 0, z: -3, halfX: 3, halfZ: 0.3 },
  ]);
  assert.ok(p.position.z > -2.3);
  assert.equal(p.velocity.z, 0);
  p.position = { x: 2, y: 0, z: -4 };
  resolvePlayerCollisions(p, { x: 0, y: 0, z: 0 }, [
    { x: 0, z: -3, halfX: 3, halfZ: 0.3 },
  ]);
  assert.ok(p.position.x > 1.8);
  assert.ok(p.position.z > -2.3);
});
test("character routes freeze with city time and collision includes cast and solid props", () => {
  const s = createCampaign();
  const start = castPosition(s, 0);
  assert.deepEqual(castPosition(s, 0), start);
  s.elapsed = 4;
  assert.notDeepEqual(castPosition(s, 0), start);
  assert.ok(cityObstacles(s).length > 10);
  const p = createPlayer();
  const pos = castPosition(s, 0);
  p.position = { ...pos, y: 0 };
  resolvePlayerCollisions(p, p.position, [{ ...pos, radius: 0.65 }]);
  assert.ok(Math.hypot(p.position.x - pos.x, p.position.z - pos.z) >= 1);
});
test("character voices get louder nearby and are completely silent outside hearing range", () => {
  assert.equal(characterAudibility(0), 1);
  assert.ok(characterAudibility(3) > characterAudibility(8));
  assert.equal(characterAudibility(13), 0);
  assert.equal(characterAudibility(100), 0);
});
