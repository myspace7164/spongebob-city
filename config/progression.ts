import type { CityTool } from "../src/interfaces";
/** Unlocks introduce only techniques that the current campaign needs. Levels are one-based. */
export const toolUnlockLevel: Record<CityTool, number> = {
  absorb: 1,
  spray: 1,
  karate: 1,
  basin: 1,
  tree: 2,
  roof: 3,
  shade: 3,
  pond: 4,
  tank: 4,
};
