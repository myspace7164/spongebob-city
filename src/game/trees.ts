import * as THREE from "three";
import { treeStyle as style } from "../../config/ground";
import { circleCollider, type SolidCollider } from "./collisions";

/** [x, z, conifer (0/1), height] in map-local metres, from convert-basel-trees.py. */
export type TreeRow = [number, number, number, number];

/** Trunk and crown proportions for a tree of the given height. */
export function treeShape(height: number, conifer: boolean) {
  const trunk = height * (conifer ? 0.25 : 0.38);
  return {
    trunkHeight: trunk,
    trunkRadius: Math.max(0.12, height * 0.025),
    crownHeight: height - trunk,
    crownRadius: height * (conifer ? 0.2 : 0.3),
  };
}

/** Indices of trees within `clearance` metres of any of the points. */
export function treesNear(
  trees: readonly TreeRow[],
  points: readonly [number, number][],
  clearance: number,
): Set<number> {
  const near = new Set<number>();
  trees.forEach(([x, z], i) => {
    if (points.some(([px, pz]) => Math.hypot(x - px, z - pz) < clearance))
      near.add(i);
  });
  return near;
}

/** Trunk-only colliders shared by the solo and co-op world builders. */
export function treeColliders(
  trees: readonly TreeRow[],
  groundAt: (x: number, z: number) => number,
  hiddenTrees: ReadonlySet<number> = new Set(),
): SolidCollider[] {
  return trees.flatMap(([x, z, conifer, height], index) => {
    if (hiddenTrees.has(index)) return [];
    const shape = treeShape(height, conifer === 1);
    const trunkRadius = Math.min(0.42, Math.max(0.13, shape.trunkRadius));
    const y = groundAt(x, z);
    return [
      circleCollider(
        `inventory-tree-${index}`,
        x,
        z,
        trunkRadius,
        y,
        y + shape.trunkHeight,
        "environment",
      ),
    ];
  });
}

/**
 * Instanced cartoon trees: one trunk mesh, one round crown mesh for broadleaf
 * and one cone mesh for conifers. Lives in the scenery group (map-local).
 */
export function createTrees(
  trees: readonly TreeRow[],
  groundAt: (x: number, z: number) => number,
) {
  const lambert = (hex: string) =>
    new THREE.MeshLambertMaterial({ color: hex, flatShading: true });
  const conifers = trees.filter((t) => t[2] === 1).length;
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.8, 1, 1, 6).translate(0, 0.5, 0),
    lambert(style.trunk),
    trees.length,
  );
  const crowns = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    lambert(style.leaves),
    trees.length - conifers,
  );
  const cones = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0),
    lambert(style.needles),
    conifers,
  );
  const group = new THREE.Group();
  group.add(trunks, crowns, cones);
  const matrix = new THREE.Matrix4();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  let hiddenTrees = new Set<number>();
  let hiddenKey = "";
  const place = (skip: Set<number>) => {
    hiddenTrees = skip;
    let leaf = 0,
      needle = 0;
    trees.forEach(([x, z, conifer, height], i) => {
      const s = treeShape(height, conifer === 1);
      const y = groundAt(x, z);
      const crown = conifer ? cones : crowns;
      const index = conifer ? needle++ : leaf++;
      if (skip.has(i)) {
        trunks.setMatrixAt(i, hidden);
        crown.setMatrixAt(index, hidden);
        return;
      }
      trunks.setMatrixAt(
        i,
        matrix.compose(
          new THREE.Vector3(x, y, z),
          new THREE.Quaternion(),
          new THREE.Vector3(s.trunkRadius, s.trunkHeight, s.trunkRadius),
        ),
      );
      crown.setMatrixAt(
        index,
        matrix.compose(
          new THREE.Vector3(
            x,
            y + s.trunkHeight + (conifer ? 0 : s.crownHeight / 2),
            z,
          ),
          new THREE.Quaternion(),
          conifer
            ? new THREE.Vector3(s.crownRadius, s.crownHeight, s.crownRadius)
            : new THREE.Vector3(
                s.crownRadius,
                s.crownHeight / 2,
                s.crownRadius,
              ),
        ),
      );
    });
    for (const mesh of [trunks, crowns, cones]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  };
  place(new Set());
  return {
    group,
    /** Hide trees near these map-local points (the level's spots); cheap when unchanged. */
    clearAround(points: [number, number][]) {
      const key = points
        .map(([x, z]) => `${x.toFixed(1)},${z.toFixed(1)}`)
        .join(";");
      if (key === hiddenKey) return;
      hiddenKey = key;
      place(treesNear(trees, points, style.plotClearance));
    },
    /** Trunk-only solids; crowns remain visual and never create giant hitboxes. */
    colliders(): SolidCollider[] {
      return treeColliders(trees, groundAt, hiddenTrees);
    },
  };
}
