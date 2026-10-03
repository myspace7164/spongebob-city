import * as THREE from "three";
import { mapConfig as c } from "../../config/map";
import type { RoadNetwork } from "../interfaces";
import { themeColor } from "./characters";

/** Batch street ribbons with round joins into two meshes instead of thousands. */
export function roadGeometry(network: RoadNetwork, kind: "road" | "path") {
  const vertices: number[] = [];
  const triangle = (...points: [number, number][]) => {
    points.forEach(([x, z]) => vertices.push(x, c.roadHeight, z));
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
      const al: [number, number] = [a[0] + nx, a[1] + nz];
      const ar: [number, number] = [a[0] - nx, a[1] - nz];
      const bl: [number, number] = [b[0] + nx, b[1] + nz];
      const br: [number, number] = [b[0] - nx, b[1] - nz];
      triangle(al, bl, ar);
      triangle(ar, bl, br);
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

/** Road and imagery failures are independent; roads remain available without photos. */
export async function loadMapLayers(
  scene: THREE.Scene | THREE.Group,
  canvas: HTMLCanvasElement,
) {
  canvas.dataset.roads = "loading";
  canvas.dataset.imagery = "loading";
  try {
    const response = await fetch(c.roadsUrl);
    if (!response.ok) throw new Error(`Road data: HTTP ${response.status}`);
    const network: RoadNetwork = await response.json();
    for (const kind of ["road", "path"] as const) {
      const material = new THREE.MeshBasicMaterial({
        color: themeColor(kind === "road" ? "asphalt" : "ground"),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: c.roadOpacity,
        depthWrite: false,
      });
      scene.add(new THREE.Mesh(roadGeometry(network, kind), material));
    }
    canvas.dataset.roads = "loaded";
    try {
      const texture = await new THREE.TextureLoader().loadAsync(c.imageryUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      scene.add(
        new THREE.Mesh(
          imageryGeometry(network.bounds),
          new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
        ),
      );
      canvas.dataset.imagery = "loaded";
    } catch (error) {
      canvas.dataset.imagery = "fallback";
      console.warn(
        "Basel imagery unavailable; keeping roads and plain ground.",
        error,
      );
    }
  } catch (error) {
    canvas.dataset.roads = "fallback";
    canvas.dataset.imagery = "fallback";
    console.warn(
      "Basel road layers unavailable; keeping original ground.",
      error,
    );
  }
}
