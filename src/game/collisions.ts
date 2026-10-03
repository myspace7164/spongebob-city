import * as THREE from "three";
import type { PlayerState } from "../interfaces";

export type SolidShape =
  | { type: "circle"; x: number; z: number; radius: number }
  | { type: "polygon"; points: [number, number][] };

export interface SolidCollider {
  id: string;
  shape: SolidShape;
  minY: number;
  maxY: number;
  kind: "environment" | "character" | "structure";
}

type Bounds = { left: number; right: number; back: number; front: number };
const CELL_SIZE = 12;
const AXIS_STEP = 0.14;
const EPSILON = 1e-5;

export function circleCollider(
  id: string,
  x: number,
  z: number,
  radius: number,
  minY = 0,
  maxY = 3,
  kind: SolidCollider["kind"] = "structure",
): SolidCollider {
  return { id, shape: { type: "circle", x, z, radius }, minY, maxY, kind };
}

/** A low-cost oriented footprint; heading uses the game's Three.js Y angle. */
export function boxCollider(
  id: string,
  x: number,
  z: number,
  halfWidth: number,
  halfDepth: number,
  minY = 0,
  maxY = 3,
  rotationY = 0,
  kind: SolidCollider["kind"] = "structure",
): SolidCollider {
  const c = Math.cos(rotationY),
    s = Math.sin(rotationY);
  const points: [number, number][] = [
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
    [halfWidth, halfDepth],
    [-halfWidth, halfDepth],
  ].map(([lx, lz]) => [x + lx * c + lz * s, z - lx * s + lz * c]);
  return { id, shape: { type: "polygon", points }, minY, maxY, kind };
}

function colliderBounds(collider: SolidCollider): Bounds {
  if (collider.shape.type === "circle") {
    const { x, z, radius } = collider.shape;
    return {
      left: x - radius,
      right: x + radius,
      back: z - radius,
      front: z + radius,
    };
  }
  const xs = collider.shape.points.map(([x]) => x);
  const zs = collider.shape.points.map(([, z]) => z);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    back: Math.min(...zs),
    front: Math.max(...zs),
  };
}

function circlePenetration(
  x: number,
  z: number,
  radius: number,
  shape: SolidShape,
): number {
  if (shape.type === "circle") {
    const reach = radius + shape.radius;
    return reach - Math.hypot(x - shape.x, z - shape.z);
  }
  let inside = false;
  let minDistanceSquared = Infinity;
  const points = shape.points;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, az] = points[j];
    const [bx, bz] = points[i];
    if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax)
      inside = !inside;
    const dx = bx - ax,
      dz = bz - az;
    const t = Math.max(
      0,
      Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)),
    );
    const closestX = ax + t * dx,
      closestZ = az + t * dz;
    minDistanceSquared = Math.min(
      minDistanceSquared,
      (x - closestX) ** 2 + (z - closestZ) ** 2,
    );
  }
  const edgeDistance = Math.sqrt(minDistanceSquared);
  return inside ? radius + edgeDistance : radius - edgeDistance;
}

/** Spatially indexed static solids plus the small set of moving characters. */
export class CollisionWorld {
  private buckets = new Map<string, SolidCollider[]>();
  private dynamic: SolidCollider[] = [];
  private staticColliders: SolidCollider[] = [];
  revision = 0;

  setStatic(colliders: readonly SolidCollider[]): void {
    this.staticColliders = [...colliders];
    this.buckets.clear();
    for (const collider of this.staticColliders) {
      const b = colliderBounds(collider);
      const x0 = Math.floor(b.left / CELL_SIZE),
        x1 = Math.floor(b.right / CELL_SIZE);
      const z0 = Math.floor(b.back / CELL_SIZE),
        z1 = Math.floor(b.front / CELL_SIZE);
      for (let x = x0; x <= x1; x++)
        for (let z = z0; z <= z1; z++) {
          const key = `${x},${z}`;
          const bucket = this.buckets.get(key) ?? [];
          bucket.push(collider);
          this.buckets.set(key, bucket);
        }
    }
    this.revision++;
  }

  setDynamic(colliders: readonly SolidCollider[]): void {
    this.dynamic = [...colliders];
    this.revision++;
  }

  get colliders(): readonly SolidCollider[] {
    return [...this.staticColliders, ...this.dynamic];
  }

  private query(x: number, z: number, radius: number): SolidCollider[] {
    const found = new Set<SolidCollider>(this.dynamic);
    const x0 = Math.floor((x - radius) / CELL_SIZE),
      x1 = Math.floor((x + radius) / CELL_SIZE);
    const z0 = Math.floor((z - radius) / CELL_SIZE),
      z1 = Math.floor((z + radius) / CELL_SIZE);
    for (let cx = x0; cx <= x1; cx++)
      for (let cz = z0; cz <= z1; cz++)
        for (const collider of this.buckets.get(`${cx},${cz}`) ?? [])
          found.add(collider);
    return [...found];
  }

