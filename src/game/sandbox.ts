import * as THREE from "three";
import { itemConfig } from "../../config/items";
import { canPlace, fire } from "./inventory";
import type { InventoryState, PlayerState, PlacedBlock } from "../interfaces";

/** Placeholder item visuals, bounded placement and raycast shooting. */
export function createSandbox(scene: THREE.Scene, character: THREE.Group) {
  const styles = getComputedStyle(document.documentElement);
  const color = (name: string) =>
    new THREE.Color(styles.getPropertyValue(name).trim());
  const boxGeometry = new THREE.BoxGeometry(
    itemConfig.blockSize,
    itemConfig.blockSize,
    itemConfig.blockSize,
  );
  const blockMaterial = new THREE.MeshLambertMaterial({
    color: color("--player"),
  });
  const targetGeometry = new THREE.BoxGeometry(
    itemConfig.targetSize,
    itemConfig.targetSize,
    itemConfig.targetSize,
  );
  const targetMaterial = new THREE.MeshLambertMaterial({
    color: color("--target"),
  });
  const targets: THREE.Mesh[] = [];
  const blocks: THREE.Mesh[] = [];
  const placed: PlacedBlock[] = [];
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const aim = new THREE.Vector3();
  const preview = new THREE.Mesh(
    boxGeometry,
    new THREE.MeshBasicMaterial({
      color: color("--player"),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  scene.add(preview);
  const tracerGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(),
  ]);
  const tracer = new THREE.Line(
    tracerGeometry,
    new THREE.LineBasicMaterial({ color: color("--accent") }),
  );
  tracer.frustumCulled = false;
  tracer.visible = false;
  scene.add(tracer);
  let tracerTime = 0;

  const held = new THREE.Group();
  held.position.set(0.48, 0.95, 0.18);
  character.add(held);
  const darkMaterial = new THREE.MeshLambertMaterial({ color: color("--ink") });
  const pan = new THREE.Group();
  const panHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.07, 12),
    darkMaterial,
  );
  panHead.position.z = 0.4;
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.07, 0.4),
    darkMaterial,
  );
  handle.position.z = 0.1;
  pan.add(panHead, handle);
  const gun = new THREE.Group();
  const barrel = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.15, 0.4),
    darkMaterial,
  );
  barrel.position.z = 0.14;
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.25, 0.13),
    darkMaterial,
  );
  grip.position.y = -0.12;
  gun.add(barrel, grip);
  const heldBlock = new THREE.Mesh(boxGeometry, blockMaterial);
  heldBlock.scale.setScalar(0.3);
  const heldItems = [pan, gun, heldBlock];
  held.add(...heldItems);

  function reset(): void {
    scene.remove(...targets, ...blocks);
    targets.length = 0;
    blocks.length = 0;
    placed.length = 0;
    for (const [x, z] of [
      [-3, -9],
      [0, -12],
      [3, -9],
    ]) {
      const target = new THREE.Mesh(targetGeometry, targetMaterial);
      target.position.set(x, itemConfig.targetSize / 2, z);
      targets.push(target);
      scene.add(target);
    }
    tracerTime = 0;
    tracer.visible = false;
    preview.visible = false;
  }
  reset();

  function placement(
    inventory: InventoryState,
    player: PlayerState,
    camera: THREE.Camera,
  ): PlacedBlock | null {
    ray.setFromCamera(new THREE.Vector2(), camera);
    if (!ray.ray.intersectPlane(plane, aim)) return null;
    const point = { x: Math.round(aim.x), z: Math.round(aim.z) };
    if (!canPlace(inventory, point, player.position, placed)) return null;
    if (
      targets.some(
        (target) =>
          Math.abs(target.position.x - point.x) <
            (itemConfig.targetSize + itemConfig.blockSize) / 2 &&
          Math.abs(target.position.z - point.z) <
            (itemConfig.targetSize + itemConfig.blockSize) / 2,
      )
    )
      return null;
    return point;
  }
  return {
    reset,
    update(
      inventory: InventoryState,
      player: PlayerState,
      camera: THREE.Camera,
      dt: number,
      active: boolean,
    ): void {
      heldItems.forEach((item, index) => {
        item.visible = index === inventory.selected;
      });
      inventory.cooldown = Math.max(0, inventory.cooldown - dt);
      tracerTime = Math.max(0, tracerTime - dt);
      tracer.visible = tracerTime > 0;
      const point = active ? placement(inventory, player, camera) : null;
      preview.visible = !!point;
      if (point)
        preview.position.set(point.x, itemConfig.blockSize / 2, point.z);
    },
    use(
      inventory: InventoryState,
      player: PlayerState,
      camera: THREE.Camera,
    ): string {
      const action = inventory.items[inventory.selected].action;
      if (action === "placeholder")
        return "Panhandle equipped. Its behavior is still a placeholder.";
      if (action === "place") {
        const point = placement(inventory, player, camera);
        if (!point)
          return inventory.blocks === 0
            ? "No blocks left. Reset with R."
            : "Aim at empty ground within 8 meters; keep clear of your feet.";
        const block = new THREE.Mesh(boxGeometry, blockMaterial);
        block.position.set(point.x, itemConfig.blockSize / 2, point.z);
        blocks.push(block);
        placed.push(point);
        scene.add(block);
        inventory.blocks--;
        return "Block placed. Select Glock to shoot it away.";
      }
      if (!fire(inventory))
        return inventory.ammo === 0
          ? "Magazine empty. Press F to reload."
          : "Wait for the next shot.";
      ray.setFromCamera(new THREE.Vector2(), camera);
      ray.far = itemConfig.range;
      const hit = ray.intersectObjects([...targets, ...blocks], false)[0];
      const end = hit
        ? hit.point
        : ray.ray.at(itemConfig.range, new THREE.Vector3());
      const positions = tracerGeometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      positions.setXYZ(
        0,
        player.position.x,
        player.position.y + 1,
        player.position.z,
      );
      positions.setXYZ(1, end.x, end.y, end.z);
      positions.needsUpdate = true;
      tracerTime = itemConfig.tracerLifetime;
      tracer.visible = true;
      if (!hit) return "Shot fired.";
      const targetIndex = targets.indexOf(hit.object as THREE.Mesh);
      if (targetIndex >= 0) targets.splice(targetIndex, 1);
      const blockIndex = blocks.indexOf(hit.object as THREE.Mesh);
      if (blockIndex >= 0) {
        blocks.splice(blockIndex, 1);
        placed.splice(blockIndex, 1);
        inventory.blocks++;
      }
      scene.remove(hit.object);
      return targetIndex >= 0 ? "Target hit!" : "Block removed.";
    },
  };
}
