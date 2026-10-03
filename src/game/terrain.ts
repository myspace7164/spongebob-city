import * as THREE from "three";
import type { CityLevel, CityState, TerrainGrid } from "../interfaces.ts";
import { mapToWorld, sceneryPose, worldToMap } from "./streets.ts";

type Bounds = TerrainGrid["bounds"];
type Rectangle = { left: number; right: number; back: number; front: number };

/** Decode the converter's Int16 centimetre grid. */
export function terrainFromBuffer(
  meta: Omit<TerrainGrid, "heights">,
  buffer: ArrayBuffer,
): TerrainGrid {
  const centimetres = new Int16Array(buffer);
  if (centimetres.length !== meta.columns * meta.rows)
    throw new Error("Terrain grid size does not match its metadata");
  return { ...meta, heights: Float32Array.from(centimetres, (h) => h / 100) };
}

/** Height on the rendered surface: each cell splits into the same two triangles as the mesh. */
export function heightAt(grid: TerrainGrid, x: number, z: number): number {
  const fx = Math.min(
    Math.max((x - grid.bounds[0]) / grid.spacing, 0),
    grid.columns - 1,
  );
  const fz = Math.min(
    Math.max((z - grid.bounds[1]) / grid.spacing, 0),
    grid.rows - 1,
  );
  // The last row/column belongs to the cell before it, so edges stay exact.
  const c = Math.min(Math.floor(fx), grid.columns - 2),
    r = Math.min(Math.floor(fz), grid.rows - 2);
  const u = fx - c,
    v = fz - r;
  const at = (dc: number, dr: number) =>
    grid.heights[(r + dr) * grid.columns + c + dc];
  return u + v <= 1
    ? at(0, 0) + u * (at(1, 0) - at(0, 0)) + v * (at(0, 1) - at(0, 0))
    : at(1, 1) +
        (1 - u) * (at(0, 1) - at(1, 1)) +
        (1 - v) * (at(1, 0) - at(1, 1));
}

/**
 * Terrain split into square tiles for frustum culling. Photo UVs match the
 * former flat imagery; cells inside the mission rectangle get plain ground.
 */
export function terrainTiles(
  grid: TerrainGrid,
  imagery: Bounds,
  mission: Rectangle,
  tileCells = 25,
) {
  const [left, back, right, front] = imagery;
  const tiles: { photo: THREE.BufferGeometry; plain: THREE.BufferGeometry }[] =
    [];
  for (let r0 = 0; r0 < grid.rows - 1; r0 += tileCells)
    for (let c0 = 0; c0 < grid.columns - 1; c0 += tileCells) {
      const cols = Math.min(tileCells, grid.columns - 1 - c0),
        rows = Math.min(tileCells, grid.rows - 1 - r0);
      const positions: number[] = [],
        uv: number[] = [];
      for (let r = 0; r <= rows; r++)
        for (let c = 0; c <= cols; c++) {
          const x = grid.bounds[0] + (c0 + c) * grid.spacing,
            z = grid.bounds[1] + (r0 + r) * grid.spacing;
          positions.push(x, grid.heights[(r0 + r) * grid.columns + c0 + c], z);
          uv.push((x - left) / (right - left), (front - z) / (front - back));
        }
      const photo: number[] = [],
        plain: number[] = [];
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const a = r * (cols + 1) + c,
            b = a + 1,
            d = a + cols + 1,
            e = d + 1;
          const x = grid.bounds[0] + (c0 + c + 0.5) * grid.spacing,
            z = grid.bounds[1] + (r0 + r + 0.5) * grid.spacing;
          const inMission =
            x > mission.left &&
            x < mission.right &&
            z > mission.back &&
            z < mission.front;
          // Same diagonal as heightAt: (c,r)-(c+1,r)-(c,r+1) and (c+1,r+1)-(c,r+1)-(c+1,r).
          (inMission ? plain : photo).push(a, d, b, e, b, d);
        }
      const geometry = (index: number[]) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3),
        );
        g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(index);
        g.computeVertexNormals();
        g.computeBoundingSphere();
        return g;
      };
      tiles.push({ photo: geometry(photo), plain: geometry(plain) });
    }
  return tiles;
}

/** Store each plot's ground height so rainwater can run downhill between plots. */
export function assignElevations(
  s: CityState,
  groundAt: (x: number, z: number) => number,
): void {
  for (const p of s.plots) p.elevation = groundAt(p.x, p.z);
}

/**
 * Where the Basel scenery goes for a level, and the world ground height that
 * results: the street's pose plus the stage offset, lifted so the play area's
 * centre sits at y = 0. Without terrain the ground stays flat.
 */
export function levelScenery(
  level: CityLevel | undefined,
  grid: TerrainGrid | null,
) {
  const base = sceneryPose(level?.mapSite ?? level?.site);
  const origin = level?.origin ?? { x: 0, z: 0 };
  const pose = {
    rotationY: base.rotationY,
    x: base.x + origin.x,
    z: base.z + origin.z,
  };
  const y = grid ? -heightAt(grid, ...worldToMap(pose, origin.x, origin.z)) : 0;
  const groundAt = (x: number, z: number) =>
    grid ? heightAt(grid, ...worldToMap(pose, x, z)) + y : 0;
  return { ...pose, y, groundAt };
}

/** Ground height in the scenery group's local coordinates at a map-local point. */
export function levelLocalGroundAt(
  pose: { rotationY: number; x: number; y: number; z: number },
  x: number,
  z: number,
  groundAt: (x: number, z: number) => number,
): number {
  const [worldX, worldZ] = mapToWorld(pose, x, z);
  return groundAt(worldX, worldZ) - pose.y;
}
