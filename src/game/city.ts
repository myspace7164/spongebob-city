import { castPosition } from "./cast.ts";
import { isToolAvailable } from "./progression.ts";
import {
  createPowerups,
  isPowerupActive,
  collectPowerups,
  updatePowerups,
  powerupMultiplier,
} from "./powerups.ts";
import { powerupConfig } from "../../config/powerups.ts";
import { updateWater } from "./city-water.ts";
import { advanceCampaign, currentLevel, levelPosition } from "./campaign.ts";
import { cityConfig as c, cityTools } from "../../config/city.ts";
import { siteTechniques } from "../../config/sites.ts";
import { fundingConfig as funding } from "../../config/funding.ts";
import { cityLevels } from "../../config/levels.ts";
import { grantFunding } from "./funding.ts";
import { updateSaboteur } from "./sabotage.ts";
import { modifierMultiplier } from "./level-modifiers.ts";
import type {
  CityAction,
  CityMetrics,
  CityPlot,
  CityState,
  Vector3State,
} from "../interfaces.ts";

export function createCity(): CityState {
  return {
    powerups: createPowerups(),
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
    temperature: c.heatSystem.startingCelsius,
    heat: 0,
    flood: (100 * c.plotCount * c.initialSurface) / c.floodLitres,
    sponge: 0,
    budget: c.budget,
    funding: { earned: 0, claimed: [] },
    reused: 0,
    rainfall: 0,
    evaporated: 0,
    infiltrated: 0,
    stormSeen: false,
    outcome: "playing",
    dangerTime: 0,
    fires: [],
    fireSpawnTimer: 0,
    fireSequence: 0,
    sabotageIn: c.sabotageInterval,
    machineDisabled: 0,
    saboteur: {
      ...c.machine,
      facing: 0,
      destinationX: c.machine.x,
      destinationZ: c.machine.z,
      step: 0,
      phase: "roaming",
      targetId: null,
      sealTime: 0,
    },
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
  const base =
    s.maximumTime > 0
      ? c.maximumCapacity
      : s.powerTime > 0
        ? c.poweredCapacity
        : s.upgraded
          ? c.upgradedCapacity
          : c.capacity;
  return base * modifierMultiplier(s, "waterCapacity");
}
export function spongeAbsorptionRate(s: CityState): number {
  return modifierMultiplier(s, "absorptionSpeed");
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
    temperature: s.temperature,
  };
}
const distance = (p: { x: number; z: number }, position: Vector3State) =>
  Math.hypot(p.x - position.x, p.z - position.z);
const storagePlot = (p: CityPlot) => ["tank", "pond", "roof"].includes(p.kind);

