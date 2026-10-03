import * as THREE from "three";
import { ball, box, themeColor } from "./characters.ts";
import type { CityTool } from "../interfaces.ts";
import { cityTools } from "../../config/city.ts";

/** Cache one miniature per tool; swaps never rebuild geometry or accumulate props. */
export function createHeldTools(parent: THREE.Group) {
  const root = new THREE.Group();
  root.name = "held-tool";
  parent.add(root);
  const props = new Map<CityTool, THREE.Group>();
  for (const { id } of cityTools) {
    const g = new THREE.Group();
    g.name = `held-${id}`;
    g.visible = false;
    if (id === "absorb") {
      box(g, [0.3, 0.3, 0.2], [0, 0.12, 0.1], "sponge");
      for (const x of [-0.08, 0.08]) ball(g, 0.035, [x, 0.17, 0.22], "pore");
    } else if (id === "spray") {
      box(g, [0.35, 0.3, 0.24], [0, 0.13, 0.08], "water");
      const spout = box(g, [0.11, 0.1, 0.35], [0, 0.18, 0.35], "water");
      spout.rotation.x = -0.35;
      box(g, [0.08, 0.2, 0.08], [0, 0.3, 0.02], "ink");
    } else if (id === "karate") {
      box(g, [0.09, 0.5, 0.09], [0, 0.15, 0.1], "wood");
      box(g, [0.45, 0.15, 0.17], [0, 0.43, 0.1], "concrete");
    } else if (id === "tree" || id === "basin") {
      box(g, [0.3, 0.17, 0.3], [0, 0.03, 0.1], "wood");
      box(g, [0.07, 0.4, 0.07], [0, 0.27, 0.1], "wood");
      ball(g, id === "tree" ? 0.23 : 0.16, [0, 0.48, 0.1], "leaf");
      if (id === "basin") ball(g, 0.13, [0.15, 0.22, 0.1], "grass");
    } else if (id === "roof") {
      box(g, [0.46, 0.22, 0.4], [0, 0.14, 0.1], "concrete");
      box(g, [0.5, 0.07, 0.44], [0, 0.3, 0.1], "leaf");
    } else if (id === "pond") {
      box(g, [0.5, 0.12, 0.4], [0, 0.05, 0.1], "water");
      ball(g, 0.09, [0.14, 0.15, 0.17], "leaf");
    } else if (id === "shade") {
      box(g, [0.05, 0.5, 0.05], [0, 0.25, 0.1], "wood");
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 0.14, 8),
        new THREE.MeshLambertMaterial({ color: themeColor("sponge") }),
      );
      canopy.position.set(0, 0.55, 0.1);
      g.add(canopy);
    } else {
      box(g, [0.35, 0.42, 0.3], [0, 0.19, 0.1], "water");
      box(g, [0.42, 0.05, 0.36], [0, 0.42, 0.1], "ink");
    }
    props.set(id, g);
    root.add(g);
  }
  return {
    root,
    select(tool: CityTool) {
      for (const [id, g] of props) g.visible = id === tool;
      root.userData.selected = tool;
    },
  };
}
