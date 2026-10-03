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
  title: "Basel brennt. Schwamm hilft.",
  paragraphs: [
    "Burger gesucht. Hitzestadt gefunden. Zeit, Basel zum Schwamm zu machen.",
  ],
};
export const endingStory = {
  title: "Basel wird Schwammstadt",
  paragraphs: [
    "Asphalt geknackt. Schatten gebaut. Regen gerettet.",
    "Kein Riesenschwamm. Viele kleine Lösungen. Fläche für Fläche.",
  ],
};
export const cityLevels: readonly CityLevel[] = [
  {
    id: "riehenring",
    location: "Riehenring",
    title: "Der Boden muss wieder atmen",
    origin: origins[0],
    layout: riehenringLayout,
    site: riehenringSite,
    weather: { dryDuration: 25, rainDuration: 25, rainRate: 8 },
    story: [
      "„Asphalt ist kein Abfluss, Leute!“",
      "Knack den Boden. Fang die Pfützen. Gib dem Regen ein Zuhause.",
    ],
    objective: "4 Flächen öffnen. 2 Mulden bauen. 400 L gezielt verteilen.",
    goals: [
      { metric: "permeable", target: 4, label: "Flächen entsiegeln" },
      { metric: "basins", target: 2, label: "Pflanzmulden schaffen" },
      { metric: "reused", target: 400, label: "Liter gezielt verteilen" },
      { metric: "heat", target: 82, label: "Hitze höchstens", maximum: true },
      {
        metric: "flood",
        target: 28,
        label: "Flutgefahr höchstens",
        maximum: true,
      },
      { metric: "stormCompleted", target: 1, label: "Gewitter überstanden" },
    ],
  },
  {
    id: "erlenmatt",
    location: "Erlenmatt",
    title: "Basel braucht Wurzeln",
    origin: origins[1],
    layout: placeholderLayout(1),
    weather: { dryDuration: 35, rainDuration: 30, rainRate: 12 },
    story: [
      "„Mehr Wurzeln. Weniger Grillplatte.“",
      "Pflanz Bäume und Mulden. Wasser zuerst für die Durstigen.",
    ],
    objective: "3 gesunde Bäume. 2 Mulden. 7 offene Flächen. 800 L bewässern.",
    goals: [
      { metric: "permeable", target: 7, label: "Offene Wurzelräume" },
      { metric: "healthyTrees", target: 3, label: "Gesunde, bewässerte Bäume" },
      { metric: "basins", target: 2, label: "Pflanzmulden bauen" },
      { metric: "reused", target: 800, label: "Liter gezielt verteilen" },
      { metric: "heat", target: 65, label: "Hitze höchstens", maximum: true },
      {
        metric: "flood",
        target: 28,
        label: "Flutgefahr höchstens",
        maximum: true,
      },
      { metric: "stormCompleted", target: 1, label: "Gewitter überstanden" },
    ],
  },
  {
    id: "st-johann",
    location: "St. Johann",
    title: "Schatten über den Strassen",
    origin: origins[2],
    layout: placeholderLayout(2),
    weather: { dryDuration: 45, rainDuration: 35, rainRate: 16 },
    story: [
      "„Dein Dach kann mehr als heiss sein.“",
      "Grün aufs Dach. Schatten auf die Strasse. Regen sicher weiterleiten.",
    ],
    objective:
      "2 grüne Dächer. 2 benachbarte Schattenplätze. 3 Bäume bewässern.",
    goals: [
      { metric: "roofs", target: 2, label: "Green Roofs bauen" },
      {
        metric: "shadeConnected",
        target: 2,
        label: "Benachbarte Shade Plazas",
      },
      { metric: "healthyTrees", target: 3, label: "Gesunde Bäume" },
      { metric: "reused", target: 1000, label: "Liter gezielt verteilen" },
      { metric: "heat", target: 48, label: "Hitze höchstens", maximum: true },
      {
        metric: "flood",
        target: 28,
        label: "Flutgefahr höchstens",
        maximum: true,
      },
      { metric: "stormCompleted", target: 1, label: "Gewitter überstanden" },
    ],
  },
  {
    id: "voltanord",
    location: "VoltaNord · Lysbüchelplatz",
    title: "Platz für den grossen Regen",
    origin: origins[3],
    layout: placeholderLayout(3),
    weather: { dryDuration: 55, rainDuration: 45, rainRate: 20 },
    story: [
      "„Mein Bauch ist kein Stausee!“",
      "Tanks füllen. Teiche bauen. Regen zurückhalten. Dann: Gewitter abwehren.",
    ],
    objective:
      "2 Tanks. 1 Teich. 2 Mulden. Schatten schaffen und Regen zurückhalten.",
    goals: [
      { metric: "tanks", target: 2, label: "Rain Tanks bauen" },
      { metric: "ponds", target: 1, label: "Pond bauen" },
      { metric: "basins", target: 2, label: "Pflanzmulden bauen" },
      { metric: "shadeConnected", target: 2, label: "Schattenzone bauen" },
      { metric: "healthyTrees", target: 3, label: "Gesunde Bäume" },
      { metric: "retained", target: 2000, label: "Liter Vorrat zurückhalten" },
      { metric: "reused", target: 1500, label: "Liter gezielt verteilen" },
      { metric: "heat", target: 48, label: "Hitze höchstens", maximum: true },
      {
        metric: "flood",
        target: 28,
        label: "Flutgefahr höchstens",
        maximum: true,
      },
      {
        metric: "stormCompleted",
        target: 1,
        label: "Stärkstes Gewitter überstanden",
      },
    ],
  },
];
