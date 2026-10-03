import assert from "node:assert/strict";
import test from "node:test";
import { gameConfig } from "../config/game.ts";
import { createCity, sweatDuringSprint } from "../src/game/city.ts";
import { createPlayer, updatePlayer } from "../src/game/player.ts";

const step = gameConfig.fixedStep;
const sprint = { forward: 1, right: 0, run: true, jump: false };
const walk = { ...sprint, run: false };

test("Shift sprint is limited to ten seconds, rests three, then renews", () => {
  const player = createPlayer();
  for (let i = 0; i < 601 && player.sprintCooldown === 0; i++)
    updatePlayer(player, sprint, 0, step);
  assert.ok(player.sprintCooldown! > 2.9);
  assert.equal(player.sprinting, true);

  let cooldownSteps = 0;
  while (player.sprintCooldown! > 0 && cooldownSteps < 200) {
    updatePlayer(player, sprint, 0, step);
    assert.equal(player.sprinting, false);
    cooldownSteps++;
  }
  assert.ok(
    cooldownSteps >= Math.floor(gameConfig.sprintCooldownSeconds / step),
  );
  assert.equal(player.sprintCooldown, 0);
  updatePlayer(player, sprint, 0, step);
  assert.equal(player.sprinting, true);

  for (let i = 0; i < 602 && player.sprintCooldown === 0; i++)
    updatePlayer(player, sprint, 0, step);
  assert.ok(player.sprintCooldown! > 2.9);
});

test("releasing Shift does not reset the consumed sprint time", () => {
  const player = createPlayer();
  for (let i = 0; i < 9 * 60; i++) updatePlayer(player, sprint, 0, step);
  updatePlayer(player, walk, 0, step);
  for (let i = 0; i < 60 && player.sprintCooldown === 0; i++)
    updatePlayer(player, sprint, 0, step);
  assert.ok(player.sprintCooldown! > 2.9);
  assert.equal(player.sprinting, true);
});

test("active sprint gradually sweats stored water without underflow", () => {
  const city = createCity();
  city.sponge = 200;
  const player = createPlayer();
  const beforeTotal = city.sponge + city.evaporated;
  for (let i = 0; i < 120; i++) {
    updatePlayer(player, sprint, 0, step);
    sweatDuringSprint(city, player, step);
  }
  assert.equal(player.sprinting, true);
  assert.ok(city.sponge < 200 && city.sponge > 180);
  assert.ok(Math.abs(city.sponge + city.evaporated - beforeTotal) < 1e-8);

  city.sponge = 0.01;
  const evaporatedBeforeLastDrop = city.evaporated;
  for (let i = 0; i < 120; i++) {
    updatePlayer(player, sprint, 0, step);
    sweatDuringSprint(city, player, step);
  }
  assert.equal(city.sponge, 0);
  assert.ok(city.evaporated - evaporatedBeforeLastDrop <= 0.010001);
  updatePlayer(player, walk, 0, step);
  assert.equal(player.sprinting, false);
});
