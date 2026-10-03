import { cityConfig } from "../../config/city";
import { campaignConfig } from "../../config/levels";
import { siteTechniques } from "../../config/sites";
import type {
  BuiltLevel,
  CityTool,
  LevelGoal,
  LevelSite,
  LevelSpot,
  NpcId,
  RoadNetwork,
  SiteType,
} from "../interfaces";
import { mapToWorld, sceneryPose } from "./streets";
export { mapToWorld } from "./streets";

/** Size of a spot square in metres, as the game draws plots (src/game/city-view.ts). */
export const spotSize = 4.7;
/** A spot's square (across, along the street); every type uses the game's tile size. */
export const plotFootprint = (_site?: SiteType): [number, number] => [
  spotSize,
  spotSize,
];

/** Point expressed along a field's own axes. */
export function spotLocal(
  spot: LevelSpot,
  x: number,
  z: number,
): [number, number] {
  const c = Math.cos(spot.rotationY ?? 0),
    s = Math.sin(spot.rotationY ?? 0);
  const dx = x - spot.x,
    dz = z - spot.z;
  return [c * dx - s * dz, s * dx + c * dz];
}

/** Separating-axis check for oriented field squares; touching edges are allowed. */
function spotsOverlap(a: LevelSpot, b: LevelSpot): boolean {
  const angles = [a.rotationY ?? 0, b.rotationY ?? 0];
  for (const angle of angles)
    for (const axis of [angle, angle + Math.PI / 2]) {
      const ux = Math.cos(axis),
        uz = -Math.sin(axis);
      const radius = (spot: LevelSpot) => {
        const [w, d] = plotFootprint(spot.site);
        const delta = (spot.rotationY ?? 0) - axis;
        return (
          (w * Math.abs(Math.cos(delta)) + d * Math.abs(Math.sin(delta))) / 2
        );
      };
      if (
        Math.abs((b.x - a.x) * ux + (b.z - a.z) * uz) >=
        radius(a) + radius(b) - 1e-8
      )
        return false;
    }
  return true;
}

export const siteTypes: readonly SiteType[] = [
  "parking",
  "verge",
  "swale",
  "facade",
];
/** Techniques a spot can allow; unsealing (karate) always works. */
export const buildTools: readonly CityTool[] = [
  "tree",
  "basin",
  "roof",
  "pond",
  "shade",
  "tank",
];

/** Techniques a spot allows: its own list, else its site type's. */
export const spotBuilds = (spot: LevelSpot): readonly CityTool[] =>
  spot.builds ?? (spot.site ? siteTechniques[spot.site].builds : buildTools);

/**
 * A new site where the player stands, facing where the camera looks: play −Z
 * then points along `forward` (a map-local direction).
 */
export function siteFromView(
  origin: [number, number],
  forward: [number, number],
  street: string,
): LevelSite {
  return {
    street,
    origin: [round(origin[0]), round(origin[1])],
    heading: Math.round(Math.atan2(forward[0], -forward[1]) * 1e4) / 1e4,
    bounds: { minX: -8, maxX: 8, minZ: -8, maxZ: 8 },
    start: [0, 0],
  };
}

/** Map-local metres to play coordinates of a site (inverse of playToMap). */
export function mapToPlay(
  site: LevelSite,
  x: number,
  z: number,
): [number, number] {
  const pose = sceneryPose(site);
  const c = Math.cos(pose.rotationY),
    s = Math.sin(pose.rotationY);
  return [c * x + s * z + pose.x, -s * x + c * z + pose.z];
}

/** Walkable bounds around the start and every spot's square, plus a margin. */
export function autoBounds(
  spots: readonly LevelSpot[],
  start: [number, number],
  margin = 8,
): LevelSite["bounds"] {
  const xs = [start[0]],
    zs = [start[1]];
  for (const spot of spots) {
    const [w, d] = plotFootprint(spot.site);
    const c = Math.abs(Math.cos(spot.rotationY ?? 0)),
      s = Math.abs(Math.sin(spot.rotationY ?? 0));
    const hx = (w * c + d * s) / 2,
      hz = (w * s + d * c) / 2;
    xs.push(spot.x - hx, spot.x + hx);
    zs.push(spot.z - hz, spot.z + hz);
  }
  return {
    minX: round(Math.min(...xs) - margin),
    maxX: round(Math.max(...xs) + margin),
    minZ: round(Math.min(...zs) - margin),
    maxZ: round(Math.max(...zs) + margin),
  };
}

const metricTool: Partial<Record<LevelGoal["metric"], CityTool>> = {
  basins: "basin",
  healthyTrees: "tree",
  roofs: "roof",
  tanks: "tank",
  ponds: "pond",
};

