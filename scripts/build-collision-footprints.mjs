import { readFileSync, writeFileSync } from "node:fs";
// Use each surveyed building's GLB identity and vertices, rather than tile bounds.
const b = readFileSync("public/models/basel-city.glb");
const size = b.readUInt32LE(12), gltf = JSON.parse(b.subarray(20, 20 + size).toString());
const base = 28 + size, buildings = new Map();
const read = (index, vertex, channel) => {
  const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView];
  return b.readFloatLE(base + (view.byteOffset ?? 0) + (a.byteOffset ?? 0) + vertex * (view.byteStride ?? 12) + channel * 4);
};
const angle = -0.3974, ox = 428.15, oz = -898.98;
for (const mesh of gltf.meshes) for (const p of mesh.primitives) {
  const position = p.attributes.POSITION, identity = p.attributes._BUILDING;
  if (identity === undefined) continue;
  for (let i = 0; i < gltf.accessors[position].count; i++) {
    const mx = read(position, i, 0), mz = read(position, i, 2);
    if (Math.abs(mx - ox) > 130 || Math.abs(mz - oz) > 160) continue;
    const key = [0, 1, 2].map((k) => read(identity, i, k)).join("/");
    const x = Math.cos(angle) * (mx - ox) + Math.sin(angle) * (mz - oz);
    const z = -Math.sin(angle) * (mx - ox) + Math.cos(angle) * (mz - oz);
    const rect = buildings.get(key) ?? [x, x, z, z];
    rect[0] = Math.min(rect[0], x); rect[1] = Math.max(rect[1], x);
    rect[2] = Math.min(rect[2], z); rect[3] = Math.max(rect[3], z);
    buildings.set(key, rect);
  }
}
const rectangles = [...buildings.values()].filter(([x1,x2,z1,z2]) => x2-x1 > 0.5 && z2-z1 > 0.5).map(([x1,x2,z1,z2]) => ({ x: +( (x1+x2)/2).toFixed(3), z: +((z1+z2)/2).toFixed(3), halfX: +((x2-x1)/2).toFixed(3), halfZ: +((z2-z1)/2).toFixed(3) }));
writeFileSync("config/building-collisions.ts", `/** Approximate Riehenring building bounds derived from the licensed Basel GLB. Rebuild with scripts/build-collision-footprints.mjs. */\nexport const buildingCollisions = ${JSON.stringify(rectangles)};\n`);
console.log(`Generated ${rectangles.length} nearby building bounds.`);
