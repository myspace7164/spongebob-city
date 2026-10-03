import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { groundCategories } from "../config/ground.ts";
import {
  checkGroundMeta,
  groundTileAt,
  type GroundMeta,
} from "../src/game/ground-style.ts";

const meta: GroundMeta = JSON.parse(
  readFileSync("public/maps/basel-ground.json", "utf8"),
);

test("ground categories in config match the converted land cover", () => {
  assert.deepEqual(meta.categories, [...groundCategories]);
  assert.doesNotThrow(() => checkGroundMeta(meta));
  assert.throws(() =>
    checkGroundMeta({ ...meta, categories: [...meta.categories].reverse() }),
  );
});

test("every terrain point finds exactly one ground texture tile", () => {
  const terrain = JSON.parse(
    readFileSync("public/maps/basel-terrain.json", "utf8"),
  );
  const [left, back, right, front] = terrain.bounds;
  for (let x = left + 50; x < right; x += 100)
    for (let z = back + 50; z < front; z += 100)
      assert.ok(groundTileAt(meta, x, z) >= 0, `${x}, ${z}`);
  assert.equal(groundTileAt(meta, left - 1, back), -1);
  // 100 m terrain tiles never straddle a texture boundary.
  for (const tile of meta.tiles) {
    assert.equal((tile.x - left) % 100, 0);
    assert.equal((tile.z - back) % 100, 0);
  }
});
