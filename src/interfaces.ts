/** Mutable world coordinates, with Y pointing up. */
export interface Vector3State {
  x: number;
  y: number;
  z: number;
}
/** Position is the character's feet; grounded means standing on the Y=0 plane. */
export type EmoteKind = "six-seven" | "macarena" | "teabag" | "dab" | "floss";
export interface PlayerState {
  emote?: { id: EmoteKind; elapsed: number; remaining: number };
  /** Fixed-step sprint pacing state, synchronized by the room authority in co-op. */
  sprintElapsed?: number;
  sprintCooldown?: number;
  sprinting?: boolean;
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

/** swissALTI3D heights on a regular grid in map-local metres; rows run north to south. */
export interface TerrainGrid {
  bounds: [number, number, number, number];
  spacing: number;
  columns: number;
  rows: number;
  heights: Float32Array;
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
  /** Present in campaigns so AI can reject stale/inactive-level candidates. */
  levelId?: string;
  x: number;
  z: number;
  /** Three.js Y rotation in play coordinates, in radians; absent means zero. */
  rotationY?: number;
  kind: PlotKind;
  surface: number;
  moisture: number;
  stored: number;
  /** Optional runoff/overflow destination; plot IDs are stable across placeholder levels. */
  drainsTo?: number;
  /** Real street situation on surveyed levels; limits which upgrades fit here. */
  site?: SiteType;
  /** Techniques allowed on this plot when they differ from its site type's defaults. */
  builds?: CityTool[];
  /** Ground height in metres from the terrain; absent means flat (no downhill runoff). */
  elevation?: number;
  /** Provenance for debug/reclamation; ground remains walkable either way. */
  concretedByBeton?: boolean;
}
/** Street situations that map to urban unsealing techniques (config/sites.ts). */
export type SiteType = "parking" | "verge" | "swale" | "facade";
/** Map-local metres (GLB origin) re-centred and turned so the street runs along -Z. */
export interface LevelSite {
  street: string;
  origin: [number, number];
  heading: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Where the player starts, in play coordinates; the origin when absent. */
  start?: [number, number];
  /** Facing at spawn in radians; 0 looks along the street (−Z). */
  startYaw?: number;
  /** Character positions in play coordinates; missing ones use config defaults. */
  npcs?: Partial<Record<NpcId, [number, number]>>;
  /** World objects in play coordinates; missing ones use config defaults. */
  landmarks?: Partial<Record<LandmarkId, LandmarkPlacement>>;
}
/** Fixed world objects a built level may move: signs, the buddy, the first pickup. */
export type LandmarkId = "leaderboard" | "buddy" | "powerup" | "streetSign";
/** Play coordinates; rotationY (radians) only turns the leaderboard sign. */
export interface LandmarkPlacement {
  at: [number, number];
  rotationY?: number;
}
/** The square's characters: helpers, Sandy's workshop and Dr. Beton's start. */
export type NpcId = "patrick" | "krabs" | "sandy" | "squidward" | "beton";
/** One spot of a level layout; `builds` overrides the site type's techniques. */
export interface LevelSpot {
  x: number;
  z: number;
  /** Three.js Y rotation in play coordinates, in radians; absent means zero. */
  rotationY?: number;
  site?: SiteType;
  builds?: CityTool[];
}
/** A level made in the dev-only level builder: name, place and 16 spots. */
export interface BuiltLevel {
  /** Place name shown in the story, level header, route and street sign. */
  location: string;
  site: LevelSite;
  spots: LevelSpot[];
}
/** A builder level saved to the shared library (config/built-levels/library/<id>.json). */
export interface LibraryLevel extends BuiltLevel {
  /** File name and lookup key: a slug of the place plus a short suffix. */
  id: string;
  /** GitHub username of whoever saved it last; never a real name. */
  author: string;
  notes: string;
  /** Story level id whose goals it was built and checked against. */
  builtFor: string;
  /** ISO time of the last save. */
  savedAt: string;
}
/** Which level plays each story stage and which places endless mode may pick. */
export interface LevelLineup {
  /** Story level id to library level id; a missing stage picks a random built-in Basel street. */
  stages: Record<string, string>;
  /** Endless entries switched off: "basel:<location id>" or "library:<library id>". */
  endlessOff: string[];
}
export interface CityState {
  powerups: PowerupState;
  plots: CityPlot[];
  elapsed: number;
  /** Global city temperature in Celsius; heat remains a normalized risk meter. */
  temperature: number;
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
  lossReason?: string;
  fires: CityFire[];
  fireSpawnTimer: number;
  fireSequence: number;
  sabotageIn: number;
  machineDisabled: number;
  saboteur: {
    levelId?: string | null;
    lastValidX?: number;
    lastValidZ?: number;
    x: number;
    z: number;
    facing: number;
    destinationX: number;
    destinationZ: number;
    step: number;
    phase: "roaming" | "approaching" | "sealing" | "disabled";
    targetId: number | null;
    sealTime: number;
  };
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
export interface CityFire {
  id: number;
  plotId: number;
  intensity: number;
  size: 0 | 1 | 2;
}
export interface CampaignProgress {
  /** Post-campaign round, starting at 1; absent during the normal campaign. */
  endlessRound?: number;
  /** Server/solo-selected route, retained for retries; omitted only in legacy fixtures.
   * Each entry is a Basel location id or "library:<library id>". */
  locations?: string[];
  level: number;
  completed: string[];
  stormCompleted: boolean;
  connectFrom: number | null;
  /** A wheel choice is pending between successful campaign levels. */
  wheelPending: boolean;
  pendingModifier: LevelModifierId | null;
  activeModifier: LevelModifierId | null;
  /** Run-purchased hats persist through levels and clear after a loss. */
  ownedHats?: HatId[];
  equippedHat: HatId | null;
}
export type HatId =
  | "trafficCone"
  | "cowboy"
  | "newspaper"
  | "sailor"
  | "wizard"
  | "footballCap"
  | "diamondKingCrown";
export type LevelModifierId =
  | "speedBoost"
  | "waterBoost"
  | "slowBeton"
  | "doubleCoins"
  | "miniSponge"
  | "reducedWater"
  | "angryBeton"
  | "heatWave";
export interface LevelModifierEffects {
  playerSpeed?: number;
  absorptionSpeed?: number;
  waterCapacity?: number;
  betonSpeed?: number;
  coinReward?: number;
  playerScale?: number;
  heatWarming?: number;
  angryBeton?: boolean;
}
export interface LevelModifierDefinition {
  id: LevelModifierId;
  kind: "positive" | "negative";
  weight: number;
  icon: string;
  name: string;
  shortName: string;
  effectText: string;
  effects: LevelModifierEffects;
}
export type LevelMetric =
  | "permeable"
  | "basins"
  | "healthyTrees"
  | "reused"
  | "heat"
  | "flood"
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
  /** Real map anchoring; mission plot geometry remains illustrative. */
  mapSite?: LevelSite;
  id: string;
  location: string;
  title: string;
  /** Fictional stage offset, unrelated to surveyed Basel coordinates. */
  origin?: { x: number; z: number };
  story: readonly string[];
  objective: string;
  layout: readonly LevelSpot[];
  /** Absent on placeholder levels, which keep the fictional square. */
  site?: LevelSite;
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

/** Cookie identity is opaque; only public account information crosses the API. */
export interface Account {
  id: string;
  username: string;
}
export interface LeaderboardEntry {
  /** Stable server account identity used to keep only one best score per player. */
  playerId: string;
  username: string;
  survivalTimeMs: number;
  mode: "solo" | "practice" | "multiplayer";
}
export interface OnlinePlayer extends Account {
  player: PlayerState;
  selected: CityTool;
  ready: boolean;
  /** Individual appearance; purchased hats remain in the shared room collection. */
  equippedHat?: HatId | null;
}
export interface RoomSnapshot {
  code: string;
  hostId: string;
  revision: number;
  city: CityState;
  players: OnlinePlayer[];
}
/** Clients send input/actions, never city state, positions, funding or scores. */
export interface OnlineCommand {
  emote?: EmoteKind;
  movement?: MovementInput;
  yaw?: number;
  selected?: CityTool;
  ready?: boolean;
  action?: CityAction | "connect" | "recycle" | "reset" | "endless";
  target?: number | null;
  bubbles?: boolean;
  powerup?: boolean;
  /** Shared run cosmetic; server snapshots keep every client visually in sync. */
  equippedHat?: HatId | null;
}

export type PowerupKind =
  | "laeckerli"
  | "confetti"
  | "rhine"
  | "basilisk"
  | "lantern"
  | "bell"
  | "pore"
  | "patrick"
  | "maximum"
  | "bubbles";
/** Pickups and stored charges are separate: collection never activates a boost. */
export interface PowerupState {
  pickups: { id: PowerupKind; x: number; z: number; collected: boolean }[];
  held: PowerupKind | null;
  active: PowerupKind | null;
  remaining: number;
  dropIn: number;
  dropIndex: number;
  pulseIn: number;
}

/** Solid horizontal collision footprint; player position is still at their feet. */
export interface CollisionObstacle {
  x: number;
  z: number;
  radius?: number;
  halfX?: number;
  halfZ?: number;
}

/** Cosmetic simulation-time ambient poses; no gameplay effects. */
export type AmbientActivity = "walk" | "sip" | "roll" | "smoke" | "cheer";
