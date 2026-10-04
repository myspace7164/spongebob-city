import * as THREE from "three";
import { gameConfig } from "../../config/game.ts";
import type { PlayerState, CityTool } from "../interfaces.ts";
import { makeCharacter } from "./characters.ts";
import { createLocomotion } from "./locomotion.ts";
import { createHeldTools } from "./held-tools.ts";
import { createHatModel, disposeHatModel, updateHatSparkles } from "./hats.ts";
import type { HatId } from "../interfaces.ts";

/** Fixed-size visuals that follow the player; world geometry never accumulates. */
export function createWorld(scene: THREE.Scene) {
  const style = getComputedStyle(document.documentElement);
  const color = (name: string) =>
    new THREE.Color(style.getPropertyValue(name).trim());
  scene.background = color("--sky");
  const { fog } = gameConfig.weatherVisuals;
  scene.fog = new THREE.Fog(color("--sky"), fog.dry.near, fog.dry.far);
  const skylight = new THREE.HemisphereLight(0xffffff, color("--ink"), 2.4);
  skylight.name = "skylight";
  scene.add(skylight);
  // The weather view tints and dims these by heat and rain.
  const sunlight = new THREE.DirectionalLight(0xffffff, 2.5);
  sunlight.name = "sunlight";
  sunlight.position.set(8, 14, 6);
  scene.add(sunlight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(gameConfig.groundSize, gameConfig.groundSize),
    new THREE.MeshLambertMaterial({ color: color("--ground") }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const character = new THREE.Group();
  const placeholder = makeCharacter("sponge");
  character.add(placeholder);
  let rig = createLocomotion(placeholder, false);
  let equipment = createHeldTools(rig.rightHand);
  let wearableHat: THREE.Group | null = null;
  scene.add(character);

  // A single transparent disc gives a readable height cue without shadow maps.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 24),
    new THREE.MeshBasicMaterial({
      color: color("--ink"),
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  return {
    character,
    placeholder,
    useCharacter(model: THREE.Group) {
      const nextRig = createLocomotion(model, true);
      character.remove(placeholder);
      character.add(model);
      rig = nextRig;
      equipment = createHeldTools(rig.rightHand);
    },
    equipHat(id: HatId | null) {
      if (character.userData.equippedHat === id) return;
      if (wearableHat) {
        character.remove(wearableHat);
        disposeHatModel(wearableHat);
        wearableHat = null;
      }
      character.userData.equippedHat = id;
      if (!id) return;
      wearableHat = createHatModel(id);
      wearableHat.name = "equipped-hat";
      character.add(wearableHat);
    },
    get wearableHat() {
      return wearableHat;
    },
    /** The flat plane only stands in while no terrain is loaded. */
    useTerrain() {
      ground.visible = false;
    },
    update(
      player: PlayerState,
      groundY = 0,
      elapsed = 0,
      selected: CityTool = "absorb",
      reducedMotion = false,
    ) {
      rig.update(
        elapsed,
        Math.hypot(player.velocity.x, player.velocity.z),
        player.grounded,
        player.emote,
        reducedMotion,
      );
      updateHatSparkles(wearableHat, elapsed);
      equipment.select(selected);
      const { x, y, z } = player.position;
      const height = y - groundY;
      character.position.set(x, y, z);
      character.rotation.y = player.facing;
      ground.position.set(x, 0, z);
      shadow.position.set(x, groundY + 0.015, z);
      shadow.scale.setScalar(1 + height * 0.15);
      shadow.material.opacity = 0.25 / (1 + height);
    },
  };
}
