import type { CityLevel, LevelSite, SiteType } from "../src/interfaces";
import { cityConfig } from "./city";

/** User-supplied story; all layouts and thresholds are fictional until maps arrive. */
/** Separate fictional stages; these offsets are not geographic coordinates. */
const origins = [
  { x: 0, z: 0 },
  { x: 80, z: -60 },
  { x: -90, z: -100 },
  { x: 120, z: 90 },
];
function placeholderLayout(level: number) {
  const origin = origins[level];
  return Array.from({ length: cityConfig.plotCount }, (_, id) => {
    const row = Math.floor(id / 4),
      column = id % 4;
    return {
      x:
        origin.x +
        (column - 1.5) * cityConfig.plotSpacing +
        (level === 1 ? (row % 2) * 2.5 : level === 3 ? (row - 1.5) * 1.8 : 0),
      z:
        origin.z -
        5 -
        row * cityConfig.plotSpacing +
        (level === 2 && row >= 2 ? -2 : 0),
    };
  });
}
/**
 * Riehenring, the straight stretch south of the footbridge (map-local metres).
 * Spots were placed on the street centreline from basel-roads.json and checked
 * against building footprints in basel-city.glb and the SWISSIMAGE photo.
 */
export const riehenringSite: LevelSite = {
  street: "Riehenring",
  origin: [428.15, -898.98],
  heading: -0.3974,
  bounds: { minX: -11.5, maxX: 11.5, minZ: -100, maxZ: 12 },
};
const spot = (x: number, z: number, site: SiteType) => ({ x, z, site });
/** Stable plot order follows the street's parking, verge and facade locations. */
const riehenringLayout = [
  spot(-8, -20, "swale"),
  spot(-8, -26, "swale"),
  // A parking space in front of the start becomes a tree pit.
  spot(-3.6, -6, "verge"),
  spot(-8.6, -53, "verge"),
  spot(-8.6, -59, "verge"),
  spot(-3.6, -44, "parking"),
  spot(-3.6, -50, "parking"),
  spot(9, -52, "facade"),
  spot(9, -62, "facade"),
  spot(-8.6, -65, "verge"),
  spot(-8.6, -71, "verge"),
  spot(-3.6, -56, "parking"),
  spot(6, -96, "swale"),
  spot(-8, -32, "swale"),
  spot(-3.6, -62, "parking"),
  spot(9, -40, "facade"),
];
export const campaignConfig = {
  roofReleaseRate: 8,
  overflowRate: 60,
  basinInfiltrationRate: 90,
  basinDrainRate: 75,
  shadeNeighbourDistance: cityConfig.plotSpacing * 1.05,
};
export const arrivalStory = {
  title: "Basel burns. Sponge to the rescue.",
  paragraphs: [
    "Came for burgers. Found a frying pan. Time to sponge up Basel.",
  ],
};
export const endingStory = {
  title: "Basel goes sponge city!",
  paragraphs: [
    "Asphalt smashed. Shade built. Rain saved.",
    "Small fixes. Big difference. One plot at a time.",
  ],
};
export const cityLevels: readonly CityLevel[] = [
  {
    id: "riehenring",
    location: "Riehenring",
    title: "LET THE GROUND BREATHE",
    origin: origins[0],
    layout: riehenringLayout,
    site: riehenringSite,
    weather: { dryDuration: 25, rainDuration: 25, rainRate: 8 },
    story: [
      "“Asphalt is no drain, people!”",
      "Crack the ground. Catch puddles. Give rain a home.",
    ],
    objective: "Open 4 plots. Build 2 rain gardens. Reuse 400 L.",
    goals: [
      { metric: "permeable", target: 4, label: "Open plots" },
      { metric: "basins", target: 2, label: "Rain gardens" },
      { metric: "reused", target: 400, label: "Litres reused" },
      { metric: "heat", target: 82, label: "Heat below", maximum: true },
      {
        metric: "flood",
        target: 28,
        label: "Flood below",
        maximum: true,
      },
      { metric: "stormCompleted", target: 1, label: "Storm survived" },
    ],
  },
  {
    id: "erlenmatt",
    location: "Erlenmatt",
    title: "ROOTS BEAT HEAT",
    origin: origins[1],
    layout: placeholderLayout(1),
    weather: { dryDuration: 35, rainDuration: 30, rainRate: 12 },
    story: [
      "“More roots. Less barbecue.”",
      "Plant trees and rain gardens. Thirstiest roots drink first.",
    ],
    objective: "3 healthy trees. 2 rain gardens. 7 open plots. Reuse 800 L.",
    goals: [
      { metric: "permeable", target: 7, label: "Open root spaces" },
      { metric: "healthyTrees", target: 3, label: "Healthy watered trees" },
      { metric: "basins", target: 2, label: "Rain gardens" },
      { metric: "reused", target: 800, label: "Litres reused" },
      { metric: "heat", target: 65, label: "Heat below", maximum: true },
      {
        metric: "flood",
        target: 28,
        label: "Flood below",
        maximum: true,
      },
      { metric: "stormCompleted", target: 1, label: "Storm survived" },
    ],
  },
  {
    id: "st-johann",
    location: "St. Johann",
    title: "SHADE THE STREETS",
    origin: origins[2],
    layout: placeholderLayout(2),
    weather: { dryDuration: 45, rainDuration: 35, rainRate: 16 },
    story: [
      "“Your roof can do more than roast!”",
      "Green roofs. Cool streets. Route rain somewhere safe.",
    ],
    objective: "2 green roofs. 2 linked shade plazas. Water 3 trees.",
    goals: [
      { metric: "roofs", target: 2, label: "Green roofs" },
      {
        metric: "shadeConnected",
        target: 2,
        label: "Linked shade plazas",
      },
      { metric: "healthyTrees", target: 3, label: "Healthy trees" },
      { metric: "reused", target: 1000, label: "Litres reused" },
      { metric: "heat", target: 48, label: "Heat below", maximum: true },
      {
        metric: "flood",
        target: 28,
        label: "Flood below",
        maximum: true,
      },
      { metric: "stormCompleted", target: 1, label: "Storm survived" },
    ],
  },
  {
    id: "voltanord",
    location: "VoltaNord · Lysbüchelplatz",
    title: "MAKE ROOM FOR THE STORM",
    origin: origins[3],
    layout: placeholderLayout(3),
    weather: { dryDuration: 55, rainDuration: 45, rainRate: 20 },
    story: [
      "“My belly is no reservoir!”",
      "Fill tanks. Build ponds. Hold the rain. Bring on the storm.",
    ],
    objective: "2 tanks. 1 pond. 2 rain gardens. Add shade and hold rain.",
    goals: [
      { metric: "tanks", target: 2, label: "Rain tanks" },
      { metric: "ponds", target: 1, label: "Pond" },
      { metric: "basins", target: 2, label: "Rain gardens" },
      { metric: "shadeConnected", target: 2, label: "Connected shade" },
      { metric: "healthyTrees", target: 3, label: "Healthy trees" },
      { metric: "retained", target: 2000, label: "Litres retained" },
      { metric: "reused", target: 1500, label: "Litres reused" },
      { metric: "heat", target: 48, label: "Heat below", maximum: true },
      {
        metric: "flood",
        target: 28,
        label: "Flood below",
        maximum: true,
      },
      {
        metric: "stormCompleted",
        target: 1,
        label: "Biggest storm survived",
      },
    ],
  },
];
