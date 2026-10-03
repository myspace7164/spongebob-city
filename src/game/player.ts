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

/** Advance a single fixed simulation step on an unbounded flat plane. */
export function updatePlayer(
  player: PlayerState,
  input: MovementInput,
  yaw: number,
  dt: number,
): void {
  const length = Math.max(1, Math.hypot(input.forward, input.right));
  const speed = input.run ? config.runSpeed : config.walkSpeed;
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
  if (player.position.y <= 0) {
    player.position.y = 0;
    player.velocity.y = 0;
    player.grounded = true;
  }
  if (Math.hypot(player.velocity.x, player.velocity.z) > 0.1) {
    player.facing = Math.atan2(player.velocity.x, player.velocity.z);
  }
}
