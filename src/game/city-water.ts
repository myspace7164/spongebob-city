import { cityConfig as c } from "../../config/city";
import type { CityPlot, CityState } from "../interfaces";
const storagePlot = (p: CityPlot) => ["tank", "pond", "roof"].includes(p.kind);

/** Rainfall, soil infiltration, evaporation and tank irrigation conserve litres. */
export function updateWater(s: CityState, dt: number, raining: boolean): void {
  for (const p of s.plots) {
    const rainfall = raining ? c.rainRate * dt : 0;
    p.surface += rainfall;
    s.rainfall += rainfall;
    if (p.kind !== "asphalt") {
      const field = storagePlot(p) ? "stored" : "moisture";
      const limit = field === "stored" ? c.storageCapacity : c.soilCapacity;
      const absorbed = Math.min(
        p.surface,
        Math.max(0, limit - p[field]),
        c.infiltrationRate * dt,
      );
      p.surface -= absorbed;
      p[field] += absorbed;
      // Permeable ground continues infiltrating to deeper soil when saturated.
      if (!storagePlot(p)) {
        const deep = Math.min(
          p.moisture,
          (p.kind === "basin" ? c.basinDrainRate : c.soilDrainRate) * dt,
        );
        p.moisture -= deep;
        s.infiltrated += deep;
      }
    }
    if (p.kind === "tank" && p.stored > 0) {
      for (const neighbour of s.plots) {
        if (
          !["tree", "basin", "roof"].includes(neighbour.kind) ||
          Math.hypot(p.x - neighbour.x, p.z - neighbour.z) >
            c.plotSpacing * c.irrigationReachMultiplier
        )
          continue;
        const irrigated = Math.min(
          p.stored,
          Math.max(0, c.soilCapacity - neighbour.moisture),
          c.tankIrrigationRate * dt,
        );
        p.stored -= irrigated;
        neighbour.moisture += irrigated;
      }
    }
    const evaporated = Math.min(p.surface, c.evaporationRate * dt);
    const used = Math.min(p.moisture, (raining ? 0 : c.treeUseRate) * dt);
    p.surface -= evaporated;
    p.moisture -= used;
    s.evaporated += evaporated + used;
  }
}
