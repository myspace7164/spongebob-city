/**
 * Illustrative Basel palette, not surveyed wall colours. Stable per-building
 * seeds choose styles until construction-period/use records are matched.
 */
export const buildingStyle = {
  facades: [
    { name: "red sandstone", color: "#a87767", weight: 1 },
    { name: "warm ochre", color: "#c9b285", weight: 3 },
    { name: "faded rose", color: "#c4a195", weight: 2 },
    { name: "ivory plaster", color: "#ded8c7", weight: 6 },
    { name: "limestone", color: "#c5bfb0", weight: 4 },
    { name: "sage plaster", color: "#b4b9a4", weight: 1 },
    { name: "warm white", color: "#e4e0d5", weight: 5 },
  ],
  /** Artistic families: cumulative share, floor/bay size and window size (m). */
  families: [
    {
      name: "traditional",
      share: 0.45,
      floor: 3.2,
      bay: 2.9,
      width: 1.05,
      height: 1.65,
    },
    {
      name: "apartment",
      share: 0.35,
      floor: 2.9,
      bay: 3.1,
      width: 1.6,
      height: 1.4,
    },
    {
      name: "office",
      share: 0.13,
      floor: 3.5,
      bay: 2.0,
      width: 1.65,
      height: 2.05,
    },
    {
      name: "workshop",
      share: 0.07,
      floor: 4.2,
      bay: 4.5,
      width: 2.8,
      height: 1.6,
    },
  ],
  shutter: "#4d6657",
  glass: "#50636b",
  frame: "#e3dfd3",
  door: "#675746",
  tileRoof: "#986451",
  slateRoof: "#62696d",
  gravelRoof: "#b0a89a",
  bitumenRoof: "#747876",
  greenRoof: "#788361",
  flowerPetal: "#c17e84",
  bridge: "#9aa0a6",
  /** Artistic probabilities, not estimates of actual Basel coverage. */
  shutterShare: 0.65,
  flowerShare: 0.08,
  greenRoofShare: 0.18,
  slateRoofShare: 0.22,
  /** |normal.y| below this is wall; at or above flatRoof the roof is flat. */
  wallLimit: 0.35,
  flatRoof: 0.95,
};

/** Facade colour index for a building's seed, honouring the colour weights. */
export function paletteIndex(seed: number): number {
  const total = buildingStyle.facades.reduce((n, f) => n + f.weight, 0);
  let threshold = seed * total;
  for (const [i, facade] of buildingStyle.facades.entries()) {
    threshold -= facade.weight;
    if (threshold < 0) return i;
  }
  return buildingStyle.facades.length - 1;
}
