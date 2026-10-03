import type { LevelSite } from "../src/interfaces.ts";
/** Ranked official area samples; two eligible candidates per difficulty tier. */
export const baselLocations: readonly {
  id: string;
  name: string;
  priority: number;
  site: LevelSite;
}[] = [
  {
    id: "st-alban",
    name: "St. Alban-Kirchrain",
    priority: 0.1392,
    site: {
      street: "St. Alban-Kirchrain",
      origin: [538.406, 39.345],
      heading: 3.141592653589793,
      bounds: { minX: -14, maxX: 14, minZ: -100, maxZ: 12 },
    },
  },
  {
    id: "matthaeus",
    name: "Klybeckstrasse · Matthäus",
    priority: 0.2658,
    site: {
      street: "Klybeckstrasse · Matthäus",
      origin: [-165.629, -949.276],
      heading: 3.141592653589793,
      bounds: { minX: -14, maxX: 14, minZ: -100, maxZ: 12 },
    },
  },
  {
    id: "st-alban-vorstadt",
    name: "St. Alban-Vorstadt",
    priority: 0.29,
    site: {
      street: "St. Alban-Vorstadt",
      origin: [555.975, 163.952],
      heading: 3.141592653589793,
      bounds: { minX: -14, maxX: 14, minZ: -100, maxZ: 12 },
    },
  },
  {
    id: "clara",
    name: "Clarastrasse",
    priority: 0.314,
    site: {
      street: "Clarastrasse",
      origin: [50.995, -741.887],
      heading: 3.141592653589793,
      bounds: { minX: -14, maxX: 14, minZ: -100, maxZ: 12 },
    },
  },
  {
    id: "aeschen",
    name: "Aeschenplatz",
    priority: 0.405,
    site: {
      street: "Aeschenplatz",
      origin: [122.555, 387.873],
      heading: 3.141592653589793,
      bounds: { minX: -14, maxX: 14, minZ: -100, maxZ: 12 },
    },
  },
  {
    id: "johanniter",
    name: "Johanniterstrasse",
    priority: 0.5395,
    site: {
      street: "Johanniterstrasse",
      origin: [-842.03, -1025.836],
      heading: 3.141592653589793,
      bounds: { minX: -14, maxX: 14, minZ: -100, maxZ: 12 },
    },
  },
  {
    id: "riehenring",
    name: "Riehenring",
    priority: 0.5572,
    site: {
      street: "Riehenring",
      origin: [428.15, -898.98],
      heading: -0.3974,
      bounds: { minX: -14, maxX: 14, minZ: -100, maxZ: 12 },
    },
  },
  {
    id: "st-johann",
    name: "St. Johanns-Ring",
    priority: 1,
    site: {
      street: "St. Johanns-Ring",
      origin: [-1185.689, -1056.09],
      heading: 3.141592653589793,
      bounds: { minX: -14, maxX: 14, minZ: -100, maxZ: 12 },
    },
  },
];
export const levelLocationPools = [0, 1, 2, 3].map((tier) =>
  baselLocations.slice(tier * 2, tier * 2 + 2),
);
