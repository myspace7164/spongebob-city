import { updateWater } from "./city-water";
import { advanceCampaign, currentLevel } from "./campaign";
import { cityConfig as c, cityTools, plotCooling } from "../../config/city";
import type {
  CityAction,
  CityMetrics,
  CityPlot,
  CityState,
  Vector3State,
} from "../interfaces";

export function createCity(): CityState {
  return {
    plots: Array.from({ length: c.plotCount }, (_, id) => ({
      id,
      x: ((id % 4) - 1.5) * c.plotSpacing,
      z: -5 - Math.floor(id / 4) * c.plotSpacing,
      kind: "asphalt",
      surface: c.initialSurface,
      moisture: 0,
      stored: 0,
    })),
    elapsed: 0,
    heat: c.initialHeat,
    flood: (100 * c.plotCount * c.initialSurface) / c.floodLitres,
    sponge: 0,
    budget: c.budget,
    reused: 0,
    rainfall: 0,
    evaporated: 0,
    infiltrated: 0,
    stormSeen: false,
    outcome: "playing",
    dangerTime: 0,
    sabotageIn: c.sabotageInterval,
    machineDisabled: 0,
    powerTime: 0,
    powerCooldown: 0,
    maximumTime: 0,
    maximumCooldown: 0,
    patrickCooldown: 0,
    upgraded: false,
    selected: "absorb",
    feedback:
      "SpongeBob: Why isn't Basel underwater? Let's save the rain for the trees!",
  };
}

export function weather(state: CityState) {
  const climate = currentLevel(state)?.weather ?? c;
  const phase = state.elapsed % (climate.dryDuration + climate.rainDuration);
  return {
    raining: phase >= climate.dryDuration,
    remaining:
      phase < climate.dryDuration
        ? climate.dryDuration - phase
        : climate.dryDuration + climate.rainDuration - phase,
  };
}
export function spongeCapacity(s: CityState): number {
  return s.maximumTime > 0
    ? c.maximumCapacity
    : s.powerTime > 0
      ? c.poweredCapacity
      : s.upgraded
        ? c.upgradedCapacity
        : c.capacity;
}
export function cityMetrics(s: CityState): CityMetrics {
  const permeable = s.plots.filter((p) => p.kind !== "asphalt").length;
  return {
    permeable,
    trees: s.plots.filter((p) => p.kind === "tree").length,
    healthyTrees: s.plots.filter(
      (p) => p.kind === "tree" && p.moisture >= c.moistureHealthy,
    ).length,
    retained: s.plots.reduce((n, p) => n + p.moisture + p.stored, 0),
    unsealedArea: permeable * c.plotArea,
    temperature:
      c.temperatureBase + (s.heat * c.temperatureSpan) / c.initialHeat,
  };
}
const distance = (p: { x: number; z: number }, position: Vector3State) =>
  Math.hypot(p.x - position.x, p.z - position.z);
const storagePlot = (p: CityPlot) => ["tank", "pond", "roof"].includes(p.kind);

/** Transfer only available water into finite useful capacity; asphalt cannot be irrigated. */
function spray(s: CityState, p: CityPlot, amount: number): number {
  if (p.kind === "asphalt") return 0;
  const field = storagePlot(p) ? "stored" : "moisture";
  const limit = field === "stored" ? c.storageCapacity : c.soilCapacity;
  const transferred = Math.max(0, Math.min(s.sponge, amount, limit - p[field]));
  p[field] += transferred;
  s.sponge -= transferred;
  s.reused += transferred;
  return transferred;
}
function absorb(s: CityState, p: CityPlot, amount: number): number {
  const transferred = Math.max(
    0,
    Math.min(p.surface, amount, spongeCapacity(s) - s.sponge),
  );
  p.surface -= transferred;
  s.sponge += transferred;
  return transferred;
}

