import * as THREE from "three";
import { box, ball, themeColor } from "./characters";
import { powerupConfig } from "../../config/powerups";
import type { CityState, PowerupKind } from "../interfaces";
/** Six original miniature props: biscuit, confetti, river, guardian, lantern and bell. */
export function createPowerupView(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = "basel-powerup-pickups";
  scene.add(root);
  const props = new Map<PowerupKind, THREE.Group>();
  for (const item of powerupConfig.items) {
    const prop = new THREE.Group();
    prop.name = `pickup-${item.id}`;
    root.add(prop);
    props.set(item.id, prop);
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.07, 24),
      new THREE.MeshBasicMaterial({
        color: themeColor("powerup-glow"),
        transparent: true,
        opacity: 0.65,
      }),
    );
    disc.position.y = 0.055;
    prop.add(disc);
    const icon = new THREE.Group();
    icon.name = "powerup-icon";
    icon.position.y = 0.45;
    prop.add(icon);
    if (item.id === "laeckerli") {
      box(icon, [0.65, 0.16, 0.4], [0, 0, 0], "wood");
      for (const x of [-0.2, 0, 0.2])
        ball(icon, 0.035, [x, 0.09, 0.08], "cream");
    }
    if (item.id === "confetti") {
      for (let i = 0; i < 12; i++)
        box(
          icon,
          [0.07, 0.17, 0.04],
          [Math.sin(i * 2) * 0.3, (i % 4) * 0.12, Math.cos(i * 2) * 0.3],
          ["coral", "sponge", "water", "pink"][i % 4],
        );
    }
    if (item.id === "rhine") {
      for (let i = 0; i < 3; i++)
        ball(icon, 0.18, [Math.sin(i * 2) * 0.19, i * 0.13, 0], "water");
    }
    if (item.id === "basilisk") {
      ball(icon, 0.23, [0, 0, 0], "leaf");
      box(icon, [0.52, 0.08, 0.12], [0, 0.22, 0], "leaf");
      for (const x of [-0.14, 0.14]) ball(icon, 0.04, [x, 0.08, 0.2], "tooth");
    }
    if (item.id === "lantern") {
      box(icon, [0.35, 0.52, 0.35], [0, 0, 0], "coral");
      box(icon, [0.42, 0.05, 0.42], [0, 0.28, 0], "wood");
      ball(icon, 0.11, [0, 0.08, 0.2], "sponge");
    }
    if (item.id === "pore" || item.id === "maximum") {
      box(icon, [0.5, 0.5, 0.24], [0, 0, 0], "sponge");
      for (const x of [-0.12, 0.12]) ball(icon, 0.055, [x, 0.1, 0.15], "pore");
      if (item.id === "maximum") {
        for (const x of [-0.4, 0.4])
          box(icon, [0.22, 0.18, 0.18], [x, 0, 0], "sponge");
      }
    }
    if (item.id === "patrick") {
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 + Math.PI / 2,
          radius = i % 2 ? 0.15 : 0.36;
        const x = Math.cos(angle) * radius,
          y = Math.sin(angle) * radius;
        if (i === 0) star.moveTo(x, y);
        else star.lineTo(x, y);
      }
      star.closePath();
      icon.add(
        new THREE.Mesh(
          new THREE.ExtrudeGeometry(star, { depth: 0.12, bevelEnabled: false }),
          new THREE.MeshLambertMaterial({ color: themeColor("pink") }),
        ),
      );
    }
    if (item.id === "bubbles") {
      for (let i = 0; i < 3; i++)
        ball(
          icon,
          0.16,
          [Math.sin(i * 2) * 0.22, (i % 2) * 0.24, Math.cos(i * 2) * 0.13],
          "water",
        );
    }
    if (item.id === "bell") {
      const bell = new THREE.Mesh(
        new THREE.ConeGeometry(0.27, 0.43, 16),
        new THREE.MeshLambertMaterial({ color: themeColor("sponge") }),
      );
      icon.add(bell);
      ball(icon, 0.065, [0, -0.24, 0], "wood");
    }
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.035, 6, 24),
      new THREE.MeshBasicMaterial({ color: themeColor("powerup-glow") }),
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.1;
    prop.add(halo);
  }
  return {
    update(
      s: CityState,
      groundAt: (x: number, z: number) => number,
      elapsed: number,
      reducedMotion = false,
    ) {
      for (const prop of props.values()) prop.visible = false;
      for (const pickup of s.powerups.pickups) {
        const prop = props.get(pickup.id)!;
        prop.visible = !pickup.collected;
        prop.position.set(pickup.x, groundAt(pickup.x, pickup.z), pickup.z);
        const icon = prop.getObjectByName("powerup-icon")!;
        icon.position.y =
          0.45 + (reducedMotion ? 0 : Math.sin(elapsed * 3 + pickup.x) * 0.08);
        icon.rotation.y = reducedMotion ? 0 : elapsed;
      }
    },
  };
}
