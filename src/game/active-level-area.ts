import { cityConfig } from "../../config/city.ts";
import { cityLevels } from "../../config/levels.ts";
import type { CityState, Vector3State } from "../interfaces.ts";

export interface ActiveLevelBounds {
  levelId: string | null;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  home: { x: number; z: number };
}

/** The one authoritative play-space rectangle, in world coordinates. */
export function activeLevelBounds(state: CityState): ActiveLevelBounds {
  const level = cityLevels[state.campaign?.level ?? -1];
  const origin = level?.origin ?? { x: 0, z: 0 };
  const bounds = level?.site?.bounds ?? cityConfig.bounds;
  const betonHome = level?.site?.npcs?.beton ?? [
    cityConfig.machine.x,
    cityConfig.machine.z,
  ];
  return {
    levelId: level?.id ?? null,
    minX: origin.x + bounds.minX,
    maxX: origin.x + bounds.maxX,
    minZ: origin.z + bounds.minZ,
    maxZ: origin.z + bounds.maxZ,
    home: { x: origin.x + betonHome[0], z: origin.z + betonHome[1] },
  };
}

/** Vehicle clearance is included as an inset so its collider stays in bounds. */
export function isInsideActiveLevel(
  area: ActiveLevelBounds,
  position: Pick<Vector3State, "x" | "z">,
  inset = 0,
): boolean {
  return (
    position.x >= area.minX + inset &&
    position.x <= area.maxX - inset &&
    position.z >= area.minZ + inset &&
    position.z <= area.maxZ - inset
  );
}

export function clampInsideActiveLevel(
  area: ActiveLevelBounds,
  position: Pick<Vector3State, "x" | "z">,
  inset = 0,
): { x: number; z: number } {
  return {
    x: Math.max(area.minX + inset, Math.min(area.maxX - inset, position.x)),
    z: Math.max(area.minZ + inset, Math.min(area.maxZ - inset, position.z)),
  };
}

/** A target must be registered to the active level and physically inside it. */
export function belongsToActiveLevel(
  area: ActiveLevelBounds,
  plot: { levelId?: string; x: number; z: number },
  inset = 0,
): boolean {
  return (
    (area.levelId === null ? plot.levelId === undefined : plot.levelId === area.levelId) &&
    isInsideActiveLevel(area, plot, inset)
  );
}