/** Largest group of spots allowing shade, linked within the neighbour distance. */
function shadeCluster(spots: readonly LevelSpot[]): number {
  const open = spots.filter((s) => spotBuilds(s).includes("shade"));
  let largest = 0;
  while (open.length) {
    const queue = [open.pop()!];
    for (let i = 0; i < queue.length; i++)
      for (let j = open.length - 1; j >= 0; j--)
        if (
          Math.hypot(queue[i].x - open[j].x, queue[i].z - open[j].z) <=
          campaignConfig.shadeNeighbourDistance
        )
          queue.push(...open.splice(j, 1));
    largest = Math.max(largest, queue.length);
  }
  return largest;
}

/** Problems that stop a layout from reaching its level's goals, in plain words. */
export function checkLayout(
  spots: readonly LevelSpot[],
  goals: readonly LevelGoal[],
): string[] {
  const problems: string[] = [];
  const missing = cityConfig.plotCount - spots.length;
  if (missing > 0) problems.push(`Place ${missing} more spot(s).`);
  if (missing < 0) problems.push(`Remove ${-missing} spot(s).`);
  spots.forEach((a, i) =>
    spots.slice(i + 1).forEach((b, k) => {
      if (spotsOverlap(a, b))
        problems.push(`Spots #${i + 1} and #${i + k + 2} overlap.`);
    }),
  );
  for (const goal of goals) {
    if (goal.maximum) continue;
    const tool = metricTool[goal.metric];
    if (tool) {
      const n = spots.filter((s) => spotBuilds(s).includes(tool)).length;
      if (n < goal.target)
        problems.push(
          `${goal.label}: needs ${goal.target} spots allowing ${tool}, has ${n}.`,
        );
    } else if (goal.metric === "permeable" && spots.length < goal.target)
      problems.push(`${goal.label}: needs ${goal.target} spots.`);
    else if (goal.metric === "shadeConnected") {
      const n = shadeCluster(spots);
      if (n < goal.target)
        problems.push(
          `${goal.label}: needs ${goal.target} shade spots next to each other, has ${n}.`,
        );
    } else if (goal.metric === "roofRoutes" || goal.metric === "tankRoutes") {
      const tool = goal.metric === "roofRoutes" ? "roof" : "tank";
      const n = spots.filter(
        (s) =>
          spotBuilds(s).includes(tool) &&
          spots.some(
            (o) =>
              o !== s && Math.hypot(o.x - s.x, o.z - s.z) <= cityConfig.reach,
          ),
      ).length;
      if (n < goal.target)
        problems.push(
          `${goal.label}: needs ${goal.target} ${tool} spots with a neighbour in reach, has ${n}.`,
        );
    }
  }
  return problems;
}

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
// "+ 0" turns -0 into 0, which JSON cannot keep apart anyway.
const round = (v: number) => Math.round(v * 10) / 10 + 0;

/** Accept only a complete, well-formed level from the builder; throws otherwise. */
export function validateBuiltLevel(
  levelId: unknown,
  data: unknown,
  levelIds: readonly string[],
): BuiltLevel {
  if (typeof levelId !== "string" || !levelIds.includes(levelId))
    throw new Error("Unknown level");
  const level = data as BuiltLevel;
  const location = cleanLocation(level?.location);
  const site = level?.site;
  if (
    !site ||
    typeof site.street !== "string" ||
    !site.origin?.every(finite) ||
    !finite(site.heading) ||
    !Object.values(site.bounds ?? {}).every(finite) ||
    Object.keys(site.bounds ?? {}).length !== 4 ||
    !site.start?.every(finite)
  )
    throw new Error("Incomplete site");
  if (
    !Array.isArray(level.spots) ||
    level.spots.length !== cityConfig.plotCount
  )
    throw new Error(`A level needs exactly ${cityConfig.plotCount} spots`);
  const spots = level.spots.map((spot) => {
    if (!finite(spot.x) || !finite(spot.z) || !siteTypes.includes(spot.site!))
      throw new Error("Invalid spot");
    if (spot.rotationY !== undefined && !finite(spot.rotationY))
      throw new Error("Invalid spot rotation");
    if (spot.builds && !spot.builds.every((t) => buildTools.includes(t)))
      throw new Error("Unknown technique");
    return {
      x: round(spot.x),
      z: round(spot.z),
      site: spot.site,
      ...(spot.rotationY !== undefined ? { rotationY: spot.rotationY } : {}),
      ...(spot.builds ? { builds: [...spot.builds] } : {}),
    };
  });
  const inside = ([x, z]: [number, number]) =>
    x >= site.bounds.minX - 1 &&
    x <= site.bounds.maxX + 1 &&
    z >= site.bounds.minZ - 1 &&
    z <= site.bounds.maxZ + 1;
  if (site.startYaw !== undefined && !finite(site.startYaw))
    throw new Error("Invalid spawn facing");
  const npcs: Partial<Record<NpcId, [number, number]>> = {};
  for (const [id, at] of Object.entries(site.npcs ?? {})) {
    if (
      !npcIds.includes(id as NpcId) ||
      !Array.isArray(at) ||
      !at.every(finite)
    )
      throw new Error("Invalid character position");
    if (!inside(at as [number, number]))
      throw new Error(`${id} stands outside the level area`);
    npcs[id as NpcId] = [round(at[0]), round(at[1])];
  }
  if (!inside(site.start as [number, number]))
    throw new Error("The spawn lies outside the level area");
  return {
    location,
    site: {
      ...(site.startYaw !== undefined
        ? { startYaw: Math.round(site.startYaw * 1e4) / 1e4 }
        : {}),
      ...(Object.keys(npcs).length ? { npcs } : {}),
      street: location,
      origin: [round(site.origin[0]), round(site.origin[1])],
      heading: site.heading,
      bounds: { ...site.bounds },
      start: [round(site.start![0]), round(site.start![1])],
    },
    spots,
  };
}

