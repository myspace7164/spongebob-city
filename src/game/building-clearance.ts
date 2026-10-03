import { cityConfig } from "../../config/city.ts";
import * as THREE from "three";
import { buildingCollisions } from "../../config/building-collisions.ts";
import { currentLevel } from "./campaign.ts";
import type { CityState, CollisionObstacle } from "../interfaces.ts";
const identifier = new DataView(new ArrayBuffer(4));
/** Preserve the exact Float32 identity as a stable integer. */
function buildingId(seed: number) {
  identifier.setFloat32(0, seed);
  return identifier.getUint32(0);
}
const cache = new Map<
  string,
  { hidden: Set<number>; obstacles: CollisionObstacle[] }
>();
/** Gameplay plazas are illustrative clearings on real map scenery, not surveyed parcels. */
export function buildingPlacement(s: CityState) {
  const level = currentLevel(s),
    site = level?.mapSite ?? level?.site;
  if (!level || !site)
    return { hidden: new Set<number>(), obstacles: [] as CollisionObstacle[] };
  const origin = level.origin ?? { x: 0, z: 0 };
  const key = `${site.origin}/${site.heading}/${origin.x},${origin.z}`;
  const previous = cache.get(key);
  if (previous) return previous;
  const bounds = level.site?.bounds ?? cityConfig.bounds;
  const hidden = new Set<number>(),
    obstacles: CollisionObstacle[] = [];
  const cos = Math.cos(site.heading),
    sin = Math.sin(site.heading);
  for (const b of buildingCollisions) {
    const dx = b.x - site.origin[0],
      dz = b.z - site.origin[1];
    const x = cos * dx + sin * dz,
      z = -sin * dx + cos * dz;
    const hx = Math.abs(cos) * b.halfX + Math.abs(sin) * b.halfZ;
    const hz = Math.abs(sin) * b.halfX + Math.abs(cos) * b.halfZ;
    if (
      x + hx >= bounds.minX - 3 &&
      x - hx <= bounds.maxX + 3 &&
      z + hz >= bounds.minZ - 3 &&
      z - hz <= bounds.maxZ + 3
    )
      hidden.add(b.id);
    else
      obstacles.push({
        x: x + origin.x,
        z: z + origin.z,
        halfX: hx,
        halfZ: hz,
      });
  }
  const result = { hidden, obstacles };
  cache.set(key, result);
  return result;
}
/** Restore/re-filter original indices once per location; keep surveyed surroundings intact. */
export function createBuildingClearance(model: THREE.Group) {
  const meshes: {
    mesh: THREE.Mesh;
    indices: number[];
    identity: THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
  }[] = [];
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const identity = object.geometry.getAttribute("_building");
    const indices = object.geometry.index;
    if (identity && indices)
      meshes.push({
        mesh: object,
        indices: Array.from(indices.array),
        identity,
      });
  });
  let lastKey = "";
  return (s: CityState) => {
    const key = currentLevel(s)?.location ?? "";
    if (lastKey === key) return;
    lastKey = key;
    const { hidden } = buildingPlacement(s);
    for (const { mesh, indices, identity } of meshes) {
      const visible: number[] = [];
      for (let i = 0; i < indices.length; i += 3)
        if (!hidden.has(buildingId(identity.getX(indices[i]))))
          visible.push(indices[i], indices[i + 1], indices[i + 2]);
      mesh.geometry.setIndex(visible);
    }
  };
}

/** Upstream polygon footprints identify buildings by rounded GLB seed. */
export function hiddenBuildingKeys(s: CityState) {
  const keys = new Set<string>();
  for (const id of buildingPlacement(s).hidden) {
    identifier.setUint32(0, id);
    keys.add(`building-${Math.round(identifier.getFloat32(0) * 1_000_000)}`);
  }
  return keys;
}
