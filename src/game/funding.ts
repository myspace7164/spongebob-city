import type { CityState } from "../interfaces";
import { modifierMultiplier } from "./level-modifiers";

/** Costs/refunds are separate; claimed grants survive recycling and sabotage. */
export function grantFunding(s: CityState, key: string, coins: number): void {
  if (s.outcome !== "playing" || s.funding.claimed.includes(key)) return;
  s.funding.claimed.push(key);
  const reward = Math.round(coins * modifierMultiplier(s, "coinReward"));
  s.funding.earned += reward;
  s.budget += reward;
}
