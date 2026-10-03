import * as THREE from "three";
import { makeCharacter } from "./characters.ts";
import { createLocomotion } from "./locomotion.ts";
import { createHeldTools } from "./held-tools.ts";
import type { OnlinePlayer } from "../interfaces.ts";
export function createRemotePlayers(scene: THREE.Scene) {
  const avatars = new Map<
    string,
    {
      root: THREE.Group;
      rig: ReturnType<typeof createLocomotion>;
      equipment: ReturnType<typeof createHeldTools>;
      label: THREE.Sprite;
    }
  >();
  const dispose = (root: THREE.Group) => {
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        for (const m of Array.isArray(object.material)
          ? object.material
          : [object.material])
          m.dispose();
      }
      if (object instanceof THREE.Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
    scene.remove(root);
  };
  return {
    update(
      players: OnlinePlayer[],
      self: string,
      elapsed: number,
      reducedMotion = false,
    ) {
      const wanted = new Set(
        players.filter((p) => p.id !== self).map((p) => p.id),
      );
      for (const [id, a] of avatars)
        if (!wanted.has(id)) {
          dispose(a.root);
          avatars.delete(id);
        }
      for (const p of players) {
        if (p.id === self) continue;
        let a = avatars.get(p.id);
        if (!a) {
          const root = new THREE.Group(),
            model = makeCharacter("sponge");
          root.name = `teammate-${p.username}`;
          root.add(model);
          const rig = createLocomotion(model, false),
            equipment = createHeldTools(rig.rightHand);
          const canvas = document.createElement("canvas");
          canvas.width = 512;
          canvas.height = 96;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue("--hud-dark")
            .trim();
          ctx.fillRect(0, 0, 512, 96);
          ctx.font = "bold 42px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue("--tooth")
            .trim();
          ctx.fillText(p.username, 256, 63);
          const texture = new THREE.CanvasTexture(canvas);
          const label = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: texture, depthTest: false }),
          );
          label.scale.set(2.5, 0.47, 1);
          label.position.y = 2.55;
          root.add(label);
          scene.add(root);
          a = { root, rig, equipment, label };
          avatars.set(p.id, a);
          root.position.set(
            p.player.position.x,
            p.player.position.y,
            p.player.position.z,
          );
        }
        a.root.position.lerp(
          new THREE.Vector3(
            p.player.position.x,
            p.player.position.y,
            p.player.position.z,
          ),
          0.3,
        );
        a.root.rotation.y = p.player.facing;
        a.rig.update(
          elapsed,
          Math.hypot(p.player.velocity.x, p.player.velocity.z),
          p.player.grounded,
          p.player.emote,
          reducedMotion,
        );
        a.equipment.select(p.selected);
      }
    },
    clear() {
      for (const a of avatars.values()) dispose(a.root);
      avatars.clear();
    },
  };
}
