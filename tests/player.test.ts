import assert from "node:assert/strict";
import test from "node:test";
import { createPlayer, updatePlayer } from "../src/game/player.ts";
import { gameConfig } from "../config/game.ts";
import type { MovementInput } from "../src/interfaces.ts";
const idle: MovementInput = { forward: 0, right: 0, run: false, jump: false };
function simulate(input: MovementInput, yaw = 0) {
  const player = createPlayer();
  for (let i = 0; i < 120; i++)
    updatePlayer(player, input, yaw, gameConfig.fixedStep);
  return player;
}
test("diagonal movement is no faster than straight movement", () => {
  const straight = simulate({ ...idle, forward: 1 });
  const diagonal = simulate({ ...idle, forward: 1, right: 1 });
  assert.ok(
    Math.abs(
      Math.hypot(diagonal.position.x, diagonal.position.z) -
        Math.abs(straight.position.z),
    ) < 1e-8,
  );
});
test("walking follows camera yaw and sprint increases speed", () => {
  const turned = simulate({ ...idle, forward: 1 }, Math.PI / 2);
  assert.ok(turned.position.x < -9);
  assert.ok(Math.abs(turned.position.z) < 1e-8);
  assert.ok(
    Math.abs(simulate({ ...idle, forward: 1, run: true }).position.z) >
      Math.abs(simulate({ ...idle, forward: 1 }).position.z),
  );
});
test("jump rises, rejects airborne jumping, and lands exactly on ground", () => {
  const player = createPlayer();
  updatePlayer(player, { ...idle, jump: true }, 0, gameConfig.fixedStep);
  assert.ok(player.position.y > 0);
  assert.equal(player.grounded, false);
  const velocity = player.velocity.y;
  updatePlayer(player, { ...idle, jump: true }, 0, gameConfig.fixedStep);
  assert.ok(player.velocity.y < velocity);
  for (let i = 0; i < 120; i++)
    updatePlayer(player, idle, 0, gameConfig.fixedStep);
  assert.equal(player.position.y, 0);
  assert.equal(player.velocity.y, 0);
  assert.equal(player.grounded, true);
});
test("releasing movement slows player to a stop", () => {
  const player = simulate({ ...idle, forward: 1 });
  for (let i = 0; i < 120; i++)
    updatePlayer(player, idle, 0, gameConfig.fixedStep);
  assert.ok(Math.abs(player.velocity.z) < 1e-8);
});
test("ground remains walkable far beyond the visible plane", () => {
  const player = createPlayer();
  player.position.x = 100000;
  player.position.z = -100000;
  for (let i = 0; i < 60; i++)
    updatePlayer(player, { ...idle, forward: 1 }, 0, gameConfig.fixedStep);
  assert.equal(player.grounded, true);
  assert.ok(player.position.z < -100004);
});
