import { updateEmote } from "./emotes";
import { gameConfig as config } from "../../config/game";
import type { MovementInput, PlayerState } from "../interfaces";
import type { CollisionWorld } from "./collisions";

export function createPlayer(): PlayerState {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    grounded: true,
    facing: 0,
    sprintElapsed: 0,
    sprintCooldown: 0,
    sprinting: false,
  };
}

/** Advance a single fixed simulation step; the player lands on the ground height below. */
export function updatePlayer(
  player: PlayerState,
  input: MovementInput,
  yaw: number,
  dt: number,
  groundAt: (x: number, z: number) => number = () => 0,
  speedMultiplier = 1,
  collisions?: CollisionWorld,
  runSpeedMultiplier = 1,
): void {
  updateEmote(player, input, dt);
  const length = Math.max(1, Math.hypot(input.forward, input.right));
  const wantsSprint =
    input.run && Math.hypot(input.forward, input.right) > 0.001;
  const cooldown = Math.max(0, player.sprintCooldown ?? 0);
  let sprinting = false;
  if (cooldown > 0) {
    // A step that reaches zero still counts as cooldown; running resumes next step.
    player.sprintCooldown = Math.max(0, cooldown - dt);
    player.sprintElapsed = 0;
  } else if (wantsSprint) {
    sprinting = true;
    const elapsed = (player.sprintElapsed ?? 0) + dt;
    if (elapsed >= config.sprintDurationSeconds) {
      player.sprintElapsed = 0;
      player.sprintCooldown = config.sprintCooldownSeconds;
    } else player.sprintElapsed = elapsed;
  }
  player.sprinting = sprinting;
  const speed =
    (sprinting ? config.runSpeed * runSpeedMultiplier : config.walkSpeed) *
    speedMultiplier;
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
  const dx = player.velocity.x * dt;
  const dz = player.velocity.z * dt;
  if (collisions) {
    collisions.move(
      player,
      dx,
      dz,
      config.playerCollisionRadius,
      config.playerCollisionHeight,
    );
  } else {
    player.position.x += dx;
    player.position.z += dz;
  }
  player.position.y += player.velocity.y * dt;
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
