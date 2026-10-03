import * as THREE from "three";
import { cityConfig as c } from "../../config/city";
import type { CityPlot, CityState, CityTool, PlayerState } from "../interfaces";
import { cityMetrics, spongeCapacity, weather } from "./city";
import { currentLevel, validDrain } from "./campaign";
import { ball, box, label, makeCharacter, themeColor } from "./characters";
import { createCityFireView } from "./city-fire-view";

function dispose(group: THREE.Group): void {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((m) => m.dispose());
    } else if (object instanceof THREE.Sprite) {
      object.material.map?.dispose();
      object.material.dispose();
    }
  });
  group.clear();
}

function plotProps(group: THREE.Group, plot: CityPlot): void {
  dispose(group);
  const kind = plot.kind;
  if (kind === "asphalt" || kind === "soil") return;
  if (kind === "tree") {
    box(group, [0.35, 2.8, 0.35], [0, 1.4, 0], "wood");
    for (const [x, y, z] of [
      [0, 3.5, 0],
      [-0.7, 2.9, 0],
      [0.7, 3, 0.3],
    ])
      ball(
        group,
        1.1,
        [x, y, z],
        plot.moisture >= c.moistureHealthy ? "leaf" : "dry-leaf",
      );
  } else if (kind === "basin") {
    for (const x of [-1, 0, 1])
      for (const z of [-1, 1]) {
        box(group, [0.08, 0.5, 0.08], [x, 0.25, z], "leaf");
        ball(group, 0.17, [x, 0.6, z], "pink");
      }
  } else if (kind === "roof") {
    box(group, [2.9, 2.3, 2.9], [0, 1.15, 0], "building");
    box(group, [3.1, 0.25, 3.1], [0, 2.42, 0], "grass");
    for (const x of [-0.9, 0, 0.9]) {
      box(group, [0.28, 2.3, 0.12], [x, 1.3, 1.51], "leaf");
      ball(group, 0.35, [x, 2.8, 0], "leaf");
    }
  } else if (kind === "pond") {
    const pond = ball(group, 1.8, [0, 0.1, 0], "water");
    pond.scale.y = 0.12;
    ball(group, 0.25, [0.4, 0.35, 0.4], "white");
    ball(group, 0.14, [0.4, 0.58, 0.6], "white");
  } else if (kind === "shade") {
    for (const x of [-1.5, 1.5])
      box(group, [0.14, 2.6, 0.14], [x, 1.3, 0], "wood");
    box(group, [3.6, 0.2, 3.6], [0, 2.7, 0], "shade");
    box(group, [2.2, 0.18, 0.7], [0, 0.55, 0], "wood");
    for (const x of [-0.8, 0.8])
      box(group, [0.15, 0.5, 0.5], [x, 0.25, 0], "ink");
  } else if (kind === "tank") {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 1.9, 12),
      new THREE.MeshLambertMaterial({ color: themeColor("water") }),
    );
    tank.position.y = 0.95;
    group.add(tank);
    box(group, [1.9, 0.18, 1.9], [0, 1.96, 0], "white");
    box(group, [0.16, 0.16, 2.2], [0, 0.3, 1], "water");
  }
}

