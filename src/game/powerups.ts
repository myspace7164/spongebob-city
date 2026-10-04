import { cityConfig } from "../../config/city.ts";
import { powerupConfig as c } from "../../config/powerups.ts";
import { performCityAction } from "./city.ts";
import type {
  CityState,
  PowerupState,
  PowerupKind,
  Vector3State,
} from "../interfaces.ts";
/** One carried or active boost, and at most one ground pickup. */
export function createPowerups(): PowerupState {
  return {
    pickups: [
      {
        id: "pore",
        ...cityConfig.landmarkDefaults.powerup,
        collected: false,
      },
    ],
    held: null,
    active: null,
    remaining: 0,
    dropIn: c.dropSeconds,
    dropIndex: 0,
    pulseIn: 0,
  };
}
/** Fresh boosts with the first pickup at a world point (the level's own spot). */
export function placePowerups(
  s: CityState,
  at: { x: number; z: number },
): void {
  s.powerups = createPowerups();
  s.powerups.pickups[0].x = at.x;
  s.powerups.pickups[0].z = at.z;
}
export function isPowerupActive(s: CityState, id: PowerupKind): boolean {
  return s.powerups.active === id && s.powerups.remaining > 0;
}
function cancelPowerup(s: CityState): void {
  if (s.powerups.active === "pore") s.powerTime = 0;
  if (s.powerups.active === "maximum") s.maximumTime = 0;
  s.powerups.active = null;
  s.powerups.remaining = 0;
  s.powerups.pulseIn = 0;
}
export function collectPowerups(
  s: CityState,
  position: Vector3State,
): PowerupKind[] {
  if (s.outcome !== "playing") return [];
  for (const pickup of s.powerups.pickups) {
    if (
      pickup.collected ||
      Math.hypot(position.x - pickup.x, position.z - pickup.z) > c.pickupRadius
    )
      continue;
    const nearest = s.plots.reduce(
      (best, p) =>
        Math.hypot(p.x - pickup.x, p.z - pickup.z) <
        Math.hypot(best.x - pickup.x, best.z - pickup.z)
          ? p
          : best,
      s.plots[0],
    );
    if (Math.abs(position.y - (nearest.elevation ?? 0)) > 2) continue;
    cancelPowerup(s);
    s.powerups.held = pickup.id;
    pickup.collected = true;
    const item = c.items.find((item) => item.id === pickup.id)!;
    s.feedback = `${item.icon} ${item.name} collected! Q to activate once. Replaces your previous boost.`;
    return [pickup.id];
  }
  return [];
}
export function activatePowerup(s: CityState): boolean {
  const id = s.powerups.held,
    item = c.items.find((item) => item.id === id);
  if (!id || !item || s.outcome !== "playing") return false;
  cancelPowerup(s);
  s.powerups.held = null;
  s.powerups.active = id;
  s.powerups.remaining = item.duration;
  s.powerups.pulseIn = 0;
  if (id === "pore") {
    s.powerTime = cityConfig.powerDuration;
    s.powerCooldown = cityConfig.powerCooldown;
  }
  if (id === "maximum") {
    s.maximumTime = cityConfig.maximumDuration;
    s.maximumCooldown = cityConfig.maximumCooldown;
  }
  s.feedback = `${item.icon} ${item.name.toUpperCase()}! ${item.description} ${item.duration}s boost.`;
  return true;
}
/** Sparse deterministic drops, tied to game time and safe plot locations, never stacked. */
export function updatePowerups(
  s: CityState,
  dt: number,
  position: Vector3State = { x: 999, y: 0, z: 999 },
): void {
  if (isPowerupActive(s, "patrick")) {
    s.powerups.pulseIn -= dt;
    if (s.powerups.pulseIn <= 0) {
      s.patrickCooldown = 0;
      performCityAction(s, "patrick", position, null);
      s.powerups.pulseIn = 2;
    }
  }
  s.powerups.remaining = Math.max(0, s.powerups.remaining - dt);
  if (s.powerups.remaining === 0) cancelPowerup(s);
  s.powerups.dropIn = Math.max(0, s.powerups.dropIn - dt);
  if (
    s.powerups.dropIn === 0 &&
    !s.powerups.pickups.some((p) => !p.collected)
  ) {
    const index = s.powerups.dropIndex++,
      item = c.items[(index * 7 + 3) % c.items.length];
    const plot = s.plots.filter((p) => !s.campaign || p.id !== 15)[
      (index * 5 + 2) % (s.plots.length - 1)
    ];
    s.powerups.pickups = [
      { id: item.id, x: plot.x + 1.6, z: plot.z + 1.6, collected: false },
    ];
    s.powerups.dropIn = c.dropSeconds;
  }
}
export function powerupMultiplier(s: CityState, id: PowerupKind): number {
  if (!isPowerupActive(s, id)) return 1;
  return id === "laeckerli"
    ? c.sprintMultiplier
    : id === "confetti"
      ? c.fundingMultiplier
      : id === "rhine"
        ? c.transferMultiplier
        : id === "bell"
          ? c.reachMultiplier
          : 1;
}
