import * as THREE from "three";
import { makeCharacter } from "./characters.ts";
import { createLocomotion } from "./locomotion.ts";
import { createHeldTools } from "./held-tools.ts";
import { createHatModel, disposeHatModel } from "./hats.ts";
import { updateSpongeWaterState } from "./assets.ts";
import type { HatId, OnlinePlayer } from "../interfaces.ts";

type RemoteRig = ReturnType<typeof createLocomotion>;
type RemoteEquipment = ReturnType<typeof createHeldTools>;
interface Avatar {
  root: THREE.Group;
  model: THREE.Group;
  rig: RemoteRig;
  equipment: RemoteEquipment;
  label: THREE.Sprite;
  hat: THREE.Group | null;
  lastWaterState: string;
}

/** Clone mesh buffers for limb-pivot setup, while sharing the source materials. */
export function cloneCharacterVisual(source: THREE.Group): THREE.Group {
  const clone = source.clone(true);
  clone.traverse((object) => {
    if (object instanceof THREE.Mesh) object.geometry = object.geometry.clone();
  });
  return clone;
}

function disposeGeometries(root: THREE.Group): void {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) object.geometry.dispose();
  });
}

export function createRemotePlayers(scene: THREE.Scene) {
  const avatars = new Map<string, Avatar>();
  // This fallback is the same character factory used by the local player.
  let template = makeCharacter("sponge");
  let imported = false;

  const createLabel = (username: string): THREE.Sprite => {
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
    ctx.fillText(username, 256, 63);
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        depthTest: false,
      }),
    );
    label.scale.set(2.5, 0.47, 1);
    label.position.y = 2.55;
    return label;
  };

  const makeAvatarModel = (avatar: Avatar): void => {
    const previous = avatar.model;
    if (avatar.hat) {
      avatar.root.remove(avatar.hat);
      disposeHatModel(avatar.hat);
      avatar.hat = null;
    }
    avatar.root.remove(previous);
    disposeGeometries(previous);
    const model = cloneCharacterVisual(template);
    model.name = "SharedPlayerVisual";
    const rig = createLocomotion(model, imported);
    avatar.model = model;
    avatar.rig = rig;
    avatar.equipment = createHeldTools(rig.rightHand);
    avatar.root.add(model);
  };

  const disposeAvatar = (avatar: Avatar): void => {
    if (avatar.hat) {
      avatar.root.remove(avatar.hat);
      disposeHatModel(avatar.hat);
      avatar.hat = null;
    }
    avatar.root.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
      if (object instanceof THREE.Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
    scene.remove(avatar.root);
  };

  return {
    get assetKind(): "blender" | "shared-fallback" {
      return imported ? "blender" : "shared-fallback";
    },
    /** Snapshot a pristine template before local locomotion partitions its geometry. */
    setCharacterTemplate(source: THREE.Group, isImported = true): void {
      const next = cloneCharacterVisual(source);
      disposeGeometries(template);
      template = next;
      imported = isImported;
      for (const avatar of avatars.values()) makeAvatarModel(avatar);
    },
    update(
      players: OnlinePlayer[],
      self: string,
      elapsed: number,
      reducedMotion = false,
      appearance?: {
        sponge: number;
        capacity: number;
        temperature: number;
        equippedHat: HatId | null;
        visualScale: number;
      },
    ) {
      const wanted = new Set(
        players.filter((p) => p.id !== self).map((p) => p.id),
      );
      for (const [id, avatar] of avatars)
        if (!wanted.has(id)) {
          disposeAvatar(avatar);
          avatars.delete(id);
        }
      for (const player of players) {
        if (player.id === self) continue;
        let avatar = avatars.get(player.id);
        if (!avatar) {
          const root = new THREE.Group();
          root.name = `teammate-${player.username}`;
          const model = cloneCharacterVisual(template);
          model.name = "SharedPlayerVisual";
          const rig = createLocomotion(model, imported);
          const label = createLabel(player.username);
          const equipment = createHeldTools(rig.rightHand);
          root.add(model, label);
          scene.add(root);
          avatar = {
            root,
            model,
            rig,
            equipment,
            label,
            hat: null,
            lastWaterState: "",
          };
          avatars.set(player.id, avatar);
          root.position.set(
            player.player.position.x,
            player.player.position.y,
            player.player.position.z,
          );
        }
        avatar.root.position.lerp(
          new THREE.Vector3(
            player.player.position.x,
            player.player.position.y,
            player.player.position.z,
          ),
          0.3,
        );
        avatar.root.rotation.y = player.player.facing;
        avatar.root.scale.setScalar(appearance?.visualScale ?? 1);
        avatar.rig.update(
          elapsed,
          Math.hypot(player.player.velocity.x, player.player.velocity.z),
          player.player.grounded,
          player.player.emote,
          reducedMotion,
        );
        avatar.equipment.select(player.selected);

        if (appearance) {
          const waterState = `${appearance.sponge}:${appearance.capacity}:${appearance.temperature}`;
          if (waterState !== avatar.lastWaterState && imported) {
            updateSpongeWaterState(
              avatar.model,
              appearance.sponge,
              appearance.capacity,
              appearance.temperature,
            );
            avatar.lastWaterState = waterState;
          }
          if ((avatar.hat?.userData.hatId ?? null) !== appearance.equippedHat) {
            if (avatar.hat) {
              avatar.root.remove(avatar.hat);
              disposeHatModel(avatar.hat);
              avatar.hat = null;
            }
            if (appearance.equippedHat) {
              avatar.hat = createHatModel(appearance.equippedHat);
              avatar.hat.name = "equipped-hat";
              avatar.root.add(avatar.hat);
            }
          }
        }
      }
      return avatars.size;
    },
    clear() {
      for (const avatar of avatars.values()) disposeAvatar(avatar);
      avatars.clear();
    },
  };
}