/** Bounded procedural city; only rebuild props when plot kind or tree health changes. */
export function createCityView(scene: THREE.Scene, state: CityState) {
  const root = new THREE.Group();
  scene.add(root);
  const updateFireView = createCityFireView(root);
  const plotViews = state.plots.map((p) => {
    const tile = new THREE.Group();
    tile.position.set(p.x, 0, p.z);
    root.add(tile);
    // A skirt below the surface keeps tiles from floating on slopes.
    const ground = box(tile, [4.7, 0.5, 4.7], [0, -0.18, 0], "asphalt");
    const props = new THREE.Group();
    tile.add(props);
    const water = box(tile, [4.4, 0.05, 4.4], [0, 0.13, 0], "water");
    const material = water.material as THREE.MeshLambertMaterial;
    material.transparent = true;
    material.opacity = 0.5;
    return { tile, ground, props, water, signature: "" };
  });
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 0.2, 4.9),
    new THREE.MeshBasicMaterial({
      color: themeColor("accent"),
      wireframe: true,
    }),
  );
  root.add(border);
  const architecture = new THREE.Group();
  root.add(architecture);
  // Keep the stage set until the surveyed model finishes loading.
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 5;
    box(
      architecture,
      [4.6, 5 + (i % 3), 4],
      [x, (5 + (i % 3)) / 2, -30],
      i % 2 ? "building" : "building-alt",
    );
    box(architecture, [4.9, 0.45, 4.4], [x, 5.2 + (i % 3), -30], "roof");
    for (const y of [1.5, 3.5])
      for (const dx of [-1, 1])
        box(architecture, [0.7, 1, 0.05], [x + dx, y, -27.96], "window");
  }
  for (const x of [-18, 18])
    for (const z of [-3, -10, -17]) {
      box(architecture, [5, 5, 6], [x, 2.5, z], "building");
      box(architecture, [5.4, 0.4, 6.4], [x, 5.2, z], "roof");
    }
  for (const x of [-3, 3]) {
    box(architecture, [2, 9, 2], [x, 4.5, -32], "church");
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 3.4, 4),
      new THREE.MeshLambertMaterial({ color: themeColor("roof") }),
    );
    spire.position.set(x, 10.6, -32);
    architecture.add(spire);
  }
  let sign = label("BASEL · PLACEHOLDER LEVEL");
  sign.position.set(0, 6, -27);
  root.add(sign);
  const routes = new THREE.Group();
  root.add(routes);
  let campaignSignature = "";
  let importedLevel = false;
  // World height of the terrain; flat until the Basel terrain has loaded.
  let groundAt = (_x: number, _z: number) => 0;
  let groundVersion = 0;
  let playerGround = 0;
  /** Static props keep their height above ground; re-placed when level or terrain changes. */
  const grounded: { object: THREE.Object3D; base: number }[] = [];
  const keepOnGround = (object: THREE.Object3D) =>
    grounded.push({ object, base: object.position.y });
  for (const [kind, text, x, z] of [
    ["patrick", "Patrick · P: unseal", -11, -3],
    ["sandy", "Sandy · E: upgrade", c.sandy.x, c.sandy.z],
    ["squid", "Thaddäus · more shade!", 12, -5],
    ["krabs", "Mr. Krabs · budget", -11, 2],
  ] as const) {
    const npc = makeCharacter(kind);
    npc.position.set(x, 0, z);
    root.add(npc);
    const name = label(text);
    name.position.set(x, 3, z);
    root.add(name);
    keepOnGround(npc);
    keepOnGround(name);
  }
  const machine = new THREE.Group();
  machine.name = "roaming-asphaltinator";
  machine.position.set(c.machine.x, 0, c.machine.z + 2);
  root.add(machine);
  const beton = makeCharacter("beton");
  beton.name = "dr-beton";
  beton.position.set(0, 0.7, -0.2);
  machine.add(beton);
  const betonName = label("Dr. Beton · E: STOP HIM!");
  betonName.position.set(0, 3.6, 0);
  machine.add(betonName);
  box(machine, [2.5, 1.4, 2], [0, 0.85, 0], "concrete");
  const roller = box(machine, [3.3, 0.7, 1], [0, 0.4, 1.2], "ink");
  const warning = ball(machine, 0.22, [0, 1.7, 0], "coral");
  const attackGeometry = new THREE.BufferGeometry();
  const attackPoints = new THREE.Float32BufferAttribute(new Float32Array(6), 3);
  attackGeometry.setAttribute("position", attackPoints);
  const attackPath = new THREE.Line(
    attackGeometry,
    new THREE.LineBasicMaterial({
      color: themeColor("villain-eye"),
      depthTest: false,
    }),
  );
  attackPath.frustumCulled = false;
  root.add(attackPath);
  const residents = new THREE.Group();
  root.add(residents);
  for (let i = 0; i < 8; i++) {
    const person = new THREE.Group();
    box(person, [0.3, 0.65, 0.3], [0, 0.65, 0], i % 2 ? "coral" : "water");
    ball(person, 0.18, [0, 1.13, 0], "skin");
    person.position.set(((i % 4) - 1.5) * 5, 0, 1 + Math.floor(i / 4) * 2);
    residents.add(person);
    keepOnGround(person);
  }
  const birds = new THREE.Group();
  root.add(birds);
  keepOnGround(birds);
  for (let i = 0; i < 6; i++) {
    const bird = box(
      birds,
      [0.5, 0.08, 0.15],
      [(i - 3) * 3, 5 + (i % 2), -12],
      "white",
    );
    bird.rotation.z = i % 2 ? 0.3 : -0.3;
  }
  const rainGeometry = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i++) {
    rainPositions[i * 3] = ((i * 13) % 37) - 18;
    rainPositions[i * 3 + 1] = (i * 7) % 14;
    rainPositions[i * 3 + 2] = -((i * 17) % 30);
  }
  rainGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(rainPositions, 3),
  );
  const rain = new THREE.Points(
    rainGeometry,
    new THREE.PointsMaterial({ color: themeColor("water"), size: 0.12 }),
  );
  root.add(rain);
  const ray = new THREE.Raycaster();
  const droplets = new THREE.Group();
  for (let i = 0; i < 8; i++) ball(droplets, 0.12, [0, 0, 0], "water");
  root.add(droplets);
  const point = new THREE.Vector3();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  return {
    /** Terrain heights for world coordinates; props and plots follow it from the next update. */
    useGround(ground: (x: number, z: number) => number) {
      groundAt = ground;
      groundVersion++;
    },
    useImportedLevel() {
      importedLevel = true;
      architecture.visible = false;
    },
    target(s: CityState, camera: THREE.Camera): number | null {
      ray.setFromCamera(new THREE.Vector2(0, 0), camera);
      // Aim at the ground level around the player; nearby slopes are gentle.
      floor.constant = -playerGround;
      if (!ray.ray.intersectPlane(floor, point)) return null;
      const nearest = [...s.plots].sort(
        (a, b) =>
          Math.hypot(a.x - point.x, a.z - point.z) -
          Math.hypot(b.x - point.x, b.z - point.z),
      )[0];
      return Math.hypot(nearest.x - point.x, nearest.z - point.z) < 4.5
        ? nearest.id
        : null;
    },
    update(
      s: CityState,
      player: PlayerState,
      targetId: number | null,
      reach: number,
      waterAction: CityTool | null = null,
      bubbles = false,
    ) {
      const level = currentLevel(s);
      const origin = level?.origin ?? { x: 0, z: 0 };
      root.position.set(origin.x, 0, origin.z);
      const ground = (x: number, z: number) => groundAt(x, z);
      playerGround = ground(player.position.x, player.position.z);
      const nextSignature = `${level?.id}/${groundVersion}/${s.plots.map((p) => `${p.x},${p.z},${p.kind},${p.drainsTo}`).join(";")}`;
      if (campaignSignature !== nextSignature) {
        campaignSignature = nextSignature;
        dispose(routes);
        root.remove(sign);
        sign.material.map?.dispose();
        sign.material.dispose();
        sign = label(
          level?.site
            ? level.site.street.toUpperCase()
            : `${level?.location ?? "BARFÜSSERPLATZ"} · PLACEHOLDER`,
        );
        // The stand-in square would block a real street when the Basel model is missing.
        architecture.visible = !importedLevel && !level?.site;
        sign.position.set(0, 6 + ground(origin.x, origin.z - 27), -27);
        root.add(sign);
        for (const { object, base } of grounded)
          object.position.y =
            base +
            ground(origin.x + object.position.x, origin.z + object.position.z);
        architecture.position.y = ground(origin.x, origin.z);
        for (const p of s.plots) {
          const destination = validDrain(s, p);
          if (destination && (p.kind === "roof" || p.kind === "tank")) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(
                p.x - origin.x,
                ground(p.x, p.z) + 0.3,
                p.z - origin.z,
              ),
              new THREE.Vector3(
                destination.x - origin.x,
                ground(destination.x, destination.z) + 0.3,
                destination.z - origin.z,
              ),
            ]);
            routes.add(
              new THREE.Line(
                geometry,
                new THREE.LineBasicMaterial({ color: themeColor("water") }),
              ),
            );
          }
        }
      }
      const rainy = weather(s).raining;
      scene.background = themeColor(rainy ? "rain-sky" : "sky");
      if (scene.fog instanceof THREE.Fog)
        scene.fog.color.copy(scene.background);
      s.plots.forEach((p, i) => {
        const view = plotViews[i];
        view.tile.position.set(
          p.x - origin.x,
          p.elevation ?? ground(p.x, p.z),
          p.z - origin.z,
        );
        const signature = `${p.kind}/${p.moisture >= c.moistureHealthy}`;
        if (view.signature !== signature) {
          plotProps(view.props, p);
          view.signature = signature;
        }
        (view.ground.material as THREE.MeshLambertMaterial).color.copy(
          themeColor(
            p.kind === "asphalt"
              ? "asphalt"
              : p.kind === "soil"
                ? "soil"
                : "grass",
          ),
        );
        view.water.visible = p.surface > 10;
        view.water.scale.y = Math.max(1, Math.min(8, p.surface / 120));
        (view.water.material as THREE.MeshLambertMaterial).opacity = Math.min(
          0.65,
          0.2 + p.surface / 1500,
        );
      });
      updateFireView(s.fires, s.plots, origin, ground, s.elapsed);
      const targetPlot = s.plots.find((p) => p.id === targetId);
      border.visible = !!targetPlot;
      if (targetPlot) {
        border.position.set(
          targetPlot.x - origin.x,
          ground(targetPlot.x, targetPlot.z) + 0.15,
          targetPlot.z - origin.z,
        );
        (border.material as THREE.MeshBasicMaterial).color.copy(
          themeColor(
            Math.hypot(
              targetPlot.x - player.position.x,
              targetPlot.z - player.position.z,
            ) <= reach
              ? "accent"
              : "coral",
          ),
        );
      }
      const canFlow =
        targetPlot &&
        Math.hypot(
          targetPlot.x - player.position.x,
          targetPlot.z - player.position.z,
        ) <= reach &&
        (waterAction === "absorb"
          ? targetPlot.surface > 0 && s.sponge < spongeCapacity(s)
          : waterAction === "spray" &&
            s.sponge > 0 &&
            targetPlot.kind !== "asphalt");
      droplets.visible = !!canFlow;
      if (canFlow && targetPlot)
        droplets.children.forEach((drop, i) => {
          const phase = (s.elapsed * 2 + i / 8) % 1;
          const t = waterAction === "absorb" ? 1 - phase : phase;
          drop.position.set(
            THREE.MathUtils.lerp(player.position.x, targetPlot.x, t) - origin.x,
            THREE.MathUtils.lerp(
              player.position.y + 1.3,
              ground(targetPlot.x, targetPlot.z) + 0.4,
              t,
            ) +
              Math.sin(t * Math.PI) * (bubbles ? 2 : 0.6),
            THREE.MathUtils.lerp(player.position.z, targetPlot.z, t) - origin.z,
          );
          drop.scale.setScalar(bubbles ? 2.5 : 1);
        });
      const healthy = cityMetrics(s).healthyTrees;
      residents.children.forEach(
        (child, i) => (child.visible = i < healthy * 2),
      );
      birds.visible = healthy >= 2;
      birds.position.x = Math.sin(s.elapsed * 0.4) * 2;
      rain.visible = rainy;
      // Rain covers the area around the player, so it also falls further down a street.
      rain.position.set(
        player.position.x - origin.x,
        playerGround,
        player.position.z - origin.z + 15,
      );
      const attribute = rainGeometry.getAttribute("position");
      for (let i = 0; i < 180; i++)
        attribute.setY(i, (((i * 7 - s.elapsed * 9) % 14) + 14) % 14);
      attribute.needsUpdate = true;
      roller.rotation.x = s.machineDisabled > 0 ? 0 : s.elapsed * 2;
      const villain = s.saboteur;
      machine.position.set(
        villain.x - origin.x,
        ground(villain.x, villain.z),
        villain.z - origin.z,
      );
      machine.rotation.y = villain.facing;
      beton.position.y =
        0.7 +
        (villain.phase === "disabled" ? 0 : Math.sin(s.elapsed * 7) * 0.06);
      beton.rotation.z =
        villain.phase === "sealing" ? Math.sin(s.elapsed * 22) * 0.15 : 0;
      machine.userData.phase = villain.phase;
      beton.traverse((object) => {
        if (object instanceof THREE.Mesh && object.name === "evil-eye") {
          (object.material as THREE.MeshLambertMaterial).emissive
            .copy(themeColor("villain-eye"))
            .multiplyScalar(villain.phase === "disabled" ? 0 : 0.7);
        }
      });
      const victim = s.plots.find((p) => p.id === villain.targetId);
      attackPath.visible = !!victim;
      if (victim) {
        attackPoints.setXYZ(
          0,
          villain.x - origin.x,
          ground(villain.x, villain.z) + 0.35,
          villain.z - origin.z,
        );
        attackPoints.setXYZ(
          1,
          victim.x - origin.x,
          ground(victim.x, victim.z) + 0.35,
          victim.z - origin.z,
        );
        attackPoints.needsUpdate = true;
      }
      (warning.material as THREE.MeshLambertMaterial).color.copy(
        themeColor(s.machineDisabled > 0 ? "leaf" : "coral"),
      );
    },
  };
}
