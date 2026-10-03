/** Mutable world coordinates, with Y pointing up. */
export interface Vector3State {
  x: number;
  y: number;
  z: number;
}
/** Position is the character's feet; grounded means standing on the Y=0 plane. */
export interface PlayerState {
  position: Vector3State;
  velocity: Vector3State;
  grounded: boolean;
  facing: number;
}
/** Camera-relative movement axes in [-1, 1]; jump is a one-shot request. */
export interface MovementInput {
  forward: number;
  right: number;
  run: boolean;
  jump: boolean;
}
/** Optional glTF/GLB visual asset; origin should sit at the character's feet. */
export interface ModelConfig {
  url: string;
  scale: number;
  rotationY: number;
}

/** Derived LV95 road centrelines: local X east, Z south, metres; estimated widths. */
export interface RoadNetwork {
  origin: [number, number, number];
  bounds: [number, number, number, number];
  roads: {
    name: string | null;
    kind: "road" | "path";
    width: number;
    segments: [[number, number], [number, number]][];
  }[];
}

/** Inventory definitions describe behavior; quantities are runtime state. */
export interface InventoryItem {
  id: string;
  name: string;
  action: "placeholder" | "shoot" | "place";
  description: string;
}
export interface InventoryState {
  items: readonly InventoryItem[];
  selected: number;
  ammo: number;
  blocks: number;
  cooldown: number;
}
/** Mutable placeholder sandbox state; reset clears all placed objects. */
export interface PlacedBlock {
  x: number;
  z: number;
}

export type PlotKind =
  "asphalt" | "soil" | "tree" | "basin" | "roof" | "pond" | "shade" | "tank";
export type CityTool =
  | "absorb"
  | "spray"
  | "karate"
  | "tree"
  | "basin"
  | "roof"
  | "pond"
  | "shade"
  | "tank";
/** Litres are conserved between surface, sponge, soil and storage except evaporation. */
export interface CityPlot {
  id: number;
  x: number;
  z: number;
  kind: PlotKind;
  surface: number;
  moisture: number;
  stored: number;
  /** Optional runoff/overflow destination; plot IDs are stable across placeholder levels. */
  drainsTo?: number;
  /** Real street situation on surveyed levels; limits which upgrades fit here. */
  site?: SiteType;
}
/** Street situations that map to urban unsealing techniques (config/sites.ts). */
export type SiteType = "parking" | "verge" | "swale" | "facade";
/** Map-local metres (GLB origin) re-centred and turned so the street runs along -Z. */
export interface LevelSite {
  street: string;
  origin: [number, number];
  heading: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}
export interface CityState {
  plots: CityPlot[];
  elapsed: number;
  heat: number;
  flood: number;
  sponge: number;
  budget: number;
  /** Per-level grants; total earned is independent of spending and refunds. */
  funding: { earned: number; claimed: string[] };
  reused: number;
  rainfall: number;
  evaporated: number;
  infiltrated: number;
  stormSeen: boolean;
  outcome: "playing" | "won" | "lost";
  dangerTime: number;
  sabotageIn: number;
  machineDisabled: number;
  powerTime: number;
  powerCooldown: number;
  maximumTime: number;
  maximumCooldown: number;
  patrickCooldown: number;
  upgraded: boolean;
  selected: CityTool;
  feedback: string;
  /** Absent for the reusable single-mission sandbox. */
  campaign?: CampaignProgress;
}
export interface CampaignProgress {
  level: number;
  completed: string[];
  stormCompleted: boolean;
  connectFrom: number | null;
}
export type LevelMetric =
  | "permeable"
  | "basins"
  | "healthyTrees"
  | "reused"
  | "heat"
  | "flood"
  | "entrancesDry"
  | "stormCompleted"
  | "roofs"
  | "shadeConnected"
  | "roofRoutes"
  | "tanks"
  | "ponds"
  | "tankRoutes"
  | "retained";
export interface LevelGoal {
  metric: LevelMetric;
  target: number;
  label: string;
  maximum?: boolean;
}
/** Fictional layouts are replaceable without altering campaign progression. */
export interface CityLevel {
  id: string;
  location: string;
  title: string;
  /** Fictional stage offset, unrelated to surveyed Basel coordinates. */
  origin?: { x: number; z: number };
  story: readonly string[];
  objective: string;
  layout: readonly { x: number; z: number; site?: SiteType }[];
  /** Absent on placeholder levels, which keep the fictional square. */
  site?: LevelSite;
  entranceIds: readonly number[];
  weather: { dryDuration: number; rainDuration: number; rainRate: number };
  goals: readonly LevelGoal[];
}
export interface LevelAchievement {
  metric: LevelMetric;
  label: string;
  value: number;
  target: number;
  done: boolean;
}
export type CityAction =
  CityTool | "power" | "maximum" | "patrick" | "upgrade" | "machine";
/** Contexts for the team-supplied sound clips. */
export type CitySound =
  "absorb" | "spray" | "tree" | "build" | "pond" | "rain" | "asphalt" | "tank";
export interface CityMetrics {
  permeable: number;
  trees: number;
  healthyTrees: number;
  retained: number;
  unsealedArea: number;
  temperature: number;
}
