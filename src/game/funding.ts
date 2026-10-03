import type { CityState } from "../interfaces";

/** Costs/refunds are separate; claimed grants survive recycling and sabotage. */
export function grantFunding(s: CityState, key: string, coins: number): void {
  if (s.outcome !== "playing" || s.funding.claimed.includes(key)) return;
  s.funding.claimed.push(key);
  s.funding.earned += coins;
  s.budget += coins;
}
