import type { HatId } from "../src/interfaces.ts";

export const hatPrice = 1000;

export interface HatDefinition {
  id: HatId;
  name: string;
  price: number;
  scale: number;
  offset: [number, number, number];
  rotation: [number, number, number];
}

/** One shared catalogue drives shop cards and wearable-model placement. */
export const hats: readonly HatDefinition[] = [
  {
    id: "trafficCone",
    name: "Traffic Cone",
    price: hatPrice,
    scale: 0.84,
    offset: [0, 1.88, 0],
    rotation: [0, 0, 0],
  },
  {
    id: "cowboy",
    name: "Cowboy Hat",
    price: hatPrice,
    scale: 0.92,
    offset: [0, 1.87, 0],
    rotation: [0, 0, -0.025],
  },
  {
    id: "newspaper",
    name: "Newspaper Hat",
    price: hatPrice,
    scale: 0.9,
    offset: [0, 1.86, 0],
    rotation: [0, 0, 0],
  },
  {
    id: "sailor",
    name: "Sailor Hat",
    price: hatPrice,
    scale: 0.92,
    offset: [0, 1.86, 0],
    rotation: [0, 0, 0],
  },
  {
    id: "wizard",
    name: "Wizard Hat",
    price: hatPrice,
    scale: 0.86,
    offset: [0, 1.88, 0],
    rotation: [0, 0, -0.04],
  },
  {
    id: "footballCap",
    name: "Red & Blue Football Cap",
    price: hatPrice,
    scale: 0.92,
    offset: [0, 1.85, 0],
    rotation: [0, 0, 0],
  },
  {
    id: "diamondKingCrown",
    name: "Diamond King Crown",
    price: 4200,
    scale: 0.96,
    offset: [0, 1.84, 0],
    rotation: [0, 0, 0],
  },
];

export function hatDefinition(id: HatId): HatDefinition {
  return hats.find((hat) => hat.id === id)!;
}
