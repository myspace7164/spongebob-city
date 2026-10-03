import type { CityTool, SiteType } from "../src/interfaces";

/** Street situations and the unsealing techniques that fit them; karate unseals every site. */
export const siteTechniques: Record<
  SiteType,
  { name: string; hint: string; builds: readonly CityTool[] }
> = {
  parking: {
    name: "Parking bay → permeable paving",
    hint: "Parking stays usable: unseal it (3) for grass or gravel pavers so rain soaks in.",
    builds: [],
  },
  verge: {
    name: "Sidewalk verge → tree pit",
    hint: "Tree pit (Baumrigole): unseal, plant a tree, and let street runoff water its roots.",
    builds: ["tree", "basin", "shade"],
  },
  swale: {
    name: "Street corner → swale",
    hint: "Swale (Versickerungsmulde): a planted dip that collects runoff from the street.",
    builds: ["basin", "pond", "tank"],
  },
  facade: {
    name: "Building edge → green roof",
    hint: "Building edge: green roof, shade sail or rain tank for the house behind it.",
    builds: ["roof", "shade", "tank"],
  },
};