export const npcIds: readonly NpcId[] = [
  "sandy",
  "patrick",
  "krabs",
  "squidward",
  "beton",
];
/** Surfaces characters may stand on. */
const walkable = new Set(["sidewalk", "paved", "green", "island", "other"]);

/** Distance from a point to a spot's square (0 inside). */
function toSquare(spot: LevelSpot, x: number, z: number): number {
  const [w, d] = plotFootprint(spot.site);
  const [lx, lz] = spotLocal(spot, x, z);
  return Math.hypot(
    Math.max(Math.abs(lx) - w / 2, 0),
    Math.max(Math.abs(lz) - d / 2, 0),
  );
}

/**
 * Put the characters on free walkable ground of a level (play coordinates):
 * Sandy 3–6 m from the spawn, Patrick and Mr. Krabs 4–12 m on either side,
 * Squidward and Dr. Beton near the middle of the spots. Never in a building,
 * on water or rail, on a spot (2.5 m clearance) or on another character (3 m).
 */
export function placeNpcs(
  spawn: [number, number],
  spots: readonly LevelSpot[],
  bounds: LevelSite["bounds"],
  surface: (x: number, z: number) => string,
): { npcs: Record<NpcId, [number, number]>; warnings: string[] } {
  const middle: [number, number] = spots.length
    ? [
        spots.reduce((n, s) => n + s.x, 0) / spots.length,
        spots.reduce((n, s) => n + s.z, 0) / spots.length,
      ]
    : spawn;
  const wants: Record<
    NpcId,
    { near: [number, number]; min: number; max: number; side?: number }
  > = {
    sandy: { near: spawn, min: 3, max: 6 },
    patrick: { near: spawn, min: 4, max: 12, side: -1 },
    krabs: { near: spawn, min: 4, max: 12, side: 1 },
    squidward: { near: middle, min: 3, max: 15 },
    beton: { near: middle, min: 2, max: 20 },
  };
  const placed = {} as Record<NpcId, [number, number]>;
  const warnings: string[] = [];
  const preferred = new Set(["sidewalk", "paved", "green", "island", "other"]);
  /**
   * Penalty for standing at x, z, or Infinity when impossible: buildings,
   * water and rail are out; road, closeness to spots (< 2.5 m from a square,
   * never closer than 1 m) and being near others cost extra.
   */
  const cost = (x: number, z: number) => {
    let penalty = 0;
    for (const [dx, dz] of [
      [0, 0],
      [0.5, 0],
      [-0.5, 0],
      [0, 0.5],
      [0, -0.5],
    ]) {
      const kind = surface(x + dx, z + dz);
      if (kind === "road") penalty += 0.6;
      else if (!preferred.has(kind)) return Infinity;
    }
    for (const s of spots) {
      const d = toSquare(s, x, z);
      if (d < 1) return Infinity;
      if (d < 2.5) penalty += (2.5 - d) * 2;
    }
    for (const [px, pz] of Object.values(placed))
      if (Math.hypot(x - px, z - pz) < 3) return Infinity;
    if (Math.hypot(x - spawn[0], z - spawn[1]) < 1.5) return Infinity;
    return penalty;
  };
  const search = (id: NpcId, widen: number) => {
    const want = wants[id];
    let best: [number, number] | null = null,
      bestScore = Infinity;
    for (let x = Math.ceil(bounds.minX + 1); x <= bounds.maxX - 1; x++)
      for (let z = Math.ceil(bounds.minZ + 1); z <= bounds.maxZ - 1; z++) {
        const d = Math.hypot(x - want.near[0], z - want.near[1]);
        if (d < want.min / widen || d > want.max * widen) continue;
        if (want.side && Math.sign(x - spawn[0]) !== want.side) continue;
        // Prefer the middle of the wanted distance band, then good ground.
        const score = Math.abs(d - (want.min + want.max) / 2) + cost(x, z);
        if (score < bestScore) {
          best = [x, z];
          bestScore = score;
        }
      }
    return best;
  };
  for (const id of npcIds) {
    let best = search(id, 1) ?? search(id, 1.5);
    if (!best) {
      const fallback = cityConfig.npcDefaults[id];
      best = [spawn[0] + fallback.x, spawn[1] + fallback.z];
      warnings.push(
        `No free ground for ${id}; placed at its default offset. Drag it somewhere better.`,
      );
    }
    placed[id] = best;
  }
  return { npcs: placed, warnings };
}

