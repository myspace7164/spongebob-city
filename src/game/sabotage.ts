import { isPowerupActive } from "./powerups.ts";
import { cityConfig as c } from "../../config/city.ts";
import { betonConfig as b } from "../../config/beton.ts";
import { cityLevels } from "../../config/levels.ts";
import type { CityState } from "../interfaces.ts";
import type { PlayerState } from "../interfaces.ts";
import type { CollisionWorld } from "./collisions.ts";
import {
  activeLevelBounds,
  belongsToActiveLevel,
  clampInsideActiveLevel,
  isInsideActiveLevel,
} from "./active-level-area.ts";

const exposed = (kind: string) => kind === "soil" || kind === "basin";

export function activeBetonTargets(s: CityState) {
  const area = activeLevelBounds(s);
  return s.plots.filter(
    (plot) =>
      exposed(plot.kind) &&
      belongsToActiveLevel(area, plot, b.vehicleBoundaryMargin),
  );
}
function activePlots(s: CityState) {
  const area = activeLevelBounds(s);
  return s.plots.filter((plot) =>
    belongsToActiveLevel(area, plot, b.vehicleBoundaryMargin),
  );
}

function waypoint(s: CityState): void {
  const v = s.saboteur;
  const area = activeLevelBounds(s);
  v.step++;
  const patrol = activePlots(s);
  const p = patrol.length
    ? patrol[(v.step * 7 + 3) % patrol.length]
    : area.home;
  const destination = clampInsideActiveLevel(
    area,
    {
      x: p.x + Math.sin(v.step * 12.9898) * b.waypointSpread,
      z: p.z + Math.sin(v.step * 78.233) * b.waypointSpread,
    },
    b.vehicleBoundaryMargin,
  );
  v.destinationX = destination.x;
  v.destinationZ = destination.z;
}

function levelDifficulty(s: CityState): number {
  const index = s.campaign?.level ?? 0;
  return cityLevels.length <= 1
    ? 0
    : Math.max(0, Math.min(1, index / (cityLevels.length - 1)));
}

function levelMoveMultiplier(s: CityState): number {
  const t = levelDifficulty(s);
  return (
    b.levelPressure.firstMoveMultiplier * (1 - t) +
    b.levelPressure.finalMoveMultiplier * t
  );
}

function levelPauseMultiplier(s: CityState): number {
  if (!s.campaign) return 1;
  const t = levelDifficulty(s);
  return (
    b.levelPressure.firstPauseMultiplier * (1 - t) +
    b.levelPressure.finalPauseMultiplier * t
  );
}

function recoverToActiveArea(s: CityState): void {
  const v = s.saboteur;
  const area = activeLevelBounds(s);
  const margin = b.vehicleBoundaryMargin;
  const previous =
    v.lastValidX !== undefined &&
    v.lastValidZ !== undefined &&
    isInsideActiveLevel(area, { x: v.lastValidX, z: v.lastValidZ }, margin)
      ? { x: v.lastValidX, z: v.lastValidZ }
      : clampInsideActiveLevel(area, area.home, margin);
  v.x = previous.x;
  v.z = previous.z;
  v.destinationX = previous.x;
  v.destinationZ = previous.z;
  v.targetId = null;
  v.sealTime = 0;
  v.phase = "roaming";
  // A safety recovery cancels the stale route; let the same update find a
  // replacement target rather than idling outside the level for a full cycle.
  s.sabotageIn = 0;
}