/** Transfer only available water into finite useful capacity; asphalt cannot be irrigated. */
function spray(s: CityState, p: CityPlot, amount: number): number {
  const fire = s.fires.find((active) => active.plotId === p.id);
  if (fire) {
    if (s.sponge <= 0) return 0;
    const used = Math.min(
      s.sponge,
      amount,
      fire.intensity * c.heatSystem.fireWaterPerIntensity,
    );
    s.sponge -= used;
    s.reused += used;
    fire.intensity = Math.max(
      0,
      fire.intensity - used / c.heatSystem.fireWaterPerIntensity,
    );
    if (fire.intensity <= 0.01) {
      s.fires = s.fires.filter((active) => active.id !== fire.id);
      grantFunding(s, `extinguish:${fire.id}`, funding.irrigate);
    }
    return used;
  }
  if (p.kind === "asphalt" || p.surface > 0) return 0;
  const field = storagePlot(p) ? "stored" : "moisture";
  const limit = field === "stored" ? c.storageCapacity : c.soilCapacity;
  const transferred = Math.max(0, Math.min(s.sponge, amount, limit - p[field]));
  p[field] += transferred;
  s.sponge -= transferred;
  s.reused += transferred;
  if (transferred > 0) grantFunding(s, `irrigate:${p.id}`, funding.irrigate);
  return transferred;
}
function absorb(s: CityState, p: CityPlot, amount: number): number {
  const transferred = Math.max(
    0,
    Math.min(p.surface, amount, spongeCapacity(s) - s.sponge),
  );
  p.surface -= transferred;
  s.sponge += transferred;
  if (transferred > 0) grantFunding(s, `collect:${p.id}`, funding.collect);
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
  const tool = cityTools.find((tool) => tool.id === action);
  if (tool && !isToolAvailable(s, tool.id))
    return (s.feedback = `${tool.name} unlocks in a later level. Use the available tools for this mission.`);
  s.feedback = act(
    s,
    action,
    position,
    plotId,
    action === "absorb" || action === "spray"
      ? (amount ?? (action === "spray" ? c.sprayRate : c.absorbRate)) *
          powerupMultiplier(s, "rhine")
      : amount,
    bubbles,
  );
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
      return `Reuse ${c.maximumUnlock} L to unlock MAXIMUM SPONGE!`;
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
      ? "MAXIMUM SPONGE! Whole-square absorption for 8 seconds!"
      : "PORE POWER! Temporary capacity: 1,400 L.";
  }
  if (action === "upgrade") {
    if (distance(castPosition(s, 1), position) > c.reach)
      return "Visit Sandy's workshop on the left of the square (E).";
    if (s.upgraded)
      return "Sandy: Your 700 L sponge and bubble irrigation are ready. Use B to water distant plots!";
    if (s.budget < c.upgradeCost)
      return "Mr. Krabs: You need 250 coins for Sandy's upgrade.";
    s.budget -= c.upgradeCost;
    s.upgraded = true;
    grantFunding(s, "upgrade", funding.upgrade);
    return "Sandy: Upgrade installed! 700 L capacity and B for long-range bubble irrigation.";
  }
  if (action === "machine") {
    if (distance(s.saboteur, position) > c.reach)
      return "Get closer to Dr. Beton's Asphaltinator to disable it.";
    s.machineDisabled = c.machineDisableTime;
    s.saboteur.phase = "disabled";
    s.saboteur.targetId = null;
    grantFunding(s, "machine", funding.machine);
    return "KARATE! Asphaltinator disabled for 45 seconds. Protect the green plots!";
  }
  if (action === "patrick") {
    if (s.patrickCooldown > 0 && !isPowerupActive(s, "patrick"))
      return `Patrick is resting: ${Math.ceil(s.patrickCooldown)}s.`;
    const plots = s.plots.filter(
      (p) => p.kind === "asphalt" && distance(p, position) <= c.reach,
    );
    if (!plots.length)
      return "Patrick: Bring me close to those boring asphalt stones!";
    plots.forEach((p) => {
      p.kind = "soil";
      grantFunding(s, `build:${p.id}:soil`, funding.construction.soil);
    });
    s.patrickCooldown = c.patrickCooldown;
    return `Patrick: SMASH! ${plots.length * c.plotArea} m² unsealed. Now plant and water!`;
  }
  const p = s.plots.find((p) => p.id === plotId);
  if (bubbles && !s.upgraded && !isPowerupActive(s, "bubbles"))
    return "Sandy unlocks bubble irrigation at her workshop (E, 250 coins).";
  if (
    !p ||
    distance(p, position) >
      (bubbles ? c.bubbleReach : c.reach * powerupMultiplier(s, "bell"))
  )
    return "Aim at a plot and move closer (highlighted plots are in reach).";
  if (action === "absorb") {
    const litres = absorb(s, p, amount * spongeAbsorptionRate(s));
    return litres > 0
      ? `Absorbing rainwater · ${Math.round(s.sponge)} L in sponge. Use 2 to distribute it.`
      : s.sponge >= spongeCapacity(s)
        ? "Sponge full! Water vegetation or fill a tank with tool 2."
        : "No surface water here. Collect from the blue puddles.";
  }
  if (action === "spray") {
    const wasBurning = s.fires.some((fire) => fire.plotId === p.id);
    const litres = spray(s, p, amount);
    if (wasBurning)
      return litres > 0
        ? s.fires.some((fire) => fire.plotId === p.id)
          ? `Water on the fire · ${Math.round(litres)} L used. Keep spraying to extinguish it.`
          : `Fire extinguished · ${Math.round(litres)} L water used!`
        : "Your sponge is empty. Absorb water before fighting the fire.";
    return litres > 0
      ? `${bubbles ? "Bubble irrigation" : "Water delivered"} · ${Math.round(s.reused)} L reused. Every drop counts!`
      : s.sponge <= 0
        ? "Your sponge is empty. Use 1 to collect surface water."
        : p.surface > 0
          ? "This plot is flooded. Absorb its surface water before watering it."
          : "This plot cannot take more water. Unseal asphalt or choose another green plot/tank.";
  }
  const site = p.site && siteTechniques[p.site];
  if (site && action !== "karate" && !site.builds.includes(action)) {
    const fits = site.builds.map(
      (id) => cityTools.find((t) => t.id === id)!.name,
    );
    return `${site.hint}${fits.length ? ` Fits here: ${fits.join(", ")}.` : ""}`;
  }
  if (action === "karate" && p.kind !== "asphalt")
    return "Already unsealed. Choose a tree, rain garden or other upgrade.";
  if (
    ["tree", "basin", "roof", "shade", "pond", "tank"].includes(action) &&
    p.kind === "asphalt"
  )
    return "Unseal this plot first with karate (3), then build on the open soil.";
  if (action === "tree" && p.kind !== "soil")
    return "Trees need unsealed soil. Use karate (3) or a Patrick boost first.";
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
  grantFunding(s, `build:${p.id}:${p.kind}`, funding.construction[p.kind]);
  return action === "tree"
    ? "Squidward: Finally, a tree. Now give it water so it can make shade!"
    : `${tool.name} built · ${c.plotArea} m² transformed. ${s.budget} coins left.`;
}

