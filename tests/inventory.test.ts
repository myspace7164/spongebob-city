import assert from "node:assert/strict";
import test from "node:test";
import {
  createInventory,
  selectSlot,
  fire,
  reload,
  canPlace,
} from "../src/game/inventory.ts";
import { itemConfig } from "../config/items.ts";

test("shooting requires the gun, enforces cooldown, spends ammo and reloads", () => {
  const inventory = createInventory();
  assert.equal(fire(inventory), false);
  selectSlot(inventory, 1);
  assert.equal(fire(inventory), true);
  assert.equal(inventory.ammo, itemConfig.magazineSize - 1);
  assert.equal(fire(inventory), false);
  while (inventory.ammo > 0) {
    inventory.cooldown = 0;
    assert.equal(fire(inventory), true);
  }
  inventory.cooldown = 0;
  assert.equal(fire(inventory), false);
  reload(inventory);
  assert.equal(inventory.ammo, itemConfig.magazineSize);
  selectSlot(inventory, 99);
  assert.equal(inventory.selected, 1);
});
test("placement rejects player overlap, duplicates, out-of-reach coordinates and depleted supply", () => {
  const inventory = createInventory();
  const player = { x: 0, y: 0, z: 0 };
  selectSlot(inventory, 2);
  assert.equal(canPlace(inventory, { x: 2, z: -3 }, player, []), true);
  assert.equal(canPlace(inventory, { x: 0, z: 0 }, player, []), false);
  assert.equal(
    canPlace(inventory, { x: 2, z: -3 }, player, [{ x: 2, z: -3 }]),
    false,
  );
  assert.equal(canPlace(inventory, { x: 99, z: 0 }, player, []), false);
  assert.equal(canPlace(inventory, { x: NaN, z: 0 }, player, []), false);
  inventory.blocks = 0;
  assert.equal(canPlace(inventory, { x: 2, z: -3 }, player, []), false);
});
