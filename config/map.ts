/** Aligned visual layers; road widths are estimates, heights come from swissALTI3D. */
export const mapConfig = {
  roadsUrl: "/maps/basel-roads.json",
  imageryUrl: "/maps/basel-aerial.jpg",
  terrainUrl: "/maps/basel-terrain.bin",
  terrainMetaUrl: "/maps/basel-terrain.json",
  /** Draped roads sit this far above the terrain and are cut into pieces this long. */
  roadLift: 0.08,
  roadStep: 4,
  groundHeight: 0.005,
  roadHeight: 0.01,
  roadOpacity: 0.38,
  mission: { left: -20, right: 20, back: -32, front: 12 },
};
