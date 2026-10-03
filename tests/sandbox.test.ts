import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createSandbox } from "../src/game/sandbox.ts";
import { createInventory, selectSlot } from "../src/game/inventory.ts";
import { createPlayer } from "../src/game/player.ts";
import { itemConfig } from "../config/items.ts";

test("placing, shooting the placed block, shooting a target and reset operate on the scene", () => {
  const previousDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  const previousStyle = Object.getOwnPropertyDescriptor(
    globalThis,
    "getComputedStyle",
  );
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { documentElement: {} },
  });
  Object.defineProperty(globalThis, "getComputedStyle", {
    configurable: true,
    value: () => ({ getPropertyValue: () => "#ffffff" }),
  });
  try {
    const scene = new THREE.Scene();
    const character = new THREE.Group();
    scene.add(character);
    const sandbox = createSandbox(scene, character);
    const inventory = createInventory();
    const player = createPlayer();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 150);
    camera.position.set(0, 2, 7);
    const aimAt = (x: number, y: number, z: number) => {
      camera.lookAt(x, y, z);
      camera.updateMatrixWorld();
      scene.updateMatrixWorld();
    };
    const initialChildren = scene.children.length;
    selectSlot(inventory, 2);
    aimAt(0, 0, -3);
    assert.match(sandbox.use(inventory, player, camera), /Block placed/);
    assert.equal(inventory.blocks, itemConfig.maxBlocks - 1);
    assert.equal(scene.children.length, initialChildren + 1);
    assert.doesNotMatch(sandbox.use(inventory, player, camera), /Block placed/);
    selectSlot(inventory, 1);
    aimAt(0, 0.5, -3);
    assert.equal(sandbox.use(inventory, player, camera), "Block removed.");
    assert.equal(inventory.blocks, itemConfig.maxBlocks);
    assert.equal(scene.children.length, initialChildren);
    sandbox.update(inventory, player, camera, itemConfig.shotCooldown, true);
    aimAt(0, itemConfig.targetSize / 2, -12);
    assert.equal(sandbox.use(inventory, player, camera), "Target hit!");
    assert.equal(scene.children.length, initialChildren - 1);
    sandbox.reset();
    assert.equal(scene.children.length, initialChildren);
  } finally {
    if (previousDocument)
      Object.defineProperty(globalThis, "document", previousDocument);
    else Reflect.deleteProperty(globalThis, "document");
    if (previousStyle)
      Object.defineProperty(globalThis, "getComputedStyle", previousStyle);
    else Reflect.deleteProperty(globalThis, "getComputedStyle");
  }
});
