import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { hatPrice, hats } from "../config/hats.ts";
import { createHatModel, purchaseHat } from "../src/game/hats.ts";
import { createCampaign } from "../src/game/campaign.ts";
import { createPlayer } from "../src/game/player.ts";
import { updateCity } from "../src/game/city.ts";

test("the six hat catalogue entries all cost exactly 1,000 coins", () => {
  assert.equal(hats.length, 6);
  assert.ok(hats.every((hat) => hat.price === 1000));
  assert.equal(hatPrice, 1000);
});

test("999 coins cannot buy a hat and 1,000 coins buys exactly one", () => {
  const poor = createCampaign();
  poor.budget = 999;
  assert.equal(purchaseHat(poor, "cowboy"), false);
  assert.equal(poor.budget, 999);
  assert.equal(poor.campaign!.equippedHat, null);

  const exact = createCampaign();
  exact.budget = 1000;
  assert.equal(purchaseHat(exact, "cowboy"), true);
  assert.equal(exact.budget, 0);
  assert.equal(exact.campaign!.equippedHat, "cowboy");
});

test("2,500 coins become 1,500 and buying a second hat charges again", () => {
  const state = createCampaign();
  state.budget = 2500;
  assert.equal(purchaseHat(state, "cowboy"), true);
  assert.equal(state.budget, 1500);
  assert.equal(purchaseHat(state, "wizard"), true);
  assert.equal(state.budget, 500);
  assert.equal(state.campaign!.equippedHat, "wizard");
});

test("loss removes only the run hat and leaves the remaining coin balance", () => {
  const state = createCampaign();
  state.campaign!.equippedHat = "sailor";
  state.budget = 735;
  state.temperature = 61;
  updateCity(state, 1 / 60, { x: 0, y: 0, z: 0 });
  assert.equal(state.outcome, "lost");
  assert.equal(state.campaign!.equippedHat, null);
  assert.equal(state.budget, 735);
});

test("every hat is real 3D geometry and does not alter player collision state", () => {
  const player = createPlayer();
  const before = structuredClone(player);
  for (const hat of hats) {
    const model = createHatModel(hat.id);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    assert.equal(model.userData.hatId, hat.id);
    assert.ok(size.x > 0.4 && size.y > 0.2 && size.z > 0.2);
    assert.ok(model.children.some((child) => (child as THREE.Mesh).isMesh));
  }
  assert.deepEqual(player, before);
});
