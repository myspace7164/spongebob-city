import { cast, characterConfig as c } from "../../config/characters.ts";
import { levelPosition } from "./campaign.ts";
import type { CityState } from "../interfaces.ts";
/** Simulation-time routes freeze on pause and match in every co-op client. */
export function castPosition(s: CityState, index: number) {
  const actor = cast[index],
    phase = s.elapsed * actor.speed + index * 1.7;
  const origin = levelPosition(s, actor);
  return {
    x: origin.x + Math.sin(phase) * c.wanderRadius,
    z: origin.z + Math.sin(phase * 2) * c.wanderRadius * 0.45,
    facing: Math.atan2(Math.cos(phase), Math.cos(phase * 2) * 0.9),
    speed: actor.speed * c.wanderRadius,
  };
}
export function characterAudibility(distance: number): number {
  return Math.max(0, 1 - distance / c.voiceDistance) ** 2;
}
