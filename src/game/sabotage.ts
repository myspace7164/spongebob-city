import { isPowerupActive } from "./powerups";
import { cityConfig as c } from "../../config/city";
import { betonConfig as b } from "../../config/beton";
import type { CityState } from "../interfaces";

function waypoint(s: CityState): void {
  const v = s.saboteur;
  v.step++;
  const p = s.plots[(v.step * 7 + 3) % s.plots.length];
  v.destinationX = p.x + Math.sin(v.step * 12.9898) * b.waypointSpread;
  v.destinationZ = p.z + Math.sin(v.step * 78.233) * b.waypointSpread;
}
function move(s: CityState, dt: number, speed: number): boolean {
  const v = s.saboteur;
  const dx = v.destinationX - v.x,
    dz = v.destinationZ - v.z;
  const distance = Math.hypot(dx, dz);
  if (distance > b.arrivalDistance) {
    v.facing = Math.atan2(dx, dz);
    const amount = Math.min(distance, speed * dt);
    v.x += (dx / distance) * amount;
    v.z += (dz / distance) * amount;
  }
  return distance <= b.arrivalDistance + speed * dt;
}
const exposed = (kind: string) => kind === "soil" || kind === "basin";

/** Fixed-step roam → approach → seal; a plot changes only after the visible attack. */
export function updateSaboteur(s: CityState, dt: number): void {
  const v = s.saboteur;
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
    if (move(s, dt, b.roamSpeed)) waypoint(s);
    s.sabotageIn -= dt;
    if (s.sabotageIn > 0) return;
    const choices = s.plots.filter((p) => exposed(p.kind));
    if (!choices.length) {
      s.sabotageIn = c.sabotageInterval;
      return;
    }
    const victim = choices[v.step % choices.length];
    v.targetId = victim.id;
    v.destinationX = victim.x;
    v.destinationZ = victim.z;
    v.phase = "approaching";
    s.feedback = `Dr. Beton is stalking plot #${victim.id + 1}! Intercept him with E or karate.`;
    return;
  }
  const victim = s.plots.find((p) => p.id === v.targetId);
  if (!victim || !exposed(victim.kind)) {
    v.phase = "roaming";
    v.targetId = null;
    s.sabotageIn = c.sabotageInterval;
    waypoint(s);
    return;
  }
  if (v.phase === "approaching") {
    if (move(s, dt, b.attackSpeed)) {
      v.phase = "sealing";
      v.sealTime = b.sealingSeconds;
      s.feedback = `Dr. Beton is sealing #${victim.id + 1}! Stop him now!`;
    }
    return;
  }
  v.sealTime -= dt;
  if (v.sealTime > 0) return;
  victim.kind = "asphalt";
  victim.surface += victim.moisture + victim.stored;
  victim.moisture = 0;
  victim.stored = 0;
  v.phase = "roaming";
  v.targetId = null;
  s.sabotageIn = c.sabotageInterval;
  waypoint(s);
  s.feedback = "Dr. Beton: MORE ASPHALT! Catch me if you can!";
}
