import assert from "node:assert/strict";
import test from "node:test";
import { buildingStyle, paletteIndex } from "../config/buildings.ts";

test("facade colours follow their weights across building seeds", () => {
  const counts = buildingStyle.facades.map(() => 0);
  const samples = 10000;
  for (let i = 0; i < samples; i++) counts[paletteIndex(i / samples)]++;
  const total = buildingStyle.facades.reduce((n, f) => n + f.weight, 0);
  buildingStyle.facades.forEach((facade, i) =>
    assert.ok(
      Math.abs(counts[i] / samples - facade.weight / total) < 0.01,
      facade.name,
    ),
  );
  assert.equal(paletteIndex(0), 0);
  assert.equal(paletteIndex(0.999999), buildingStyle.facades.length - 1);
});