/** Actions validate outcome, reach, prerequisites and funds before mutating the city. */
export function performCityAction(
  s: CityState,
  action: CityAction,
  position: Vector3State,
  plotId: number | null,
  amount?: number,
  bubbles = false,
): string {
  if (s.outcome !== "playing") return s.feedback;
  s.feedback = act(s, action, position, plotId, amount, bubbles);
  return s.feedback;
}
function act(
  s: CityState,
  action: CityAction,
  position: Vector3State,
  plotId: number | null,
  amount = action === "spray" ? c.sprayRate : c.absorbRate,
  bubbles = false,
): string {
  if (action === "power" || action === "maximum") {
    const maximum = action === "maximum";
    if (maximum && s.reused < c.maximumUnlock)
      return `Reuse ${c.maximumUnlock} L to unlock MAXIMUM SCHWAMM!`;
    const cooldown = maximum ? s.maximumCooldown : s.powerCooldown;
    if (cooldown > 0) return `Ability recharging: ${Math.ceil(cooldown)}s.`;
    if (maximum) {
      s.maximumTime = c.maximumDuration;
      s.maximumCooldown = c.maximumCooldown;
    } else {
      s.powerTime = c.powerDuration;
      s.powerCooldown = c.powerCooldown;
    }
    return maximum
      ? "MAXIMUM SCHWAMM! Whole-square absorption for 8 seconds!"
      : "POREN-POWER! Temporary capacity: 1,400 L.";
  }
  if (action === "upgrade") {
    if (distance(c.sandy, position) > c.reach)
      return "Visit Sandy's workshop on the left of the square (E).";
    if (s.upgraded)
      return "Sandy: Your 700 L sponge and bubble irrigation are ready. Use B to water distant plots!";
    if (s.budget < c.upgradeCost)
      return "Mr. Krabs: You need 250 coins for Sandy's upgrade.";
    s.budget -= c.upgradeCost;
    s.upgraded = true;
    return "Sandy: Upgrade installed! 700 L capacity and B for long-range bubble irrigation.";
  }
  if (action === "machine") {
    if (distance(c.machine, position) > c.reach)
      return "Get closer to Dr. Beton's Asphaltinator to disable it.";
    s.machineDisabled = c.machineDisableTime;
    return "KARATE! Asphaltinator disabled for 45 seconds. Protect the green plots!";
  }
  if (action === "patrick") {
    if (s.patrickCooldown > 0)
      return `Patrick is resting: ${Math.ceil(s.patrickCooldown)}s.`;
    const plots = s.plots.filter(
      (p) =>
        p.kind === "asphalt" &&
        distance(p, position) <= c.reach &&
        !currentLevel(s)?.entranceIds.includes(p.id),
    );
    if (!plots.length)
      return "Patrick: Bring me close to those boring asphalt stones!";
    plots.forEach((p) => (p.kind = "soil"));
    s.patrickCooldown = c.patrickCooldown;
    return `Patrick: SMASH! ${plots.length * c.plotArea} m² unsealed. Now plant and water!`;
  }
  const p = s.plots.find((p) => p.id === plotId);
  if (bubbles && !s.upgraded)
    return "Sandy unlocks bubble irrigation at her workshop (E, 250 coins).";
  if (!p || distance(p, position) > (bubbles ? c.bubbleReach : c.reach))
    return "Aim at a plot and move closer (highlighted plots are in reach).";
  if (action === "absorb") {
    const litres = absorb(s, p, amount);
    return litres > 0
      ? `Absorbing rainwater · ${Math.round(s.sponge)} L in sponge. Use 2 to distribute it.`
      : s.sponge >= spongeCapacity(s)
        ? "Sponge full! Water vegetation or fill a tank with tool 2."
        : "No surface water here. Collect from the blue puddles.";
  }
  if (action === "spray") {
    const litres = spray(s, p, amount);
    return litres > 0
      ? `${bubbles ? "Bubble irrigation" : "Water delivered"} · ${Math.round(s.reused)} L reused. Every drop counts!`
      : s.sponge <= 0
        ? "Your sponge is empty. Use 1 to collect surface water."
        : "This plot cannot take more water. Unseal asphalt or choose another green plot/tank.";
  }
  if (currentLevel(s)?.entranceIds.includes(p.id))
    return "Keep this marked entrance clear. Absorb its puddle and deliver the water elsewhere.";
  if (action === "karate" && p.kind !== "asphalt")
    return "Already unsealed. Choose a tree, rain garden or other upgrade.";
  if (action === "tree" && p.kind !== "soil")
    return "Trees need unsealed soil. Use karate (3) or Patrick (P) first.";
  if (
    action !== "karate" &&
    action !== "tree" &&
    p.kind !== "soil" &&
    p.kind !== "asphalt"
  )
    return "This plot already has an upgrade. Choose an unused plot.";
  const tool = cityTools.find((t) => t.id === action)!;
  if (s.budget < tool.cost)
    return "Mr. Krabs: Not enough coins. Use Patrick to unseal for free.";
  s.budget -= tool.cost;
  p.kind = action === "karate" ? "soil" : action;
  return action === "tree"
    ? "Thaddäus: Finally, a tree. Now give it water so it can make shade!"
    : `${tool.name} built · ${c.plotArea} m² transformed. ${s.budget} coins left.`;
}

