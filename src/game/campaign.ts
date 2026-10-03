import {
  baselLocations,
  levelLocationPools,
} from "../../config/level-locations.ts";
import { campaignConfig as c, cityLevels } from "../../config/levels.ts";
import { cityConfig, cityTools } from "../../config/city.ts";
import type {
  CityLevel,
  CityPlot,
  CityState,
  LevelAchievement,
  LevelMetric,
  Vector3State,
} from "../interfaces.ts";
import { createCity, cityMetrics } from "./city.ts";
import { placePowerups } from "./powerups.ts";
import { grantFunding } from "./funding.ts";
import { fundingConfig } from "../../config/funding.ts";

export function currentLevel(s: CityState): CityLevel | undefined {
  return s.campaign ? campaignLevel(s, s.campaign.level) : undefined;
}
/** Resolve the shared randomized map location without changing level goals or tool unlocks. */
export function campaignLevel(
  s: CityState,
  index: number,
): CityLevel | undefined {
  const level = cityLevels[index];
  if (!level) return undefined;
  const candidate = baselLocations.find(
    (site) => site.id === s.campaign?.locations?.[index],
  );
  return candidate
    ? { ...level, location: candidate.name, mapSite: candidate.site }
    : level;
}
export function selectCampaignLocations(
  random: () => number = Math.random,
): string[] {
  return levelLocationPools.map(
    (pool) =>
      pool[
        Math.min(
          pool.length - 1,
          Math.max(0, Math.floor(random() * pool.length)),
        )
      ].id,
  );
}
/** Campaign remains optional so foundation/single-mission rules can be reused. */
export function createCampaign(random: () => number = Math.random): CityState {
  const s = createCity();
  s.campaign = {
    locations: selectCampaignLocations(random),
    level: 0,
    completed: [],
    stormCompleted: false,
    connectFrom: null,
    wheelPending: false,
    pendingModifier: null,
    activeModifier: null,
    ownedHats: [],
    equippedHat: null,
  };
  applyLayout(s, currentLevel(s)!);
  return s;
}
function applyLayout(s: CityState, level: CityLevel): void {
  s.plots = level.layout.map((position, id) => ({
    id,
    kind: "asphalt",
    surface: cityConfig.initialSurface,
    moisture: 0,
    stored: 0,
    ...position,
    // Each level's street decides which techniques fit its fresh plots.
    site: position.site,
  }));
  placePowerups(s, level.origin);
  s.feedback = level.objective;
  const start = levelPosition(s, cityConfig.machine);
  Object.assign(s.saboteur, start, {
    destinationX: start.x,
    destinationZ: start.z,
  });
}
/** Place local controls/NPCs at the active fictional neighbourhood. */
export function levelPosition(s: CityState, local: { x: number; z: number }) {
  const origin = currentLevel(s)?.origin;
  return { x: local.x + (origin?.x ?? 0), z: local.z + (origin?.z ?? 0) };
}
export function validDrain(
  s: CityState,
  source: CityPlot,
): CityPlot | undefined {
  const target = s.plots.find((p) => p.id === source.drainsTo);
  if (
    !target ||
    target.id === source.id ||
    target.kind === "asphalt" ||
    target.kind === "roof"
  )
    return undefined;
  const seen = new Set([source.id]);
  let cursor: CityPlot | undefined = target;
  while (cursor) {
    if (seen.has(cursor.id)) return undefined;
    seen.add(cursor.id);
    cursor = s.plots.find((p) => p.id === cursor!.drainsTo);
  }
  return target;
}
/** Two aimed C presses connect a roof/tank to safe receiving ground or storage. */
export function connectRunoff(
  s: CityState,
  targetId: number | null,
  position: Vector3State,
): void {
  const progress = s.campaign;
  if (!progress || s.outcome !== "playing") return;
  const target = s.plots.find((p) => p.id === targetId);
  if (
    !target ||
    Math.hypot(target.x - position.x, target.z - position.z) > cityConfig.reach
  ) {
    s.feedback =
      "C: Aim at a plot in reach. Escape or changing level cancels the connection.";
    return;
  }
  if (progress.connectFrom === null) {
    if (target.kind !== "roof" && target.kind !== "tank") {
      s.feedback = "C: First select a green roof or rain tank.";
      return;
    }
    progress.connectFrom = target.id;
    s.feedback = `Runoff source #${target.id + 1} selected. Aim at soil, plants or storage and press C again.`;
    return;
  }
  const source = s.plots.find((p) => p.id === progress.connectFrom)!;
  const previous = source.drainsTo;
  source.drainsTo = target.id;
  if (!validDrain(s, source)) {
    source.drainsTo = previous;
    s.feedback =
      "Choose a permeable receiving plot or storage. Runoff connections cannot loop.";
    return;
  }
  progress.connectFrom = null;
  s.feedback = `Runoff connected: #${source.id + 1} → #${target.id + 1}. Roofs release slowly; tank overflow uses this route.`;
  grantFunding(s, `route:${source.id}`, fundingConfig.route);
}
/** Reclaim an upgrade so an accidental build cannot exhaust the campaign's plots. */
export function recyclePlot(
  s: CityState,
  targetId: number | null,
  position: Vector3State,
): void {
  if (!s.campaign || s.outcome !== "playing") return;
  const p = s.plots.find((p) => p.id === targetId);
  if (!p || Math.hypot(p.x - position.x, p.z - position.z) > cityConfig.reach) {
    s.feedback = "V: Aim at an upgraded plot in reach.";
    return;
  }
  if (p.kind === "asphalt" || p.kind === "soil") {
    s.feedback = "V: Only an upgrade can be recycled.";
    return;
  }
  s.budget += cityTools.find((tool) => tool.id === p.kind)!.cost;
  p.surface += p.stored;
  p.stored = 0;
  p.kind = "soil";
  delete p.drainsTo;
  if (s.campaign.connectFrom === p.id) s.campaign.connectFrom = null;
  s.feedback = "Upgrade recycled; cost reclaimed. Water stays on this plot.";
}
function shadeCluster(s: CityState): number {
  const remaining = new Set(s.plots.filter((p) => p.kind === "shade"));
  let largest = 0;
  while (remaining.size) {
    const first = remaining.values().next().value!;
    const queue = [first];
    remaining.delete(first);
    for (let i = 0; i < queue.length; i++) {
      for (const p of remaining) {
        if (
          Math.hypot(queue[i].x - p.x, queue[i].z - p.z) <=
          c.shadeNeighbourDistance
        ) {
          remaining.delete(p);
          queue.push(p);
        }
      }
    }
    largest = Math.max(largest, queue.length);
  }
  return largest;
}
/** The HUD and progression use this single source of achievement truth. */
export function levelAchievements(s: CityState): LevelAchievement[] {
  const level = currentLevel(s);
  if (!level) return [];
  const m = cityMetrics(s);
  const count = (kind: CityPlot["kind"]) =>
    s.plots.filter((p) => p.kind === kind).length;
  const routes = (kind: CityPlot["kind"]) =>
    s.plots.filter((p) => p.kind === kind && validDrain(s, p)).length;
  const values: Record<LevelMetric, number> = {
    permeable: m.permeable,
    healthyTrees: m.healthyTrees,
    reused: s.reused,
    heat: s.heat,
    flood: s.flood,
    basins: count("basin"),
    roofs: count("roof"),
    tanks: count("tank"),
    ponds: count("pond"),
    retained: m.retained,
    shadeConnected: shadeCluster(s),
    roofRoutes: routes("roof"),
    tankRoutes: routes("tank"),
    stormCompleted: s.campaign!.stormCompleted ? 1 : 0,
  };
  return level.goals.map((goal) => ({
    metric: goal.metric,
    label: goal.label,
    value: values[goal.metric],
    target: goal.target,
    done: goal.maximum
      ? values[goal.metric] <= goal.target
      : values[goal.metric] >= goal.target,
  }));
}
/** Start a fresh independent neighbourhood while retaining completed level IDs. */
export function advanceCampaign(s: CityState): boolean {
  const progress = s.campaign;
  if (
    !progress ||
    progress.wheelPending ||
    s.outcome !== "playing" ||
    !levelAchievements(s).every((goal) => goal.done)
  )
    return false;
  const level = currentLevel(s)!;
  progress.completed.push(level.id);
  progress.connectFrom = null;
  progress.activeModifier = null;
  if (progress.level === cityLevels.length - 1) {
    progress.pendingModifier = null;
    s.outcome = "won";
    return true;
  }
  progress.wheelPending = true;
  progress.pendingModifier = null;
  s.feedback = "Level complete! Spin for the next level.";
  return true;
}

/** Begin the next level only after the player spins and confirms one modifier. */
export function startNextCampaignLevel(s: CityState): boolean {
  const progress = s.campaign;
  if (
    !progress ||
    !progress.wheelPending ||
    !progress.pendingModifier ||
    progress.level >= cityLevels.length - 1
  )
    return false;
  const next = {
    locations: progress.locations ? [...progress.locations] : undefined,
    level: progress.level + 1,
    completed: [...progress.completed],
    stormCompleted: false,
    connectFrom: null,
    wheelPending: false,
    pendingModifier: null,
    activeModifier: progress.pendingModifier,
    ownedHats: [...(progress.ownedHats ?? [])],
    equippedHat: progress.equippedHat,
  };
  Object.assign(s, createCity(), { campaign: next });
  applyLayout(s, currentLevel(s)!);
  return true;
}
