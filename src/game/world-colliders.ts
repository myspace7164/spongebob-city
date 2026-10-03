import { riversideBuddy as buddyConfig } from "../../config/riverside-buddy.ts";
import { riversideBuddyPose } from "./riverside-buddy.ts";
import { cast } from "../../config/characters.ts";
import { castPosition } from "./cast.ts";
import { cityConfig } from "../../config/city.ts";
import type { CityState } from "../interfaces.ts";
import { currentLevel } from "./campaign.ts";
import {
  boxCollider,
  circleCollider,
  type SolidCollider,
} from "./collisions.ts";

/** Shared world-space physical footprints for solo rendering and co-op authority. */
export function gameplayColliders(
  state: CityState,
  groundAt: (x: number, z: number) => number,
  includeFallbackArchitecture = false,
): SolidCollider[] {
  const origin = currentLevel(state)?.origin ?? { x: 0, z: 0 };
  const solids: SolidCollider[] = [];
  for (const plot of state.plots) {
    const y = plot.elevation ?? groundAt(plot.x, plot.z);
    if (plot.kind === "tree")
      solids.push(
        circleCollider(
          `plot-tree-${plot.id}`,
          plot.x,
          plot.z,
          0.24,
          y,
          y + 2.8,
        ),
      );
    else if (plot.kind === "roof")
      solids.push(
        boxCollider(
          `plot-green-roof-${plot.id}`,
          plot.x,
          plot.z,
          1.45,
          1.45,
          y,
          y + 2.7,
        ),
      );
    else if (plot.kind === "pond")
      solids.push(
        circleCollider(
          `plot-pond-${plot.id}`,
          plot.x,
          plot.z,
          1.62,
          y,
          y + 0.45,
        ),
      );
    else if (plot.kind === "tank")
      solids.push(
        circleCollider(
          `plot-tank-${plot.id}`,
          plot.x,
          plot.z,
          0.96,
          y,
          y + 2.1,
        ),
      );
    else if (plot.kind === "shade") {
      for (const side of [-1, 1])
        solids.push(
          circleCollider(
            `shade-post-${plot.id}-${side}`,
            plot.x + side * 1.5,
            plot.z,
            0.12,
            y,
            y + 2.6,
          ),
        );
      solids.push(
        boxCollider(
          `shade-bench-${plot.id}`,
          plot.x,
          plot.z,
          1.1,
          0.35,
          y + 0.45,
          y + 0.78,
        ),
      );
    }
  }
  for (const [index, actor] of cast.entries()) {
    const kind = actor.id;
    const { x: worldX, z: worldZ } = castPosition(state, index);
    const y = groundAt(worldX, worldZ);
    solids.push(
      circleCollider(
        `character-${kind}`,
        worldX,
        worldZ,
        0.46,
        y,
        y + 1.9,
        "character",
      ),
    );
  }
  const buddy = riversideBuddyPose(state);
  const buddyGround = groundAt(buddy.x, buddy.z);
  solids.push(
    circleCollider(
      "character-buddy",
      buddy.x,
      buddy.z,
      buddyConfig.collisionRadius,
      buddyGround,
      buddyGround + 2.25,
      "character",
    ),
  );
  const villain = state.saboteur;
  const machineGround = groundAt(villain.x, villain.z);
  solids.push(
    boxCollider(
      "dr-beton-vehicle",
      villain.x,
      villain.z,
      1.8,
      2.45,
      machineGround,
      machineGround + 2.7,
      villain.facing,
      "character",
    ),
  );
  solids.push(
    circleCollider(
      "dr-beton",
      villain.x + Math.sin(villain.facing) * 0.46,
      villain.z + Math.cos(villain.facing) * 0.46,
      0.58,
      machineGround + 2.05,
      machineGround + 4.1,
      "character",
    ),
  );
  if (includeFallbackArchitecture) {
    const y = groundAt(origin.x, origin.z);
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 5;
      const height = 5 + (i % 3);
      solids.push(
        boxCollider(
          `fallback-building-${i}`,
          origin.x + x,
          origin.z - 30,
          2.3,
          2,
          y,
          y + height,
          0,
          "environment",
        ),
      );
    }
    for (const x of [-18, 18])
      for (const z of [-3, -10, -17])
        solids.push(
          boxCollider(
            `fallback-side-building-${x}-${z}`,
            origin.x + x,
            origin.z + z,
            2.5,
            3,
            y,
            y + 5,
            0,
            "environment",
          ),
        );
    for (const x of [-3, 3])
      solids.push(
        boxCollider(
          `fallback-church-${x}`,
          origin.x + x,
          origin.z - 32,
          1,
          1,
          y,
          y + 9,
          0,
          "environment",
        ),
      );
  }
  return solids;
}