function validTarget(s: CityState) {
  const area = activeLevelBounds(s);
  return s.plots.find(
    (plot) =>
      plot.id === s.saboteur.targetId &&
      exposed(plot.kind) &&
      belongsToActiveLevel(area, plot, b.vehicleBoundaryMargin),
  );
}
function move(
  s: CityState,
  dt: number,
  speed: number,
  collisions?: CollisionWorld,
  groundAt: (x: number, z: number) => number = () => 0,
): { arrived: boolean; blocked: boolean } {
  const v = s.saboteur;
  const dx = v.destinationX - v.x,
    dz = v.destinationZ - v.z;
  const distance = Math.hypot(dx, dz);
  let blocked = false;
  if (distance > b.arrivalDistance) {
    v.facing = Math.atan2(dx, dz);
    const amount = Math.min(distance, speed * dt);
    if (collisions) {
      const actor: PlayerState = {
        position: { x: v.x, y: groundAt(v.x, v.z), z: v.z },
        velocity: { x: 0, y: 0, z: 0 },
        grounded: true,
        facing: v.facing,
      };
      const result = collisions.move(
        actor,
        (dx / distance) * amount,
        (dz / distance) * amount,
        1.35,
        2.7,
        ["dr-beton", "dr-beton-vehicle"],
      );
      v.x = actor.position.x;
      v.z = actor.position.z;
      blocked = result.blockedX || result.blockedZ;
    } else {
      v.x += (dx / distance) * amount;
      v.z += (dz / distance) * amount;
    }
  }
  const area = activeLevelBounds(s);
  if (!isInsideActiveLevel(area, v, b.vehicleBoundaryMargin)) {
    recoverToActiveArea(s);
    blocked = true;
  } else {
    v.lastValidX = v.x;
    v.lastValidZ = v.z;
  }
  return {
    arrived:
      Math.hypot(v.destinationX - v.x, v.destinationZ - v.z) <=
      b.arrivalDistance,
    blocked,
  };
}
/** Fixed-step roam → approach → seal; a plot changes only after the visible attack. */
export function updateSaboteur(
  s: CityState,
  dt: number,
  speedMultiplier = 1,
  collisions?: CollisionWorld,
  groundAt: (x: number, z: number) => number = () => 0,
): void {
  const v = s.saboteur;
  const area = activeLevelBounds(s);
  const margin = b.vehicleBoundaryMargin;
  if (v.levelId !== area.levelId) {
    const spawn = clampInsideActiveLevel(area, area.home, margin);
    v.levelId = area.levelId;
    v.x = spawn.x;
    v.z = spawn.z;
    v.lastValidX = spawn.x;
    v.lastValidZ = spawn.z;
    v.destinationX = spawn.x;
    v.destinationZ = spawn.z;
    v.targetId = null;
    v.phase = "roaming";
    v.sealTime = 0;
    v.step = 0;
    s.sabotageIn = c.sabotageInterval * levelPauseMultiplier(s);
  }
  if (!isInsideActiveLevel(area, v, margin)) recoverToActiveArea(s);
  if (isPowerupActive(s, "basilisk")) {
    v.phase = "disabled";
    v.targetId = null;
    v.sealTime = 0;
    return;
  }
  if (s.machineDisabled > 0) {
    s.machineDisabled = Math.max(0, s.machineDisabled - dt);
    v.phase = "disabled";
    v.targetId = null;
    return;
  }
  if (v.phase === "disabled") {
    v.phase = "roaming";
    waypoint(s);
  }
  if (v.phase === "roaming") {
    if (v.step === 0) waypoint(s);
    const movement = move(
      s,
      dt,
      b.roamSpeed * speedMultiplier * levelMoveMultiplier(s),
      collisions,
      groundAt,
    );
    if (movement.blocked || movement.arrived) waypoint(s);
    s.sabotageIn -= dt / levelPauseMultiplier(s);
    if (s.sabotageIn > 0) return;
    const choices = activeBetonTargets(s);
    if (!choices.length) {
      s.sabotageIn = c.sabotageInterval * levelPauseMultiplier(s);
      return;
    }
    const victim = choices
      .slice()
      .sort(
        (a, b) =>
          b.surface +
          b.moisture +
          b.stored -
          (a.surface + a.moisture + a.stored),
      )[v.step % choices.length];
    v.targetId = victim.id;
    v.destinationX = victim.x;
    v.destinationZ = victim.z;
    v.phase = "approaching";
    s.feedback = `Dr. Beton is stalking plot #${victim.id + 1}! Intercept him with E or karate.`;
    return;
  }
  const victim = validTarget(s);
  if (!victim) {
    v.phase = "roaming";
    v.targetId = null;
    s.sabotageIn = c.sabotageInterval * levelPauseMultiplier(s);
    waypoint(s);
    return;
  }
  if (v.phase === "approaching") {
    const movement = move(
      s,
      dt,
      b.attackSpeed * speedMultiplier * levelMoveMultiplier(s),
      collisions,
      groundAt,
    );
    if (movement.arrived) {
      v.phase = "sealing";
      v.sealTime = b.sealingSeconds;
      s.feedback = `Dr. Beton is sealing #${victim.id + 1}! Stop him now!`;
      return;
    }
    if (movement.blocked) {
      v.phase = "roaming";
      v.targetId = null;
      s.sabotageIn = c.sabotageInterval;
      waypoint(s);
      return;
    }
    return;
  }
  // Revalidate immediately before every pour update: a level transition,
  // stale room snapshot, reclaimed plot, or outside candidate cancels it.
  if (!validTarget(s)) {
    v.phase = "roaming";
    v.targetId = null;
    v.sealTime = 0;
    s.sabotageIn = c.sabotageInterval * levelPauseMultiplier(s);
    waypoint(s);
    return;
  }
  v.sealTime -= dt * speedMultiplier;
  if (v.sealTime > 0) return;
  const finalVictim = validTarget(s);
  if (!finalVictim) {
    v.phase = "roaming";
    v.targetId = null;
    v.sealTime = 0;
    s.sabotageIn = c.sabotageInterval * levelPauseMultiplier(s);
    waypoint(s);
    return;
  }
  finalVictim.kind = "asphalt";
  finalVictim.concretedByBeton = true;
  finalVictim.surface += finalVictim.moisture + finalVictim.stored;
  finalVictim.moisture = 0;
  finalVictim.stored = 0;
  v.phase = "roaming";
  v.targetId = null;
  s.sabotageIn = c.sabotageInterval * levelPauseMultiplier(s);
  waypoint(s);
  s.feedback = "Dr. Beton: MORE ASPHALT! Catch me if you can!";
}
