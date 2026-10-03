import { levelModifiers } from "../../config/modifiers.ts";
import type {
  CityState,
  LevelModifierDefinition,
  LevelModifierId,
} from "../interfaces.ts";

export function modifierDefinition(
  id: LevelModifierId | null | undefined,
): LevelModifierDefinition | undefined {
  return id ? levelModifiers.find((modifier) => modifier.id === id) : undefined;
}

export function activeModifier(
  s: CityState,
): LevelModifierDefinition | undefined {
  return modifierDefinition(s.campaign?.activeModifier);
}

export function chooseLevelModifier(
  random: () => number = Math.random,
): LevelModifierId {
  const total = levelModifiers.reduce(
    (sum, modifier) => sum + modifier.weight,
    0,
  );
  let ticket = Math.max(0, Math.min(0.999999999999, random())) * total;
  for (const modifier of levelModifiers) {
    ticket -= modifier.weight;
    if (ticket < 0) return modifier.id;
  }
  return levelModifiers.at(-1)!.id;
}

/** Rotation that places the selected weighted slice's center under the top pointer. */
export function wheelLandingRotation(id: LevelModifierId): number {
  const total = levelModifiers.reduce((sum, item) => sum + item.weight, 0);
  let preceding = 0;
  for (const item of levelModifiers) {
    if (item.id === id)
      return (360 - ((preceding + item.weight / 2) / total) * 360) % 360;
    preceding += item.weight;
  }
  throw new Error(`Unknown level modifier: ${id}`);
}

/** Find the actual weighted slice beneath a pointer at the top of the wheel. */
export function modifierAtWheelPointer(rotation: number): LevelModifierId {
  const total = levelModifiers.reduce((sum, item) => sum + item.weight, 0);
  const angle = (((360 - (rotation % 360)) % 360) / 360) * total;
  let preceding = 0;
  for (const item of levelModifiers) {
    preceding += item.weight;
    if (angle < preceding) return item.id;
  }
  return levelModifiers.at(-1)!.id;
}

export function modifierMultiplier(
  s: CityState,
  key:
    | "playerSpeed"
    | "absorptionSpeed"
    | "waterCapacity"
    | "betonSpeed"
    | "coinReward"
    | "playerScale"
    | "heatWarming",
): number {
  return activeModifier(s)?.effects[key] ?? 1;
}
