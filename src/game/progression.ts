import { toolUnlockLevel } from "../../config/progression.ts";
import type { CityState, CityTool } from "../interfaces.ts";
export function levelsUntilTool(s: CityState, tool: CityTool): number {
  if (s.campaign?.endlessRound) return 0;
  return s.campaign
    ? Math.max(0, toolUnlockLevel[tool] - s.campaign.level - 1)
    : 0;
}
export function isToolAvailable(s: CityState, tool: CityTool): boolean {
  return levelsUntilTool(s, tool) === 0;
}
