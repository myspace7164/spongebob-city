import test from "node:test";
import assert from "node:assert/strict";
import { createCampaign } from "../src/game/campaign";
import {
  createCity,
  performCityAction,
  updateCity,
  spongeCapacity,
} from "../src/game/city";
import {
  activatePowerup,
  collectPowerups,
  isPowerupActive,
  powerupMultiplier,
  updatePowerups,
} from "../src/game/powerups";
import { createPlayer, updatePlayer } from "../src/game/player";
import { powerupConfig } from "../config/powerups";
import type { CityState, PowerupKind } from "../src/interfaces";
import { Rooms } from "../server/rooms";
import { AccountStore } from "../server/store";
const water = (s: CityState) =>
  s.sponge +
  s.plots.reduce((n, p) => n + p.surface + p.moisture + p.stored, 0) +
  s.evaporated +
  s.infiltrated -
  s.rainfall;
function pickup(s: CityState, id: PowerupKind) {
  s.powerups.pickups = [{ id, x: 0, z: 0, collected: false }];
  collectPowerups(s, { x: 0, y: 0, z: 0 });
}
test("one carried boost, Q activation once, new pickup replaces an active capacity boost without deleting water", () => {
  const s = createCampaign();
  assert.equal(s.powerups.pickups.length, 1);
  const p = s.powerups.pickups[0];
  collectPowerups(s, { ...p, y: 0 });
  assert.equal(s.powerups.held, "pore");
  assert.equal(s.powerups.active, null);
  assert.equal(activatePowerup(s), true);
  assert.equal(spongeCapacity(s), 1400);
  assert.equal(activatePowerup(s), false);
  s.sponge = 700;
  pickup(s, "confetti");
  assert.equal(s.powerups.active, null);
  assert.equal(s.powerTime, 0);
  assert.equal(spongeCapacity(s), 400);
  assert.equal(s.sponge, 700);
  assert.equal(s.powerups.held, "confetti");
  activatePowerup(s);
  assert.equal(isPowerupActive(s, "confetti"), true);
  updatePowerups(s, 19);
  assert.equal(s.powerups.active, null);
  assert.equal(s.powerups.held, null);
});
test("drops are sparse, never stack on the ground and keep every Basel/existing power in the pool", () => {
  const s = createCampaign();
  assert.equal(powerupConfig.items.length, 10);
  updatePowerups(s, 100);
  assert.equal(s.powerups.pickups.length, 1);
  assert.equal(s.powerups.pickups[0].id, "pore");
  const p = s.powerups.pickups[0];
  collectPowerups(s, { ...p, y: 0 });
  updatePowerups(s, 0.1);
  assert.equal(s.powerups.pickups.length, 1);
  assert.equal(s.powerups.dropIn, 60);
  const first = s.powerups.pickups[0];
  collectPowerups(s, { ...first, y: 0 });
  updatePowerups(s, 59);
  assert.equal(s.powerups.pickups[0].collected, true);
  updatePowerups(s, 1);
  assert.equal(s.powerups.pickups[0].collected, false);
  assert.equal(createCampaign().powerups.held, null);
});
test("single-use Basel boosts change speed, grants, transfer, sabotage, heat and reach", () => {
  const s = createCity();
  pickup(s, "laeckerli");
  activatePowerup(s);
  const a = createPlayer(),
    b = createPlayer(),
    move = { forward: 1, right: 0, jump: false, run: true };
  for (let i = 0; i < 60; i++) {
    updatePlayer(
      a,
      move,
      0,
      1 / 60,
      () => 0,
      powerupMultiplier(s, "laeckerli"),
    );
    updatePlayer(b, move, 0, 1 / 60);
  }
  assert.ok(Math.abs(a.position.z) > Math.abs(b.position.z) * 1.4);
  pickup(s, "confetti");
  activatePowerup(s);
  const plot = s.plots[0],
    pos = { ...plot, y: 0 };
  performCityAction(s, "karate", pos, 0);
  assert.equal(s.funding.earned, 80);
  performCityAction(s, "karate", pos, 0);
  assert.equal(s.funding.earned, 80);
  pickup(s, "rhine");
  activatePowerup(s);
  const conserved = water(s);
  performCityAction(s, "absorb", pos, 0, 30);
  assert.equal(s.sponge, 60);
  assert.ok(Math.abs(water(s) - conserved) < 1e-6);
  pickup(s, "basilisk");
  activatePowerup(s);
  s.saboteur.phase = "sealing";
  s.saboteur.targetId = 0;
  s.saboteur.sealTime = 1;
  s.saboteur.x = plot.x;
  s.saboteur.z = plot.z;
  updateCity(s, 0.2, { x: 999, y: 0, z: 999 });
  assert.equal(plot.kind, "soil");
  assert.equal(s.saboteur.phase, "disabled");
  const cool = createCity(),
    normal = createCity();
  pickup(cool, "lantern");
  activatePowerup(cool);
  updateCity(cool, 5, { x: 999, y: 0, z: 999 });
  updateCity(normal, 5, { x: 999, y: 0, z: 999 });
  assert.ok(cool.heat < normal.heat);
  pickup(s, "bell");
  activatePowerup(s);
  const distant = s.plots[2];
  performCityAction(s, "karate", { x: distant.x + 10, y: 0, z: distant.z }, 2);
  assert.equal(distant.kind, "soil");
});
test("Maximum, Patrick and bubbles remain real timed collectibles and preserve water", () => {
  const s = createCity();
  pickup(s, "maximum");
  activatePowerup(s);
  assert.equal(spongeCapacity(s), 4000);
  const conserved = water(s);
  updateCity(s, 1, { x: 0, y: 0, z: -10 });
  assert.ok(s.sponge > 0);
  assert.ok(Math.abs(water(s) - conserved) < 1e-6);
  updateCity(s, 8, { x: 999, y: 0, z: 999 });
  assert.equal(spongeCapacity(s), 400);
  assert.ok(s.sponge > 0);
  pickup(s, "patrick");
  activatePowerup(s);
  updateCity(s, 0.1, { x: 0, y: 0, z: -10 });
  assert.ok(s.plots.some((p) => p.kind === "soil"));
  const soil = s.plots.find((p) => p.kind === "soil")!;
  pickup(s, "bubbles");
  activatePowerup(s);
  s.sponge = 100;
  const reused = s.reused;
  performCityAction(
    s,
    "spray",
    { x: soil.x + 10, y: 0, z: soil.z },
    soil.id,
    10,
    true,
  );
  assert.ok(s.reused > reused);
  assert.equal(s.upgraded, false);
  assert.equal(s.powerups.active, "bubbles");
});
test("co-op pickup is claimed once, Q consumes it for everyone and clients cannot activate invented powers", () => {
  const store = new AccountStore(":memory:");
  try {
    const rooms = new Rooms(store),
      a = store.create("PickupAlpha").account,
      b = store.create("PickupBeta").account;
    const room = rooms.create(a);
    rooms.join(b, room.code);
    rooms.command(a.id, {
      ready: true,
      movement: { forward: 1, right: -1, run: false, jump: false },
      yaw: 0,
    });
    for (let i = 0; i < 8; i++) rooms.tick(0.1);
    assert.equal(rooms.current(b.id)!.city.powerups.held, "pore");
    rooms.command(a.id, { powerup: true });
    assert.equal(rooms.current(b.id)!.city.powerups.active, "pore");
    assert.equal(rooms.current(a.id)!.city.powerups.held, null);
    rooms.command(b.id, { powerup: true });
    assert.equal(rooms.current(a.id)!.city.powerups.active, "pore");
    assert.throws(() => rooms.command(a.id, { action: "maximum" }), /Unknown/);
  } finally {
    store.close();
  }
});
