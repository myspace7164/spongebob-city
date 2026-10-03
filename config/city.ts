import type { CityTool, PlotKind } from "../src/interfaces";

/** Fictional demo coefficients supplied for gameplay, not a climate forecast. */
export const cityConfig = {
  plotCount: 16,
  plotSpacing: 5,
  plotArea: 25,
  budget: 2200,
  initialHeat: 76,
  initialSurface: 120,
  capacity: 400,
  upgradedCapacity: 700,
  poweredCapacity: 1400,
  maximumCapacity: 4000,
  maximumUnlock: 800,
  maximumReach: 30,
  absorbRate: 300,
  sprayRate: 160,
  reach: 7,
  bubbleReach: 16,
  dryDuration: 35,
  rainDuration: 45,
  rainRate: 16,
  soilCapacity: 350,
  storageCapacity: 1500,
  moistureHealthy: 70,
  infiltrationRate: 18,
  evaporationRate: 0.7,
  treeUseRate: 0.5,
  soilDrainRate: 2,
  basinDrainRate: 12,
  tankIrrigationRate: 8,
  irrigationReachMultiplier: 1.5,
  floodLitres: 8500,
  /** Downhill surface flow between plots with terrain heights (litres/s, metres). */
  runoffRate: 20,
  runoffReach: 7.5,
  runoffMinimumDrop: 0.05,
  heatResponse: 0.04,
  temperatureBase: 25,
  temperatureSpan: 12,
  dryHeatBoost: 8,
  minimumHeat: 10,
  criticalDanger: 99,
  sabotageInterval: 38,
  machineDisableTime: 45,
  powerDuration: 12,
  powerCooldown: 35,
  maximumDuration: 8,
  maximumCooldown: 65,
  patrickCooldown: 30,
  upgradeCost: 250,
  dangerSeconds: 18,
  goals: { permeable: 6, trees: 4, reused: 2500, heat: 48, flood: 28 },
  machine: { x: 11, z: -24 },
  sandy: { x: -12, z: -12 },
  bounds: { minX: -14, maxX: 14, minZ: -25, maxZ: 5 },
};

export const plotCooling: Record<PlotKind, { dry: number; wet: number }> = {
  asphalt: { dry: 0, wet: 0 },
  soil: { dry: 1, wet: 1 },
  tree: { dry: 1, wet: 9 },
  basin: { dry: 2, wet: 6 },
  roof: { dry: 7, wet: 7 },
  pond: { dry: 1, wet: 5 },
  shade: { dry: 7, wet: 7 },
  tank: { dry: 1, wet: 1 },
};

export const cityTools: readonly {
  id: CityTool;
  name: string;
  icon: string;
  description: string;
  cost: number;
}[] = [
  {
    id: "absorb",
    name: "Sponge vacuum",
    icon: "🧽",
    description: "Absorb surface water; your sponge has limited capacity.",
    cost: 0,
  },
  {
    id: "spray",
    name: "Water spray",
    icon: "💦",
    description:
      "Give collected water to soil, plants or a tank. B: distant bubbles after Sandy's upgrade.",
    cost: 0,
  },
  {
    id: "karate",
    name: "Unseal karate",
    icon: "🧱",
    description:
      "Break asphalt into permeable soil. At the Asphaltinator: disable sabotage.",
    cost: 30,
  },
  {
    id: "tree",
    name: "Plant tree",
    icon: "🌳",
    description: "Plant on unsealed soil, then water it for cooling.",
    cost: 110,
  },
  {
    id: "basin",
    name: "Rain garden",
    icon: "🌱",
    description:
      "A planted infiltration basin absorbs runoff and cools the square.",
    cost: 90,
  },
  {
    id: "roof",
    name: "Green roof",
    icon: "🏡",
    description: "A green roof and facade retain rain and reduce heat.",
    cost: 140,
  },
  {
    id: "pond",
    name: "Small pond",
    icon: "🦆",
    description: "Retain rain and attract wildlife. Fill with sponge water.",
    cost: 130,
  },
  {
    id: "shade",
    name: "Shade plaza",
    icon: "⛱️",
    description:
      "Shaded permeable seating cools the square even during drought.",
    cost: 100,
  },
  {
    id: "tank",
    name: "Rain tank",
    icon: "💧",
    description: "Store rainwater and slowly irrigate neighbouring vegetation.",
    cost: 120,
  },
];
export const plotNames: Record<PlotKind, string> = {
  asphalt: "Sealed asphalt",
  soil: "Unsealed soil",
  tree: "Tree",
  basin: "Rain garden",
  roof: "Green roof & facade",
  pond: "Pond",
  shade: "Shaded seating",
  tank: "Rainwater tank",
};
