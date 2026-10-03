import assert from "node:assert/strict";
import test from "node:test";
import { treeShape, treesNear, type TreeRow } from "../src/game/trees.ts";

test("tree parts add up to the tree's height; conifers are slimmer", () => {
  for (const conifer of [false, true]) {
    const s = treeShape(12, conifer);
    assert.ok(Math.abs(s.trunkHeight + s.crownHeight - 12) < 1e-9);
    assert.ok(s.trunkRadius > 0 && s.crownRadius > 0);
  }
  assert.ok(treeShape(12, true).crownRadius < treeShape(12, false).crownRadius);
});

test("only trees near the level's spots are selected for hiding", () => {
  const trees: TreeRow[] = [
    [0, 0, 0, 10],
    [2.9, 0, 0, 10],
    [3.1, 0, 1, 10],
    [50, 50, 0, 10],
  ];
  assert.deepEqual([...treesNear(trees, [[0, 0]], 3)].sort(), [0, 1]);
  assert.equal(treesNear(trees, [], 3).size, 0);
});
