import { updateEmote } from "./emotes";
import { gameConfig as config } from "../../config/game";
import type { MovementInput, PlayerState } from "../interfaces";

export function createPlayer(): PlayerState {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    grounded: true,
    facing: 0,
  };
}

/** Advance a single fixed simulation step; the player lands on the ground height below. */
export function updatePlayer(
  player: PlayerState,
  input: MovementInput,
  yaw: number,
  dt: number,
  groundAt: (x: number, z: number) => number = () => 0,
  sprintMultiplier = 1,
): void {
  updateEmote(player, input, dt);
  const length = Math.max(1, Math.hypot(input.forward, input.right));
  const speed = input.run
    ? config.runSpeed * sprintMultiplier
    : config.walkSpeed;
  const forward = input.forward / length;
  const right = input.right / length;
  const targetX = (right * Math.cos(yaw) - forward * Math.sin(yaw)) * speed;
  const targetZ = (-right * Math.sin(yaw) - forward * Math.cos(yaw)) * speed;
  const blend = 1 - Math.exp(-config.acceleration * dt);
  player.velocity.x += (targetX - player.velocity.x) * blend;
  player.velocity.z += (targetZ - player.velocity.z) * blend;
  if (input.jump && player.grounded) {
    player.velocity.y = config.jumpSpeed;
    player.grounded = false;
  }
  player.velocity.y -= config.gravity * dt;
  player.position.x += player.velocity.x * dt;
  player.position.y += player.velocity.y * dt;
  player.position.z += player.velocity.z * dt;
  const ground = groundAt(player.position.x, player.position.z);
  // Walking downhill keeps contact instead of briefly falling off each step.
  if (
    player.grounded &&
    player.velocity.y <= 0 &&
    player.position.y - ground < 0.3
  )
    player.position.y = ground;
  if (player.position.y <= ground) {
    player.position.y = ground;
    player.velocity.y = 0;
    player.grounded = true;
  }
  if (Math.hypot(player.velocity.x, player.velocity.z) > 0.1) {
    player.facing = Math.atan2(player.velocity.x, player.velocity.z);
  }
}
