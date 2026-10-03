import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { imageryGeometry, roadGeometry } from "../src/game/map-layers";
import { mapConfig } from "../config/map";
import type { RoadNetwork } from "../src/interfaces";

const network: RoadNetwork = JSON.parse(
  readFileSync("public/maps/basel-roads.json", "utf8"),
);

test("roads fit the imagery and leave the mission clear, including their estimated width", () => {
  assert.ok(network.roads.length > 0);
  for (const kind of ["road", "path"] as const) {
    const geometry = roadGeometry(network, kind);
    const positions = geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        z = positions.getZ(i);
      assert.ok(Number.isFinite(x) && Number.isFinite(z));
      assert.ok(x >= network.bounds[0] - 0.01 && x <= network.bounds[2] + 0.01);
      assert.ok(z >= network.bounds[1] - 0.01 && z <= network.bounds[3] + 0.01);
      const m = mapConfig.mission;
      assert.ok(
        !(
          x > m.left + 0.01 &&
          x < m.right - 0.01 &&
          z > m.back + 0.01 &&
          z < m.front - 0.01
        ),
      );
    }
    geometry.dispose();
  }
});

test("orthophoto north and east map to the corresponding image edges", () => {
  const geometry = imageryGeometry(network.bounds);
  const positions = geometry.getAttribute("position"),
    uv = geometry.getAttribute("uv");
  for (let i = 0; i < positions.count; i++) {
    if (Math.abs(positions.getZ(i) - network.bounds[1]) < 0.001)
      assert.equal(uv.getY(i), 1);
    if (Math.abs(positions.getX(i) - network.bounds[0]) < 0.001)
      assert.equal(uv.getX(i), 0);
    const m = mapConfig.mission;
    assert.ok(
      !(
        positions.getX(i) > m.left &&
        positions.getX(i) < m.right &&
        positions.getZ(i) > m.back &&
        positions.getZ(i) < m.front
      ),
    );
  }
  geometry.dispose();
});
