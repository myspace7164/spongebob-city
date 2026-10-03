import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { mapConfig } from "../config/map.ts";
import { riehenringSite } from "../config/levels.ts";
import { roadGeometry } from "../src/game/map-layers.ts";
import { createPlayer, updatePlayer } from "../src/game/player.ts";
import { sceneryPose, worldToMap } from "../src/game/streets.ts";
import {
  heightAt,
  terrainFromBuffer,
  terrainTiles,
} from "../src/game/terrain.ts";
import type { RoadNetwork, TerrainGrid } from "../src/interfaces.ts";

const meta = JSON.parse(readFileSync("public/maps/basel-terrain.json", "utf8"));
const basel = terrainFromBuffer(
  meta,
  readFileSync("public/maps/basel-terrain.bin").buffer.slice(0),
);
/** 3 × 3 nodes, 2 m apart: a ramp rising 1 m per node eastwards plus a bump. */
const small: TerrainGrid = {
  bounds: [0, 0, 4, 4],
  spacing: 2,
  columns: 3,
  rows: 3,
  heights: Float32Array.from([0, 1, 2, 0, 3, 2, 0, 1, 2]),
};

test("the Basel grid decodes and matches swisstopo heights at play areas", () => {
  assert.equal(basel.heights.length, basel.columns * basel.rows);
  assert.ok(Math.abs(heightAt(basel, 0, 0) - 1.5) < 0.6);
  const [x, z] = riehenringSite.origin;
  assert.ok(Math.abs(heightAt(basel, x, z) + 12.4) < 0.6);
  assert.throws(() =>
    terrainFromBuffer({ ...meta, rows: 1 }, new ArrayBuffer(8)),
  );
});

test("heights hit grid nodes, interpolate continuously and clamp at the edge", () => {
  assert.equal(heightAt(small, 2, 2), 3);
  assert.equal(heightAt(small, 4, 0), 2);
  assert.equal(heightAt(small, 1, 0), 0.5);
  // Both triangles agree along the shared diagonal of a cell.
  for (const t of [0.2, 0.5, 0.8]) {
    const x = 2 + 2 * t,
      z = 2 - 2 * t + 2;
    const below = heightAt(small, x - 1e-6, z - 1e-6);
    const above = heightAt(small, x + 1e-6, z + 1e-6);
    assert.ok(Math.abs(below - above) < 1e-4);
  }
  assert.equal(heightAt(small, -10, -10), 0);
  assert.equal(heightAt(small, 99, 99), heightAt(small, 4, 4));
});

test("terrain tiles carry the grid heights and keep the mission on plain ground", () => {
  const tiles = terrainTiles(small, small.bounds, {
    left: 0,
    right: 2,
    back: 0,
    front: 2,
  });
  assert.equal(tiles.length, 1);
  const { photo, plain } = tiles[0];
  const y = photo.getAttribute("position");
  for (let i = 0; i < y.count; i++)
    assert.ok(
      Math.abs(y.getY(i) - heightAt(small, y.getX(i), y.getZ(i))) < 1e-6,
    );
  assert.equal(plain.getIndex()!.count, 6, "one mission cell");
  assert.equal(photo.getIndex()!.count, 18, "three photo cells");
});

test("draped roads follow the terrain; flat roads keep their old height", () => {
  const network: RoadNetwork = {
    origin: [0, 0, 0],
    bounds: small.bounds,
    roads: [
      {
        name: "Ramp",
        kind: "road",
        width: 1,
        segments: [
          [
            [0.5, 1],
            [3.5, 1],
          ],
        ],
      },
    ],
  };
  const ground = (x: number, z: number) => heightAt(small, x, z);
  const draped = roadGeometry(network, "road", ground).getAttribute("position");
  for (let i = 0; i < draped.count; i++)
    assert.ok(
      Math.abs(
        draped.getY(i) -
          ground(draped.getX(i), draped.getZ(i)) -
          mapConfig.roadLift,
      ) < 1e-5,
    );
  const flat = roadGeometry(network, "road").getAttribute("position");
  for (let i = 0; i < flat.count; i++)
    assert.ok(Math.abs(flat.getY(i) - mapConfig.roadHeight) < 1e-6);
});

test("world points convert back to the map, including a level's stage offset", () => {
  const base = sceneryPose(riehenringSite);
  const pose = { ...base, x: base.x + 80, z: base.z - 60 };
  const [mx, mz] = worldToMap(pose, 80, -60);
  assert.ok(Math.abs(mx - riehenringSite.origin[0]) < 1e-6);
  assert.ok(Math.abs(mz - riehenringSite.origin[1]) < 1e-6);
});

test("the player lands on and walks along a slope", () => {
  const slope = (x: number) => 0.1 * x + 5;
  const player = createPlayer();
  player.position.y = 20;
  player.grounded = false;
  const idle = { forward: 0, right: 0, run: false, jump: false };
  for (let i = 0; i < 240; i++) updatePlayer(player, idle, 0, 1 / 60, slope);
  assert.equal(player.position.y, 5);
  assert.equal(player.grounded, true);
  // Walk east (yaw -π/2 turns forward towards +X) and stay on the ground.
  const walk = { ...idle, forward: 1 };
  for (let i = 0; i < 120; i++)
    updatePlayer(player, walk, -Math.PI / 2, 1 / 60, slope);
  assert.ok(player.position.x > 5);
  assert.ok(Math.abs(player.position.y - slope(player.position.x)) < 1e-9);
});