function updateTemperature(s: CityState, dt: number, raining: boolean): void {
  const heat = c.heatSystem;
  const levelIndex = s.campaign?.level;
  const levelProgress =
    levelIndex === undefined || cityLevels.length < 2
      ? 0
      : Math.min(1, Math.max(0, levelIndex) / (cityLevels.length - 1));
  const levelWarmingMultiplier = s.campaign
    ? heat.levelWarmingMultiplier.first +
      (heat.levelWarmingMultiplier.last - heat.levelWarmingMultiplier.first) *
        levelProgress
    : 1;
  const modifierHeatMultiplier = modifierMultiplier(s, "heatWarming");
  const sealedPlots = s.plots.filter((p) => p.kind === "asphalt").length;
  const trees = s.plots
    .filter((p) => p.kind === "tree")
    .reduce(
      (sum, p) =>
        sum + 0.25 + 0.75 * Math.min(1, p.moisture / c.moistureHealthy),
      0,
    );
  const greenAreas = s.plots.filter((p) =>
    ["soil", "basin", "roof"].includes(p.kind),
  ).length;
  const ponds = s.plots.filter((p) => p.kind === "pond").length;
  const shadePlaces = s.plots.filter((p) => p.kind === "shade").length;
  const warming =
    modifierHeatMultiplier *
    (heat.passiveWarmingPerSecond +
      sealedPlots * heat.sealedPlotWarmingPerSecond +
      (s.saboteur.phase === "sealing"
        ? heat.concreteProductionWarmingPerSecond
        : 0));
  const cooling =
    (raining ? heat.rainCoolingPerSecond : 0) +
    trees * heat.treeCoolingPerSecond +
    greenAreas * heat.greenAreaCoolingPerSecond +
    ponds * heat.pondCoolingPerSecond +
    shadePlaces * heat.shadeCoolingPerSecond +
    (isPowerupActive(s, "lantern") ? powerupConfig.lanternCooling : 0);
  const changePerSecond = Math.max(
    -heat.maximumChangePerSecond,
    Math.min(
      heat.maximumChangePerSecond,
      warming * levelWarmingMultiplier - cooling,
    ),
  );
  s.temperature = Math.max(
    heat.minimumCelsius,
    s.temperature + changePerSecond * dt,
  );
  s.heat = Math.max(
    0,
    Math.min(
      100,
      ((s.temperature - heat.startingCelsius) /
        (heat.gameOverCelsius - heat.startingCelsius)) *
        100,
    ),
  );
}

