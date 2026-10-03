import { toolUnlockLevel } from "../../config/progression";
import type { CityState, CityTool } from "../interfaces";
export function levelsUntilTool(s: CityState, tool: CityTool): number {
  return s.campaign
    ? Math.max(0, toolUnlockLevel[tool] - s.campaign.level - 1)
    : 0;
}
export function isToolAvailable(s: CityState, tool: CityTool): boolean {
  return levelsUntilTool(s, tool) === 0;
}