  private blocksMovement(
    x: number,
    z: number,
    previousX: number,
    previousZ: number,
    y: number,
    radius: number,
    height: number,
    ignoredIds: ReadonlySet<string>,
  ): boolean {
    for (const collider of this.query(x, z, radius)) {
      if (ignoredIds.has(collider.id)) continue;
      if (collider.minY >= y + height - EPSILON || collider.maxY <= y + EPSILON)
        continue;
      const next = circlePenetration(x, z, radius, collider.shape);
      if (next <= EPSILON) continue;
      const previous = circlePenetration(
        previousX,
        previousZ,
        radius,
        collider.shape,
      );
      // A newly placed solid may overlap the player; permit movement that
      // reduces that overlap so the player can always get back out.
      if (previous > EPSILON && next < previous - EPSILON) continue;
      return true;
    }
    return false;
  }

  /** Swept, axis-separated movement prevents tunnelling and allows wall sliding. */
  move(
    player: PlayerState,
    dx: number,
    dz: number,
    radius: number,
    height: number,
    ignoredIds: readonly string[] = [],
  ) {
    const result = { blockedX: false, blockedZ: false };
    const ignored = new Set(ignoredIds);
    const moveAxis = (axis: "x" | "z", amount: number) => {
      const steps = Math.max(1, Math.ceil(Math.abs(amount) / AXIS_STEP));
      const step = amount / steps;
      for (let i = 0; i < steps; i++) {
        const x = player.position.x + (axis === "x" ? step : 0);
        const z = player.position.z + (axis === "z" ? step : 0);
        if (
          this.blocksMovement(
            x,
            z,
            player.position.x,
            player.position.z,
            player.position.y,
            radius,
            height,
            ignored,
          )
        ) {
          result[axis === "x" ? "blockedX" : "blockedZ"] = true;
          break;
        }
        player.position[axis] = axis === "x" ? x : z;
      }
    };
    moveAxis("x", dx);
    moveAxis("z", dz);
    if (result.blockedX) player.velocity.x = 0;
    if (result.blockedZ) player.velocity.z = 0;
    return result;
  }
}

/** Extract one footprint per source object from the map's per-building GLB attribute. */
export function buildingColliders(model: THREE.Object3D): SolidCollider[] {
  model.updateMatrixWorld(true);
  type Footprint = {
    low: [number, number][];
    minY: number;
    maxY: number;
  };
  const buildings = new Map<string, Footprint>();
  const point = new THREE.Vector3();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const positions = object.geometry.getAttribute("position");
    const styles = object.geometry.getAttribute("_building");
    if (!positions || !styles) return;
    for (let i = 0; i < positions.count; i++) {
      const seed = styles.getX(i);
      const base = styles.getY(i);
      const kind = styles.getZ(i);
      const key = `${Math.round(seed * 1_000_000)}:${kind}`;
      const building = buildings.get(key) ?? {
        low: [],
        minY: Infinity,
        maxY: -Infinity,
      };
      point.fromBufferAttribute(positions, i);
      object.localToWorld(point);
      building.minY = Math.min(building.minY, point.y);
      building.maxY = Math.max(building.maxY, point.y);
      if (positions.getY(i) <= base + 2.2)
        building.low.push([point.x, point.z]);
      buildings.set(key, building);
    }
  });
  return [...buildings.entries()].flatMap(([key, building]) => {
    const points = convexHull(building.low);
    if (points.length < 3) return [];
    return {
      id: `building-${key}`,
      shape: { type: "polygon", points } as const,
      minY: building.minY,
      maxY: building.maxY,
      kind: "environment" as const,
    };
  });
}

function convexHull(points: [number, number][]): [number, number][] {
  const sorted = [
    ...new Map(points.map((p) => [`${p[0]},${p[1]}`, p])).values(),
  ].sort(([ax, az], [bx, bz]) => ax - bx || az - bz);
  if (sorted.length < 3) return sorted;
  const cross = (o: number[], a: number[], b: number[]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, point) <= 0)
      lower.pop();
    lower.push(point);
  }
  const upper: [number, number][] = [];
  for (const point of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, point) <= 0)
      upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Transform map-local tree footprints through the same stage transform as the meshes. */
export function transformCollider(
  collider: SolidCollider,
  parent: THREE.Object3D,
): SolidCollider {
  parent.updateMatrixWorld(true);
  const transform = (x: number, y: number, z: number) =>
    parent.localToWorld(new THREE.Vector3(x, y, z));
  const base = transform(0, collider.minY, 0).y;
  const top = transform(0, collider.maxY, 0).y;
  if (collider.shape.type === "circle") {
    const center = transform(collider.shape.x, collider.minY, collider.shape.z);
    return {
      ...collider,
      shape: { ...collider.shape, x: center.x, z: center.z },
      minY: Math.min(base, top),
      maxY: Math.max(base, top),
    };
  }
  const points = collider.shape.points.map(([x, z]) => {
    const world = transform(x, collider.minY, z);
    return [world.x, world.z] as [number, number];
  });
  return {
    ...collider,
    shape: { type: "polygon", points },
    minY: Math.min(base, top),
    maxY: Math.max(base, top),
  };
}
