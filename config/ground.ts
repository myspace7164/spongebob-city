/**
 * Drawn ground from Basel's land cover (data.bs.ch 100477). Codes must match
 * CATEGORIES in scripts/convert-basel-ground.py and public/maps/basel-ground.json.
 */
export const groundCategories = [
  "other",
  "road",
  "sidewalk",
  "island",
  "paved",
  "green",
  "forest",
  "water",
  "rail",
  "building",
] as const;

export const groundStyle = {
  metaUrl: "/maps/basel-ground.json",
  colours: {
    other: "#c9c2b1",
    road: "#5c5f63",
    curb: "#c8c6bf",
    sidewalk: "#b9b4aa",
    island: "#a9b48f",
    paved: "#cdc6b6",
    green: "#7fae5b",
    greenLight: "#97c26a",
    forest: "#4f7f45",
    water: "#4f9cc4",
    waterLight: "#8cc8e2",
    rail: "#8f857a",
    building: "#bdb6a8",
  },
  /** Metres: sidewalk paving and slab sizes; lookup jitter hides 0.4 m texel steps. */
  paving: 0.6,
  slabs: 1.2,
  jitter: 0.15,
  /** Lit ground under the scene's strong lights would wash out; scale colours. */
  brightness: 0.5,
};

/** Cartoon trees from Basel's tree inventory (data.bs.ch 100052). */
export const treeStyle = {
  url: "/maps/basel-trees.json",
  trunk: "#7a5636",
  leaves: "#5f9e45",
  needles: "#3f7a4a",
  /** Trees this close (m) to an unsealing spot are hidden so they never block it. */
  plotClearance: 3,
};
