import * as THREE from "three";
import type { CityFire, CityPlot } from "../interfaces";

function makeFire(fire: CityFire): THREE.Group {
  const flame = new THREE.Group();
  flame.name = `CityFire_${fire.id}`;
  flame.userData.size = fire.size;
  const radius = 0.22 + fire.size * 0.14;
  const height = 0.75 + fire.size * 0.3;
  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(radius, height, 6),
    new THREE.MeshBasicMaterial({
      color: 0xf04422,
      transparent: true,
      opacity: 0.9,
    }),
  );
  outer.position.y = height * 0.55;
  const inner = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.48, height * 0.63, 6),
    new THREE.MeshBasicMaterial({
      color: 0xffca52,
      transparent: true,
      opacity: 0.95,
    }),
  );
  inner.position.y = height * 0.37;
  flame.add(outer, inner);
  return flame;
}

function dispose(group: THREE.Group): void {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => material.dispose());
  });
  group.removeFromParent();
}

/** Keep a bounded set of lightweight 3D flames synchronized with simulation fires. */
export function createCityFireView(root: THREE.Group) {
  const views = new Map<number, THREE.Group>();
  return (
    fires: readonly CityFire[],
    plots: readonly CityPlot[],
    origin: { x: number; z: number },
    groundAt: (x: number, z: number) => number,
    elapsed: number,
  ) => {
    const activeIds = new Set(fires.map((fire) => fire.id));
    for (const [id, view] of views) {
      if (activeIds.has(id)) continue;
      dispose(view);
      views.delete(id);
    }
    for (const fire of fires) {
      let view = views.get(fire.id);
      if (!view) {
        view = makeFire(fire);
        views.set(fire.id, view);
        root.add(view);
      }
      const plot = plots.find((candidate) => candidate.id === fire.plotId);
      if (!plot) {
        view.visible = false;
        continue;
      }
      view.visible = true;
      view.position.set(
        plot.x - origin.x,
        groundAt(plot.x, plot.z),
        plot.z - origin.z,
      );
      const baseScale = (0.72 + fire.size * 0.34) * fire.intensity;
      const flicker = 0.94 + 0.06 * Math.sin(elapsed * 11 + fire.id * 2.1);
      view.scale.set(baseScale, baseScale * flicker, baseScale);
    }
  };
}
