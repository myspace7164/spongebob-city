import test from "node:test";
import assert from "node:assert/strict";
import { createCampaign } from "../src/game/campaign.ts";
import { gameplayColliders } from "../src/game/world-colliders.ts";
import { boxCollider } from "../src/game/collisions.ts";

test("rotated shade posts, bench and roof collisions follow their structures", () => {
  const state = createCampaign();
  const plot = state.plots[0];
  plot.kind = "shade";
  plot.rotationY = Math.PI / 4;
  const solids = gameplayColliders(state, () => 0);
  const post = solids.find((s) => s.id === `shade-post-${plot.id}-1`)!.shape;
  assert.equal(post.type, "circle");
  if (post.type === "circle") {
    assert.ok(Math.abs(post.x - plot.x - 1.5 / Math.sqrt(2)) < 1e-8);
    assert.ok(Math.abs(post.z - plot.z + 1.5 / Math.sqrt(2)) < 1e-8);
  }
  assert.deepEqual(
    solids.find((s) => s.id === `shade-bench-${plot.id}`)!.shape,
    boxCollider("expected", plot.x, plot.z, 1.1, 0.35, 0, 1, plot.rotationY)
      .shape,
  );
  plot.kind = "roof";
  assert.deepEqual(
    gameplayColliders(state, () => 0).find(
      (s) => s.id === `plot-green-roof-${plot.id}`,
    )!.shape,
    boxCollider("expected", plot.x, plot.z, 1.45, 1.45, 0, 1, plot.rotationY)
      .shape,
  );
});