function updateSabotage(s: CityState, dt: number): void {
  if (s.machineDisabled > 0) {
    s.machineDisabled = Math.max(0, s.machineDisabled - dt);
    return;
  }
  s.sabotageIn -= dt;
  if (s.sabotageIn > 0) return;
  s.sabotageIn += c.sabotageInterval;
  // Attack soil/basins first: visible setback without deleting a player's trees.
  const victim = s.plots.find((p) => p.kind === "soil" || p.kind === "basin");
  if (!victim) return;
  victim.kind = "asphalt";
  victim.surface += victim.moisture + victim.stored;
  victim.moisture = 0;
  victim.stored = 0;
  s.feedback =
    "Dr. Beton: MORE ASPHALT! A green plot was resealed. Karate my machine to stop me!";
}

/** Advance from fixed steps only; no clock progresses while the game is paused. */
export function updateCity(
  s: CityState,
  dt: number,
  position: Vector3State,
): void {
  if (s.outcome !== "playing" || !Number.isFinite(dt) || dt <= 0) return;
  s.elapsed += dt;
  const climate = currentLevel(s)?.weather;
  if (
    s.campaign &&
    climate &&
    s.elapsed >= climate.dryDuration + climate.rainDuration
  )
    s.campaign.stormCompleted = true;
  const raining = weather(s).raining;
  if (raining) s.stormSeen = true;
  updateWater(s, dt, raining);
  if (s.maximumTime > 0) {
    for (const p of s.plots)
      if (distance(p, position) <= c.maximumReach)
        absorb(s, p, c.absorbRate * dt);
  }
  for (const field of [
    "powerTime",
    "powerCooldown",
    "maximumTime",
    "maximumCooldown",
    "patrickCooldown",
  ] as const)
    s[field] = Math.max(0, s[field] - dt);
  updateSabotage(s, dt);
  const cooling = s.plots.reduce((n, p) => {
    const wet =
      (p.kind === "pond" ? p.stored : p.moisture) >= c.moistureHealthy;
    return n + plotCooling[p.kind][wet ? "wet" : "dry"];
  }, 0);
  const targetHeat = Math.max(
    c.minimumHeat,
    Math.min(100, c.initialHeat + (raining ? 0 : c.dryHeatBoost) - cooling),
  );
  s.heat += (targetHeat - s.heat) * (1 - Math.exp(-c.heatResponse * dt));
  s.flood = Math.min(
    100,
    (100 * s.plots.reduce((n, p) => n + p.surface, 0)) / c.floodLitres,
  );
  s.dangerTime =
    s.heat >= c.criticalDanger || s.flood >= c.criticalDanger
      ? s.dangerTime + dt
      : 0;
  const m = cityMetrics(s),
    goals = c.goals;
  if (s.dangerTime >= c.dangerSeconds) s.outcome = "lost";
  else if (s.campaign) advanceCampaign(s);
  else if (
    s.stormSeen &&
    m.permeable >= goals.permeable &&
    m.healthyTrees >= goals.trees &&
    s.reused >= goals.reused &&
    s.heat <= goals.heat &&
    s.flood <= goals.flood
  )
    s.outcome = "won";
}
