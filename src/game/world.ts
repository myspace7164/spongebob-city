import * as THREE from "three";
import { gameConfig } from "../../config/game";
import type { PlayerState } from "../interfaces";
import { makeCharacter } from "./characters";

/** Fixed-size visuals that follow the player; world geometry never accumulates. */
export function createWorld(scene: THREE.Scene) {
  const style = getComputedStyle(document.documentElement);
  const color = (name: string) =>
    new THREE.Color(style.getPropertyValue(name).trim());
  scene.background = color("--sky");
  scene.fog = new THREE.Fog(color("--sky"), 35, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, color("--ink"), 2.4));
  const sunlight = new THREE.DirectionalLight(0xffffff, 2.5);
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
    update(player: PlayerState) {
      const { x, y, z } = player.position;
      character.position.set(x, y, z);
      character.rotation.y = player.facing;
      ground.position.set(x, 0, z);
      shadow.position.set(x, 0.015, z);
      shadow.scale.setScalar(1 + y * 0.15);
      shadow.material.opacity = 0.25 / (1 + y);
    },
  };
}
