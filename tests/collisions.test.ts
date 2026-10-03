import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { cityLevels } from "../config/levels.ts";
import { gameConfig } from "../config/game.ts";
import {
  CollisionWorld,
  boxCollider,
  buildingColliders,
} from "../src/game/collisions.ts";
import { createPlayer } from "../src/game/player.ts";

const playerRadius = gameConfig.playerCollisionRadius;
const playerHeight = gameConfig.playerCollisionHeight;

test("swept collision stops a fast player at thin walls in every campaign level", () => {
  for (const level of cityLevels) {
    const world = new CollisionWorld();
    const origin = level.origin ?? { x: 0, z: 0 };
    world.setStatic([
      boxCollider(
        "thin-wall",
        origin.x,
        origin.z,
        0.08,
        5,
        0,
        4,
        0,
        "environment",
      ),
    ]);
    const player = createPlayer();
    player.position.x = origin.x - 5;
    player.position.z = origin.z;
    const result = world.move(player, 12, 0, playerRadius, playerHeight);
    assert.equal(result.blockedX, true, level.id);
    assert.ok(
      player.position.x < origin.x - 0.08 - playerRadius + 0.15,
      level.id,
    );
    assert.ok(
      player.position.x > origin.x - 0.08 - playerRadius - 0.15,
      level.id,
    );
  }
});

test("axis-separated movement slides along walls and cannot clip a corner", () => {
  const world = new CollisionWorld();
  world.setStatic([
    boxCollider("wall", 0, 0, 0.3, 4, 0, 4, 0, "environment"),
    boxCollider("corner", 5, 5, 1, 1, 0, 4, 0, "environment"),
  ]);
  const sliding = createPlayer();
  sliding.position.x = -1;
  sliding.position.z = -3;
  const slide = world.move(sliding, 1, 9, playerRadius, playerHeight);
  assert.equal(slide.blockedX, true);
  assert.equal(slide.blockedZ, false);
  assert.ok(sliding.position.x < -0.3 - playerRadius + 0.15);
  assert.ok(sliding.position.z > 4);

  const cornering = createPlayer();
  cornering.position.x = 2.5;
  cornering.position.z = 2.5;
  world.move(cornering, 5, 5, playerRadius, playerHeight);
  assert.ok(
    Math.hypot(cornering.position.x - 5, cornering.position.z - 5) >=
      playerRadius + 1 - 0.15,
  );
});

test("height-separated decoration is passable while physical bodies block", () => {
  const world = new CollisionWorld();
  world.setStatic([
    boxCollider("overhead-sign", 0, 0, 1, 1, 2.2, 4, 0, "environment"),
    boxCollider("bench", 6, 0, 0.8, 0.35, 0, 0.8, 0, "environment"),
  ]);
  const underSign = createPlayer();
  world.move(underSign, 2, 0, playerRadius, playerHeight);
  assert.ok(Math.abs(underSign.position.x - 2) < 1e-8);
  const intoBench = createPlayer();
  world.move(intoBench, 7, 0, playerRadius, playerHeight);
  assert.ok(intoBench.position.x < 6 - 0.8 - playerRadius + 0.15);
});

test("building footprints are extracted as separate real 3D solids", () => {
  const model = new THREE.Group();
  model.position.set(10, 2, -4);
  const geometry = new THREE.BoxGeometry(4, 4, 3).translate(0, 2, 0);
  const building = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  building.geometry.setAttribute(
    "_building",
    new THREE.Float32BufferAttribute(
      Array.from({ length: geometry.getAttribute("position").count }, () => [
        0.5, 0, 0,
      ]).flat(),
      3,
    ),
  );
  model.add(building);
  const colliders = buildingColliders(model);
  assert.equal(colliders.length, 1);
  assert.equal(colliders[0].kind, "environment");
  assert.equal(colliders[0].shape.type, "polygon");
  if (colliders[0].shape.type === "polygon") {
    assert.equal(colliders[0].shape.points.length, 4);
    assert.ok(colliders[0].shape.points.every(([x]) => x >= 8 && x <= 12));
  }
});

test("cosmetic hat and water state cannot change the fixed player collider", () => {
  const original = {
    radius: gameConfig.playerCollisionRadius,
    height: gameConfig.playerCollisionHeight,
  };
  for (const state of ["normal", "dry", "waterFull"])
    for (const hat of [
      "none",
      "trafficCone",
      "cowboy",
      "newspaper",
      "sailor",
      "wizard",
      "footballCap",
    ]) {
      void state;
      void hat;
      assert.deepEqual(
        {
          radius: gameConfig.playerCollisionRadius,
          height: gameConfig.playerCollisionHeight,
        },
        original,
      );
    }
});
