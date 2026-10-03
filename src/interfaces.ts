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
}
export interface CityState {
  plots: CityPlot[];
  elapsed: number;
  heat: number;
  flood: number;
  sponge: number;
  budget: number;
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
}
export type CityAction =
  CityTool | "power" | "maximum" | "patrick" | "upgrade" | "machine";
export interface CityMetrics {
  permeable: number;
  trees: number;
  healthyTrees: number;
  retained: number;
  unsealedArea: number;
  temperature: number;
}
