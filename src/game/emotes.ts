import { emoteConfig } from "../../config/emotes";
import type { EmoteKind, MovementInput, PlayerState } from "../interfaces";
export function isEmoteId(id: unknown): id is EmoteKind {
  return (
    typeof id === "string" && emoteConfig.items.some((item) => item.id === id)
  );
}
export function startEmote(player: PlayerState, id: EmoteKind): boolean {
  const item = emoteConfig.items.find((item) => item.id === id);
  if (!item) return false;
  player.emote = { id, elapsed: 0, remaining: item.duration };
  return true;
}
export function updateEmote(
  player: PlayerState,
  input: MovementInput,
  dt: number,
): void {
  if (!player.emote) return;
  if (input.forward !== 0 || input.right !== 0 || input.jump) {
    delete player.emote;
    return;
  }
  player.emote.elapsed += dt;
  player.emote.remaining = Math.max(0, player.emote.remaining - dt);
  if (player.emote.remaining === 0) delete player.emote;
}
/** Original, stylized dance poses relative to the relaxed limb angles. */
export function emotePose(id: EmoteKind, time: number) {
  const t = Math.max(0, time),
    wave = Math.sin(t * 7);
  const pose = {
    left: [0, 0, 0],
    right: [0, 0, 0],
    leftLeg: 0,
    rightLeg: 0,
    yaw: 0,
    lean: 0,
    roll: 0,
    bob: 0,
    squash: 1,
  };
  switch (id) {
    case "six-seven":
      pose.left = [-1.15 + wave * 0.45, 0.3, -0.45];
      pose.right = [-1.15 - wave * 0.45, -0.3, 0.45];
      pose.roll = wave * 0.06;
      break;
    case "macarena": {
      const step = Math.floor(t * 2) % 8;
      pose.left =
        step < 2
          ? [-1.5, 0, 0]
          : step < 4
            ? [-1.3, 0.8, -0.3]
            : step < 6
              ? [-2.3, 0, -0.7]
              : [-0.4, 0, -0.4];
      pose.right =
        step === 0
          ? [0, 0, 0]
          : step < 3
            ? [-1.5, 0, 0]
            : step < 5
              ? [-1.3, -0.8, 0.3]
              : step < 7
                ? [-2.3, 0, 0.7]
                : [-0.4, 0, 0.4];
      pose.yaw = Math.sin(t * 3) * 0.3;
      pose.bob = Math.abs(Math.sin(t * 4)) * 0.06;
      break;
    }
    case "teabag": {
      const crouch = (1 - Math.cos(t * 10)) / 2;
      pose.squash = 1 - crouch * 0.28;
      pose.leftLeg = pose.rightLeg = crouch * 0.4;
      pose.lean = crouch * 0.08;
      pose.left = [-crouch * 0.35, 0, 0];
      pose.right = [-crouch * 0.35, 0, 0];
      break;
    }
    case "dab":
      pose.left = [-1.7, 0.6, -0.7];
      pose.right = [-1.4, -0.7, -1.25];
      pose.roll = -0.18;
      pose.lean = 0.15;
      break;
    case "floss":
      pose.left = [wave * 0.65, wave * 0.4, -wave * 0.85];
      pose.right = [-wave * 0.65, wave * 0.4, -wave * 0.85];
      pose.yaw = -wave * 0.3;
      pose.roll = wave * 0.08;
      pose.leftLeg = -wave * 0.12;
      pose.rightLeg = wave * 0.12;
      break;
  }
  return pose;
}
