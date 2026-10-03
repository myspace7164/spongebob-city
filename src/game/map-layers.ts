import * as THREE from "three";
import { mapConfig as c } from "../../config/map";
import type { RoadNetwork, TerrainGrid } from "../interfaces";
import { themeColor } from "./characters";
import { heightAt, terrainFromBuffer, terrainTiles } from "./terrain";
import { groundStyle, treeStyle } from "../../config/ground";
import { createTrees, type TreeRow } from "./trees";
import {
  checkGroundMeta,
  createGroundMaterial,
  groundTileAt,
  type GroundMeta,
} from "./ground-style";

type Ground = (x: number, z: number) => number;

/**
 * Batch street ribbons with round joins into two meshes instead of thousands.
 * With terrain, segments are cut into short pieces so they follow the slope.
 */
export function roadGeometry(
  network: RoadNetwork,
  kind: "road" | "path",
  ground?: Ground,
) {
  const vertices: number[] = [];
  const triangle = (...points: [number, number][]) => {
    points.forEach(([x, z]) =>
      vertices.push(x, ground ? ground(x, z) + c.roadLift : c.roadHeight, z),
    );
  };
  for (const road of network.roads.filter((road) => road.kind === kind)) {
    for (const [a, b] of road.segments) {
      const dx = b[0] - a[0],
        dz = b[1] - a[1];
      const length = Math.hypot(dx, dz);
      if (length === 0) continue;
      const radius = road.width / 2;
      const nx = (-dz / length) * radius,
        nz = (dx / length) * radius;
      const pieces = ground ? Math.ceil(length / c.roadStep) : 1;
      for (let k = 0; k < pieces; k++) {
        const p: [number, number] = [
          a[0] + (dx * k) / pieces,
          a[1] + (dz * k) / pieces,
        ];
        const q: [number, number] = [
          a[0] + (dx * (k + 1)) / pieces,
          a[1] + (dz * (k + 1)) / pieces,
        ];
        const pl: [number, number] = [p[0] + nx, p[1] + nz];
        const pr: [number, number] = [p[0] - nx, p[1] - nz];
        const ql: [number, number] = [q[0] + nx, q[1] + nz];
        const qr: [number, number] = [q[0] - nx, q[1] - nz];
        triangle(pl, ql, pr);
        triangle(pr, ql, qr);
      }
      for (const p of [a, b]) {
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4,
            next = ((i + 1) * Math.PI) / 4;
          triangle(
            p,
            [p[0] + Math.cos(angle) * radius, p[1] + Math.sin(angle) * radius],
            [p[0] + Math.cos(next) * radius, p[1] + Math.sin(next) * radius],
          );
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Flat orthophoto split around the fictional mission; north is negative Z. */
export function imageryGeometry(bounds: RoadNetwork["bounds"]) {
  const [left, back, right, front] = bounds;
  const m = c.mission;
  const rectangles = [
    [left, back, m.left, front],
    [m.right, back, right, front],
    [m.left, back, m.right, m.back],
    [m.left, m.front, m.right, front],
  ];
  const positions: number[] = [],
    uv: number[] = [];
  for (const [x0, z0, x1, z1] of rectangles) {
    for (const [x, z] of [
      [x0, z0],
      [x0, z1],
      [x1, z0],
      [x1, z0],
      [x0, z1],
      [x1, z1],
    ]) {
      positions.push(x, c.groundHeight, z);
      uv.push((x - left) / (right - left), (front - z) / (front - back));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return geometry;
}

async function loadTerrain(): Promise<TerrainGrid> {
  const [meta, data] = await Promise.all([
    fetch(c.terrainMetaUrl).then((r) => {
      if (!r.ok) throw new Error(`Terrain metadata: HTTP ${r.status}`);
      return r.json();
    }),
    fetch(c.terrainUrl).then((r) => {
      if (!r.ok) throw new Error(`Terrain heights: HTTP ${r.status}`);
      return r.arrayBuffer();
    }),
  ]);
  return terrainFromBuffer(meta, data);
}

/** Basel's inventory trees on the terrain; a failure leaves the ground as it is. */
async function loadTrees(
  scene: THREE.Object3D,
  canvas: HTMLCanvasElement,
  groundAt: (x: number, z: number) => number,
  onTrees?: (trees: ReturnType<typeof createTrees>) => void,
) {
  try {
    const response = await fetch(treeStyle.url);
    if (!response.ok) throw new Error(`Trees: HTTP ${response.status}`);
    const { trees } = (await response.json()) as { trees: TreeRow[] };
    const layer = createTrees(trees, groundAt);
    scene.add(layer.group);
    onTrees?.(layer);
    canvas.dataset.trees = "loaded";
  } catch (error) {
    canvas.dataset.trees = "fallback";
    console.warn("Basel trees unavailable.", error);
  }
}

/** Land-cover tiles as one material per texture, with the metadata to pick them. */
async function loadGround() {
  const response = await fetch(groundStyle.metaUrl);
  if (!response.ok) throw new Error(`Ground metadata: HTTP ${response.status}`);
  const meta = (await response.json()) as GroundMeta;
  checkGroundMeta(meta);
  const base = groundStyle.metaUrl.slice(
    0,
    groundStyle.metaUrl.lastIndexOf("/") + 1,
  );
  const loader = new THREE.TextureLoader();
  const materials = await Promise.all(
    meta.tiles.map(async (tile) =>
      createGroundMaterial(
        await loader.loadAsync(base + tile.file),
        tile,
        meta.spacing,
      ),
    ),
  );
  return { meta, materials };
}

/**
 * Terrain, ground, road and imagery failures are independent. With terrain and
 * land cover, the drawn ground replaces the photo and road ribbons; otherwise
 * the photo and roads remain, and everything falls back to flat ground.
 */
export async function loadMapLayers(
  scene: THREE.Object3D,
  canvas: HTMLCanvasElement,
  onTerrain?: (grid: TerrainGrid) => void,
  onTrees?: (trees: ReturnType<typeof createTrees>) => void,
) {
  canvas.dataset.terrain = "loading";
  canvas.dataset.roads = "loading";
  canvas.dataset.imagery = "loading";
  let grid: TerrainGrid | undefined;
  try {
    grid = await loadTerrain();
    onTerrain?.(grid);
    canvas.dataset.terrain = "loaded";
  } catch (error) {
    canvas.dataset.terrain = "fallback";
    console.warn("Basel terrain unavailable; keeping flat ground.", error);
  }
  const ground = grid && ((x: number, z: number) => heightAt(grid, x, z));
  canvas.dataset.ground = "loading";
  if (grid) {
    try {
      const drawn = await loadGround();
      for (const tile of terrainTiles(grid, grid.bounds, c.mission)) {
        for (const geometry of [tile.photo, tile.plain]) {
          const centre = geometry.boundingSphere!.center;
          const index = groundTileAt(drawn.meta, centre.x, centre.z);
          if (index >= 0)
            scene.add(new THREE.Mesh(geometry, drawn.materials[index]));
        }
      }
      canvas.dataset.ground = "loaded";
      canvas.dataset.roads = canvas.dataset.imagery = "replaced";
      await loadTrees(scene, canvas, ground!, onTrees);
      return;
    } catch (error) {
      console.warn(
        "Basel land cover unavailable; using the aerial photo.",
        error,
      );
    }
  }
  canvas.dataset.ground = "fallback";
  let network: RoadNetwork | undefined;
  try {
    const response = await fetch(c.roadsUrl);
    if (!response.ok) throw new Error(`Road data: HTTP ${response.status}`);
    network = (await response.json()) as RoadNetwork;
    for (const kind of ["road", "path"] as const) {
      const material = new THREE.MeshBasicMaterial({
        color: themeColor(kind === "road" ? "asphalt" : "ground"),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: c.roadOpacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      scene.add(new THREE.Mesh(roadGeometry(network, kind, ground), material));
    }
    canvas.dataset.roads = "loaded";
  } catch (error) {
    canvas.dataset.roads = "fallback";
    console.warn("Basel road layers unavailable.", error);
  }
  const bounds = network?.bounds ?? grid?.bounds;
  let photo: THREE.Material | undefined;
  if (bounds)
    try {
      const texture = await new THREE.TextureLoader().loadAsync(c.imageryUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      photo = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
      });
      canvas.dataset.imagery = "loaded";
    } catch (error) {
      console.warn("Basel imagery unavailable; keeping plain ground.", error);
    }
  if (!photo) canvas.dataset.imagery = "fallback";
  if (grid && bounds) {
    const plain = new THREE.MeshLambertMaterial({
      color: themeColor("ground"),
      side: THREE.DoubleSide,
    });
    for (const tile of terrainTiles(grid, bounds, c.mission)) {
      scene.add(new THREE.Mesh(tile.photo, photo ?? plain));
      scene.add(new THREE.Mesh(tile.plain, plain));
    }
  } else if (photo && bounds)
    scene.add(new THREE.Mesh(imageryGeometry(bounds), photo));
}
