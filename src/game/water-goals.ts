/** Tiny tolerance for floating-point accumulation, expressed in litres. */
export const WATER_GOAL_EPSILON_LITRES = 1e-6;

/** Completion and display share one safe threshold for water-use objectives. */
export function waterUsageReached(used: number, required: number): boolean {
  return used + WATER_GOAL_EPSILON_LITRES >= required;
}

/** Whole-litre progress never rounds up to a goal that has not been reached. */
export function waterUsageDisplayValue(
  used: number,
  required?: number,
): number {
  const wholeLitres = Math.floor(used + WATER_GOAL_EPSILON_LITRES);
  if (required === undefined) return wholeLitres;
  return waterUsageReached(used, required)
    ? required
    : Math.min(wholeLitres, Math.floor(required));
}