/** Problems with the spawn and characters of a level (play coordinates). */
export function checkCharacters(
  site: LevelSite,
  spots: readonly LevelSpot[],
  surface?: (x: number, z: number) => string,
): string[] {
  const problems: string[] = [];
  const [sx, sz] = site.start ?? [0, 0];
  const b = site.bounds;
  if (sx < b.minX || sx > b.maxX || sz < b.minZ || sz > b.maxZ)
    problems.push("The spawn lies outside the level area.");
  for (const id of npcIds) {
    const at = site.npcs?.[id];
    if (!at) continue;
    if (spots.some((s) => toSquare(s, at[0], at[1]) === 0))
      problems.push(`${id} stands on a spot.`);
    if (surface && !walkable.has(surface(at[0], at[1])))
      problems.push(`${id} stands on ${surface(at[0], at[1])}.`);
  }
  const sandy = site.npcs?.sandy;
  if (sandy && Math.hypot(sandy[0] - sx, sandy[1] - sz) > 12)
    problems.push(
      "Sandy is more than 12 m from the spawn; the upgrade is hard to find.",
    );
  return problems;
}

/** A place name for the game's text: trimmed, single-line, 1–40 characters. */
export function cleanLocation(name: unknown): string {
  if (typeof name !== "string") throw new Error("Missing location name");
  const clean = name
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || clean.length > 40)
    throw new Error("The location name needs 1–40 characters");
  return clean;
}

/** Map-local metres for a point on the aerial photo (u, v in 0–1, north up). */
export function imageToMap(
  bounds: readonly [number, number, number, number],
  u: number,
  v: number,
): [number, number] {
  const [left, back, right, front] = bounds;
  return [left + u * (right - left), back + v * (front - back)];
}
/** Position on the aerial photo (0–1) of a map-local point. */
export function mapToImage(
  bounds: readonly [number, number, number, number],
  x: number,
  z: number,
): [number, number] {
  const [left, back, right, front] = bounds;
  return [(x - left) / (right - left), (z - back) / (front - back)];
}

/** Name of the closest named street within `maxDistance` metres, if any. */
export function nearestStreet(
  network: RoadNetwork,
  x: number,
  z: number,
  maxDistance = 30,
): string | null {
  let best: string | null = null,
    bestDistance = maxDistance;
  for (const road of network.roads) {
    if (!road.name) continue;
    for (const [a, b] of road.segments) {
      const dx = b[0] - a[0],
        dz = b[1] - a[1];
      const length = dx * dx + dz * dz;
      const t = length
        ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / length))
        : 0;
      const d = Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
      if (d < bestDistance) {
        bestDistance = d;
        best = road.name;
      }
    }
  }
  return best;
}

/** Walkable play rectangle for an area: `length` ahead of the start, 8 m behind. */
export function areaBounds(width: number, length: number): LevelSite["bounds"] {
  return { minX: -width / 2, maxX: width / 2, minZ: -length, maxZ: 8 };
}

/** Smallest rectangle containing both bounds. */
export function unionBounds(
  a: LevelSite["bounds"],
  b: LevelSite["bounds"],
): LevelSite["bounds"] {
  return {
    minX: Math.min(a.minX, b.minX),
    maxX: Math.max(a.maxX, b.maxX),
    minZ: Math.min(a.minZ, b.minZ),
    maxZ: Math.max(a.maxZ, b.maxZ),
  };
}

const marker = "export const builtLevels: Record<string, BuiltLevel> = ";

/** Source of config/built-levels/index.ts holding every saved level as JSON. */
export function levelFileSource(levels: Record<string, BuiltLevel>): string {
  return `// Generated by the in-game level builder (vite.config.ts); do not edit by hand.
import type { BuiltLevel } from "../../src/interfaces";

/** Levels saved from the builder, keyed by level id. */
${marker}${JSON.stringify(levels, null, 2)};
`;
}

/** Saved levels read back from that file's source. */
export function parseLevelFile(source: string): Record<string, BuiltLevel> {
  const start = source.indexOf(marker);
  if (start < 0) return {};
  return JSON.parse(
    source.slice(start + marker.length, source.lastIndexOf(";")),
  );
}
