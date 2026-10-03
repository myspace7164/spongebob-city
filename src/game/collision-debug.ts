import * as THREE from "three";
import { gameConfig } from "../../config/game";
import type { Vector3State } from "../interfaces";
import type { SolidCollider } from "./collisions";

const colors = {
  environment: new THREE.Color(0x50e3a4),
  structure: new THREE.Color(0x53c9ff),
  character: new THREE.Color(0xffc857),
};

function lineGeometry(
  colliders: readonly SolidCollider[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colorsAttribute: number[] = [];
  const add = (
    a: [number, number, number],
    b: [number, number, number],
    color: THREE.Color,
  ) => {
    positions.push(...a, ...b);
    colorsAttribute.push(color.r, color.g, color.b, color.r, color.g, color.b);
  };
  for (const collider of colliders) {
    const color = colors[collider.kind];
    const y = collider.minY + 0.035;
    if (collider.shape.type === "circle") {
      const { x, z, radius } = collider.shape;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const b = ((i + 1) / 24) * Math.PI * 2;
        add(
          [x + Math.cos(a) * radius, y, z + Math.sin(a) * radius],
          [x + Math.cos(b) * radius, y, z + Math.sin(b) * radius],
          color,
        );
      }
    } else {
      collider.shape.points.forEach(([x, z], i, points) => {
        const [nextX, nextZ] = points[(i + 1) % points.length];
        add([x, y, z], [nextX, y, nextZ], color);
      });
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colorsAttribute, 3),
  );
  return geometry;
}

/** Optional ?debugCollisions=1 footprint overlays for physical solids and the player. */
export class CollisionDebugView {
  private root = new THREE.Group();
  private enabled: boolean;
  private staticLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
  );
  private dynamicLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
  );
  private playerOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(
      new THREE.CylinderGeometry(
        gameConfig.playerCollisionRadius,
        gameConfig.playerCollisionRadius,
        gameConfig.playerCollisionHeight,
        16,
        1,
      ),
    ),
    new THREE.LineBasicMaterial({ color: 0xff3155, depthTest: false }),
  );

  constructor(scene: THREE.Scene, enabled: boolean) {
    this.enabled = enabled;
    this.root.visible = enabled;
    this.root.renderOrder = 10_000;
    this.staticLines.renderOrder = 10_000;
    this.dynamicLines.renderOrder = 10_000;
    this.playerOutline.renderOrder = 10_001;
    this.root.add(this.staticLines, this.dynamicLines, this.playerOutline);
    scene.add(this.root);
  }

  setStatic(colliders: readonly SolidCollider[]): void {
    if (!this.enabled) return;
    this.replaceGeometry(this.staticLines, lineGeometry(colliders));
  }

  setDynamic(colliders: readonly SolidCollider[]): void {
    if (!this.enabled) return;
    this.replaceGeometry(this.dynamicLines, lineGeometry(colliders));
  }

  updatePlayer(position: Vector3State): void {
    this.playerOutline.position.set(
      position.x,
      position.y + gameConfig.playerCollisionHeight / 2,
      position.z,
    );
  }

  private replaceGeometry(
    lines: THREE.LineSegments,
    geometry: THREE.BufferGeometry,
  ): void {
    lines.geometry.dispose();
    lines.geometry = geometry;
  }
}
