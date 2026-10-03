import type { CityLevel } from "../src/interfaces";
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
export const campaignConfig = {
  entranceSurfaceLimit: 20,
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
    layout: placeholderLayout(0),
    entranceIds: [15],
    weather: { dryDuration: 25, rainDuration: 25, rainRate: 8 },
    story: [
      "„Asphalt ist kein Abfluss, Leute!“",
      "Knack den Boden. Fang die Pfützen. Gib dem Regen ein Zuhause.",
    ],
    objective:
      "4 Flächen öffnen. 2 Mulden bauen. 400 L verteilen. Eingang trocken halten.",
    goals: [
      { metric: "permeable", target: 4, label: "Flächen entsiegeln" },
      { metric: "basins", target: 2, label: "Pflanzmulden schaffen" },
      { metric: "reused", target: 400, label: "Liter gezielt verteilen" },
      { metric: "entrancesDry", target: 1, label: "Hauseingang trocken" },
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
    entranceIds: [15],
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
    entranceIds: [15],
    weather: { dryDuration: 45, rainDuration: 35, rainRate: 16 },
    story: [
      "„Dein Dach kann mehr als heiss sein.“",
      "Grün aufs Dach. Schatten auf die Strasse. Regen sicher weiterleiten.",
    ],
    objective:
      "2 grüne Dächer. 2 benachbarte Schattenplätze. Abläufe verbinden. 3 Bäume bewässern.",
    goals: [
      { metric: "roofs", target: 2, label: "Green Roofs bauen" },
      {
        metric: "shadeConnected",
        target: 2,
        label: "Benachbarte Shade Plazas",
      },
      {
        metric: "roofRoutes",
        target: 2,
        label: "Dachabläufe verbinden (C → C)",
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
    entranceIds: [15],
    weather: { dryDuration: 55, rainDuration: 45, rainRate: 20 },
    story: [
      "„Mein Bauch ist kein Stausee!“",
      "Tanks füllen. Teiche bauen. Überläufe verbinden. Dann: Gewitter abwehren.",
    ],
    objective:
      "2 Tanks. 1 Teich. 2 Mulden. Dächer und Überläufe verbinden. Schule trocken halten.",
    goals: [
      { metric: "tanks", target: 2, label: "Rain Tanks bauen" },
      { metric: "ponds", target: 1, label: "Pond bauen" },
      { metric: "basins", target: 2, label: "Pflanzmulden bauen" },
      {
        metric: "tankRoutes",
        target: 2,
        label: "Sichere Tanküberläufe (C → C)",
      },
      { metric: "roofRoutes", target: 2, label: "Dachzuflüsse verbinden" },
      { metric: "shadeConnected", target: 2, label: "Schattenzone bauen" },
      { metric: "healthyTrees", target: 3, label: "Gesunde Bäume" },
      { metric: "retained", target: 2000, label: "Liter Vorrat zurückhalten" },
      { metric: "reused", target: 1500, label: "Liter gezielt verteilen" },
      { metric: "entrancesDry", target: 1, label: "Schuleingang trocken" },
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
