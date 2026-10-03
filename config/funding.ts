import type { PlotKind } from "../src/interfaces.ts";

/** Fictional government grants, awarded once per useful action/site each level. */
export const fundingConfig = {
  collect: 10,
  irrigate: 20,
  route: 25,
  machine: 30,
  upgrade: 40,
  construction: {
    asphalt: 0,
    soil: 40,
    tree: 80,
    basin: 60,
    roof: 80,
    pond: 60,
    shade: 60,
    tank: 60,
  } satisfies Record<PlotKind, number>,
  celebrationMs: 1400,
  chimeVolume: 0.09,
  chimeNotes: [659.25, 987.77, 1318.51],
  noteSeconds: 0.075,
};