function fireInterval(temperature: number): number {
  const tier = Math.max(
    0,
    Math.min(3, Math.floor((temperature - c.heatSystem.fireStartCelsius) / 5)),
  );
  return c.heatSystem.fireIntervals[tier];
}

function updateFires(s: CityState, dt: number): void {
  const heat = c.heatSystem;
  if (s.temperature <= heat.fireStartCelsius) return;
  for (const fire of s.fires)
    fire.intensity = Math.min(
      1,
      fire.intensity +
        heat.fireGrowthPerDegreeSecond *
          (s.temperature - heat.fireStartCelsius) *
          dt,
    );
  s.fireSpawnTimer -= dt;
  if (s.fireSpawnTimer > 0) return;
  if (s.fires.length >= heat.maximumFires) {
    s.fireSpawnTimer = fireInterval(s.temperature);
    return;
  }
  const available = s.plots.filter(
    (plot) => !s.fires.some((fire) => fire.plotId === plot.id),
  );
  if (!available.length) return;
  const sequence = s.fireSequence++;
  const plot = available[(sequence * 7 + 3) % available.length];
  const tier = Math.max(
    0,
    Math.min(3, Math.floor((s.temperature - heat.fireStartCelsius) / 5)),
  );
  const maxSize = Math.min(
    2,
    Math.floor(Math.max(0, s.temperature - heat.fireStartCelsius) / 7.5),
  );
  const size = (maxSize === 0 ? 0 : sequence % (maxSize + 1)) as 0 | 1 | 2;
  s.fires.push({
    id: sequence + 1,
    plotId: plot.id,
    intensity: 0.55 + tier * 0.05,
    size,
  });
  s.fireSpawnTimer = fireInterval(s.temperature);
}

/** Advance from fixed steps only; no clock progresses while the game is paused. */
export function updateCity(
  s: CityState,
  dt: number,
  position: Vector3State,
): void {
  if (s.outcome !== "playing" || !Number.isFinite(dt) || dt <= 0) return;
  collectPowerups(s, position);
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
        absorb(
          s,
          p,
          c.absorbRate *
            spongeAbsorptionRate(s) *
            powerupMultiplier(s, "rhine") *
            dt,
        );
  }
  for (const field of [
    "powerTime",
    "powerCooldown",
    "maximumTime",
    "maximumCooldown",
    "patrickCooldown",
  ] as const)
    s[field] = Math.max(0, s[field] - dt);
  updateSaboteur(s, dt, modifierMultiplier(s, "betonSpeed"));
  updateTemperature(s, dt, raining);
  updateFires(s, dt);
  s.flood = Math.min(
    100,
    (100 * s.plots.reduce((n, p) => n + p.surface, 0)) / c.floodLitres,
  );
  s.dangerTime = s.flood >= c.criticalDanger ? s.dangerTime + dt : 0;
  updatePowerups(s, dt, position);
  const m = cityMetrics(s),
    goals = c.goals;
  if (s.temperature > c.heatSystem.gameOverCelsius) {
    s.outcome = "lost";
    s.lossReason = "The city has overheated.";
  } else if (s.dangerTime >= c.dangerSeconds) s.outcome = "lost";
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
  if (s.outcome === "lost" && s.campaign) {
    s.campaign.activeModifier = null;
    s.campaign.pendingModifier = null;
    s.campaign.wheelPending = false;
  }
}
