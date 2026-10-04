import { riversideBuddy as c } from "../../config/riverside-buddy.ts";
import { currentLevel, landmarkPose, levelPosition } from "./campaign.ts";
import type { CityState, AmbientActivity } from "../interfaces.ts";
/** Integrate only walking intervals so hands-on activities never slide around. */
export function riversideBuddyPose(s: CityState) {
  const loop = s.elapsed % c.cycleSeconds;
  const cycles = Math.floor(s.elapsed / c.cycleSeconds);
  let activity: AmbientActivity = "walk",
    start = 0,
    duration = 1;
  if (loop >= 22 && loop < 27) {
    activity = "sip";
    start = 22;
    duration = 5;
  } else if (loop >= 39 && loop < 45) {
    activity = "roll";
    start = 39;
    duration = 6;
  } else if (loop >= 45 && loop < 52) {
    activity = "smoke";
    start = 45;
    duration = 7;
  } else if (loop >= 52 && loop < 58) {
    activity = "cheer";
    start = 52;
    duration = 6;
  }
  const walkingTime =
    cycles * 54 +
    Math.min(loop, 22) +
    Math.max(0, Math.min(loop - 27, 12)) +
    Math.max(0, loop - 58);
  const phase = walkingTime * c.speed;
  const origin = levelPosition(s, landmarkPose(currentLevel(s), "buddy"));
  const messageIndex =
    Math.floor(s.elapsed / c.messageSeconds) % c.messages.length;
  return {
    x: origin.x + Math.sin(phase) * c.radiusX,
    z: origin.z + Math.cos(phase) * c.radiusZ,
    facing: Math.atan2(
      Math.cos(phase) * c.radiusX,
      -Math.sin(phase) * c.radiusZ,
    ),
    activity,
    progress: (loop - start) / duration,
    walkingTime,
    message: c.messages[messageIndex],
    speaking: activity === "cheer" || s.elapsed % c.messageSeconds < 2.2,
  };
}
