import * as THREE from "three";
import { cityConfig as c } from "../../config/city";
import { cityLevels } from "../../config/levels";
import type { CityPlot, CityState, CityTool, PlayerState } from "../interfaces";
import { cityMetrics, spongeCapacity, weather } from "./city";
import { activeModifier } from "./level-modifiers";
import { currentLevel, validDrain } from "./campaign";
import {
  ball,
  box,
  label,
  makeCharacter,
  themeColor,
  updateBetonLevelAppearance,
} from "./characters";
import { betonConfig as betonTuning } from "../../config/beton";
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

function buildBetonVehicle(machine: THREE.Group) {
  const concrete = new THREE.MeshStandardMaterial({
    color: themeColor("concrete"),
    roughness: 0.95,
  });
  const concreteLight = new THREE.MeshStandardMaterial({
    color: themeColor("building"),
    roughness: 0.88,
  });
  const asphalt = new THREE.MeshStandardMaterial({
    color: themeColor("asphalt"),
    roughness: 0.78,
    metalness: 0.2,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x4c5257,
    roughness: 0.42,
    metalness: 0.72,
  });
  const ember = new THREE.MeshStandardMaterial({
    color: themeColor("villain-eye"),
    emissive: themeColor("villain-eye"),
    emissiveIntensity: 0.22,
    roughness: 0.3,
  });
  const body = new THREE.Group();
  body.name = "VehicleBody";
  machine.add(body);
  const addBlock = (
    parent: THREE.Object3D,
    name: string,
    size: [number, number, number],
    at: [number, number, number],
    mat: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    mesh.name = name;
    mesh.position.set(...at);
    parent.add(mesh);
    return mesh;
  };
  const addCylinder = (
    parent: THREE.Object3D,
    name: string,
    radius: number,
    length: number,
    at: [number, number, number],
    mat: THREE.Material,
    segments = 12,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, segments),
      mat,
    );
    mesh.name = name;
    mesh.position.set(...at);
    mesh.rotation.x = Math.PI / 2;
    parent.add(mesh);
    return mesh;
  };

  addBlock(
    body,
    "Vehicle_ArmoredChassis",
    [2.85, 0.72, 3.9],
    [0, 0.92, -0.05],
    asphalt,
  );
  addBlock(
    body,
    "Vehicle_ConcreteMantlet",
    [2.55, 0.82, 2.1],
    [0, 1.52, 0.05],
    concrete,
  );
  addBlock(
    body,
    "Vehicle_SideArmor_L",
    [0.18, 0.72, 2.8],
    [-1.35, 1.45, -0.1],
    concreteLight,
  );
  addBlock(
    body,
    "Vehicle_SideArmor_R",
    [0.18, 0.72, 2.8],
    [1.35, 1.45, -0.1],
    concreteLight,
  );
  // Deep faceted plow, built from closed 3D faces rather than a flat plate.
  const ramGeometry = new THREE.BufferGeometry();
  ramGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -1.38, 0.36, 1.05, 1.38, 0.36, 1.05, -1.08, 0.48, 2.34, 1.08, 0.48,
        2.34, -1.38, 1.28, 1.05, 1.38, 1.28, 1.05, -1.08, 0.96, 2.34, 1.08,
        0.96, 2.34,
      ],
      3,
    ),
  );
  ramGeometry.setIndex([
    0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3, 2,
    3, 7, 2, 7, 6, 0, 4, 5, 0, 5, 1,
  ]);
  ramGeometry.computeVertexNormals();
  const ram = new THREE.Mesh(ramGeometry, concreteLight);
  ram.name = "Vehicle_BrutalistRam";
  body.add(ram);
  addBlock(
    body,
    "Vehicle_RamCuttingEdge",
    [2.32, 0.18, 0.15],
    [0, 0.38, 2.3],
    metal,
  );
  addBlock(
    body,
    "Vehicle_RamImpactPlate",
    [1.45, 0.22, 0.11],
    [0, 0.86, 2.38],
    asphalt,
  );

  // Open, armored control bay on the forward deck.
  const driverArea = new THREE.Group();
  driverArea.name = "DriverArea";
  body.add(driverArea);
  addBlock(
    driverArea,
    "DriverArea_Floor",
    [1.65, 0.13, 1.18],
    [0, 2.02, 0.56],
    metal,
  );
  addBlock(
    driverArea,
    "DriverArea_Wall_L",
    [0.16, 0.6, 1.22],
    [-0.79, 2.34, 0.56],
    concrete,
  );
  addBlock(
    driverArea,
    "DriverArea_Wall_R",
    [0.16, 0.6, 1.22],
    [0.79, 2.34, 0.56],
    concrete,
  );
  addBlock(
    driverArea,
    "DriverArea_BackArmor",
    [1.72, 0.64, 0.18],
    [0, 2.34, -0.02],
    concrete,
  );
  addBlock(
    driverArea,
    "DriverArea_Dashboard",
    [1.12, 0.18, 0.22],
    [0, 2.25, 1.06],
    asphalt,
  );
  const steering = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.035, 6, 12),
    metal,
  );
  steering.name = "DriverArea_ControlWheel";
  steering.rotation.x = Math.PI / 2;
  steering.position.set(0, 2.5, 0.92);
  driverArea.add(steering);
  const driverPoint = new THREE.Object3D();
  driverPoint.name = "DrBeton_DriverPoint";
  driverPoint.position.set(0, 2.12, 0.46);
  driverArea.add(driverPoint);

  // Real 3D rear mixer with bands and internal ribs, on its own spin group.
  const mixer = new THREE.Group();
  mixer.name = "ConcreteMixer";
  mixer.position.set(0, 1.72, -0.88);
  body.add(mixer);
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.74, 0.68, 1.72, 12, 1),
    concreteLight,
  );
  drum.name = "ConcreteMixer_Drum";
  drum.rotation.x = Math.PI / 2;
  mixer.add(drum);
  for (const z of [-0.7, 0.7]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.69, 0.075, 6, 16),
      metal,
    );
    ring.name = `ConcreteMixer_Ring_${z < 0 ? "Rear" : "Front"}`;
    ring.rotation.x = Math.PI / 2;
    ring.position.z = z;
    mixer.add(ring);
  }
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const rib = addBlock(
      mixer,
      `ConcreteMixer_Rib_${i + 1}`,
      [0.1, 1.15, 0.12],
      [Math.cos(angle) * 0.54, Math.sin(angle) * 0.54, -0.1],
      asphalt,
    );
    rib.rotation.z = angle;
  }

  // Independent track groups, rollers and raised grouser shoes.
  const tracks: THREE.Group[] = [];
  const trackRollers: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const tag = side < 0 ? "L" : "R";
    const track = new THREE.Group();
    track.name = `Vehicle_Track_${tag}`;
    track.position.x = side * 1.57;
    machine.add(track);
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.78, 3.56),
      asphalt,
    );
    belt.name = `Vehicle_TrackBelt_${tag}`;
    belt.position.set(0, 0.56, -0.03);
    track.add(belt);
    for (let i = 0; i < 3; i++) {
      const roller = addCylinder(
        track,
        `Vehicle_TrackRoller_${tag}_${i + 1}`,
        0.29,
        0.62,
        [0, 0.56, -1.08 + i * 1.06],
        metal,
        10,
      );
      roller.rotation.z = Math.PI / 2;
      roller.rotation.x = 0;
      trackRollers.push(roller);
    }
    for (let i = 0; i < 10; i++) {
      addBlock(
        track,
        `Vehicle_TrackGrouser_${tag}_${i + 1}`,
        [0.61, 0.15, 0.22],
        [side * 0.06, 0.18, -1.55 + i * 0.34],
        concreteLight,
      );
    }
    tracks.push(track);
  }

  // Thick pipe and flared 3D concrete outlet at the rear.
  const outletPipe = addCylinder(
    body,
    "Vehicle_ConcreteOutletPipe",
    0.17,
    0.72,
    [0.76, 1.05, -1.91],
    metal,
  );
  outletPipe.scale.x = 1.18;
  const outlet = new THREE.Object3D();
  outlet.name = "FX_ConcreteOutput";
  outlet.position.set(0.76, 1.05, -2.31);
  outlet.userData.forward = new THREE.Vector3(0, 0, -1);
  body.add(outlet);

  const warningLights: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      ember.clone(),
    );
    light.name = `Vehicle_WarningLight_${side < 0 ? "L" : "R"}`;
    light.position.set(side * 0.93, 2.05, 1.12);
    driverArea.add(light);
    warningLights.push(light);
  }
  addCylinder(
    body,
    "Vehicle_ExhaustStack",
    0.12,
    0.72,
    [1.02, 2.02, -0.65],
    metal,
    10,
  );

  const darkCracks: THREE.Line[] = [];
  const glowCracks: THREE.Line[] = [];
  for (const [index, points] of [
    [
      [-0.88, 1.91, 1.14],
      [-0.7, 1.78, 1.23],
      [-0.79, 1.61, 1.24],
    ],
    [
      [0.88, 1.91, 1.14],
      [0.7, 1.78, 1.23],
      [0.79, 1.61, 1.24],
    ],
  ].entries()) {
    const geometry = new THREE.BufferGeometry().setFromPoints(
      (points as [number, number, number][]).map(
        (p) => new THREE.Vector3(...p),
      ),
    );
    const crack = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0x292927 }),
    );
    crack.name = `Vehicle_ConcreteCrack_${index + 1}`;
    body.add(crack);
    darkCracks.push(crack);
    const glow = new THREE.Line(
      geometry.clone(),
      new THREE.LineBasicMaterial({
        color: themeColor("villain-eye"),
        transparent: true,
        opacity: 0.85,
      }),
    );
    glow.name = `Vehicle_EmberCrack_${index + 1}`;
    glow.visible = false;
    body.add(glow);
    glowCracks.push(glow);
  }

  machine.userData.vehicleBody = body;
  machine.userData.mixer = mixer;
  machine.userData.tracks = tracks;
  machine.userData.trackRollers = trackRollers;
  machine.userData.driverArea = driverArea;
  machine.userData.driverPoint = driverPoint;
  machine.userData.concreteOutput = outlet;
  machine.userData.warningLights = warningLights;
  machine.userData.darkCracks = darkCracks;
  machine.userData.glowCracks = glowCracks;
  return machine.userData;
}

function makeLaserBeam(parent: THREE.Object3D, side: "L" | "R"): THREE.Group {
  const beam = new THREE.Group();
  beam.name = `LaserBeam_${side}`;
  beam.visible = false;
  const aura = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 1, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xff2d1b,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  aura.name = `LaserBeam_${side}_Glow`;
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.065, 1, 8),
    new THREE.MeshBasicMaterial({ color: 0xffa594, toneMapped: false }),
  );
  core.name = `LaserBeam_${side}_Core`;
  beam.add(aura, core);
  parent.add(beam);
  beam.userData.raycaster = new THREE.Raycaster();
  return beam;
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
    const markings = new THREE.Group();
    markings.name = "sealed-markings";
    tile.add(markings);
    for (const x of [-1.65, 1.65])
      box(markings, [0.13, 0.025, 3.8], [x, 0.08, 0], "sealed-line");
    const openEdge = new THREE.Group();
    openEdge.name = "unsealed-edge";
    tile.add(openEdge);
    for (const x of [-2.25, 2.25])
      box(openEdge, [0.15, 0.035, 4.5], [x, 0.09, 0], "open-edge");
    for (const z of [-2.25, 2.25])
      box(openEdge, [4.5, 0.035, 0.15], [0, 0.09, z], "open-edge");
    const props = new THREE.Group();
    tile.add(props);
    const water = box(tile, [4.4, 0.05, 4.4], [0, 0.13, 0], "water");
    const material = water.material as THREE.MeshLambertMaterial;
    material.transparent = true;
    material.opacity = 0.5;
    return { tile, ground, props, water, markings, openEdge, signature: "" };
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
    ["squid", "Squidward · more shade!", 12, -5],
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
  machine.userData.assetKind = "procedural-three-dimensional-boss-vehicle";
  root.add(machine);
  const vehicle = buildBetonVehicle(machine);
  const beton = makeCharacter("beton");
  beton.name = "dr-beton";
  // Sibling roots keep the character and vehicle independently visible and
  // controllable; the driver anchor links their positions during gameplay.
  root.add(beton);
  const betonName = label("DR. BETON · E: STOP HIM!");
  betonName.position.set(0, 3.05, 0);
  beton.add(betonName);
  const driverPoint = vehicle.driverPoint as THREE.Object3D;
  const concreteOutput = vehicle.concreteOutput as THREE.Object3D;
  const laserEyes = beton.userData.laserEyes as THREE.Object3D[];
  const laserBeams = [makeLaserBeam(beton, "L"), makeLaserBeam(beton, "R")];
  const laserRaycasters = laserBeams.map(
    (beam) => beam.userData.raycaster as THREE.Raycaster,
  );
  beton.userData.laserBeams = laserBeams;
  beton.userData.laserRaycasters = laserRaycasters;
  // Collision and damage systems can provide their own targets later without
  // taking ownership of the visual charge/firing sequence.
  beton.userData.intersectLaserTargets = (
    targets: THREE.Object3D[],
  ): THREE.Intersection[] =>
    laserRaycasters.flatMap((raycaster) =>
      raycaster.intersectObjects(targets, true),
    );
  const warning = vehicle.warningLights[0] as THREE.Mesh;
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
  let lastBetonPhase = "";
  let phaseStartedAt = 0;
  let sealingEndedAt = Number.NEGATIVE_INFINITY;
  let previousVehicleTime = 0;
  let previousVehicleX = machine.position.x;
  let previousVehicleZ = machine.position.z;
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
      root.updateMatrixWorld(true);
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
        view.markings.visible = p.kind === "asphalt";
        view.openEdge.visible = p.kind !== "asphalt";
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
      const villain = s.saboteur;
      const elapsedDelta = Math.max(0, s.elapsed - previousVehicleTime);
      previousVehicleTime = s.elapsed;
      machine.position.set(
        villain.x - origin.x,
        ground(villain.x, villain.z),
        villain.z - origin.z,
      );
      machine.rotation.y = villain.facing;
      const vehicleMoved = Math.hypot(
        machine.position.x - previousVehicleX,
        machine.position.z - previousVehicleZ,
      );
      previousVehicleX = machine.position.x;
      previousVehicleZ = machine.position.z;
      const tracks = vehicle.tracks as THREE.Group[];
      const trackRollers = vehicle.trackRollers as THREE.Mesh[];
      const rollerRotation = s.machineDisabled > 0 ? 0 : vehicleMoved * 1.8;
      trackRollers.forEach((trackRoller) => {
        trackRoller.rotation.x += rollerRotation;
      });
      const mixer = vehicle.mixer as THREE.Group;
      mixer.rotation.z = s.machineDisabled > 0 ? 0 : s.elapsed * 1.25;
      tracks.forEach((track) => {
        track.userData.moving = vehicleMoved > 0.001;
      });

      // Character and vehicle remain sibling roots; the anchor couples their
      // placement during play without merging their controls or visibility.
      root.updateMatrixWorld(true);
      machine.updateMatrixWorld(true);
      const driverWorld = driverPoint.getWorldPosition(new THREE.Vector3());
      root.worldToLocal(driverWorld);
      beton.position.copy(driverWorld);
      beton.position.y +=
        villain.phase === "disabled" ? 0 : Math.sin(s.elapsed * 7) * 0.035;
      beton.rotation.set(0, villain.facing, 0);
      const torso = beton.userData.torso as THREE.Group;
      torso.rotation.z =
        villain.phase === "sealing" ? Math.sin(s.elapsed * 9) * 0.035 : 0;
      machine.userData.phase = villain.phase;

      if (villain.phase !== lastBetonPhase) {
        if (lastBetonPhase === "sealing") sealingEndedAt = s.elapsed;
        if (villain.phase === "sealing") phaseStartedAt = s.elapsed;
        lastBetonPhase = villain.phase;
      }
      const sealingAge =
        villain.phase === "sealing" ? s.elapsed - phaseStartedAt : -1;
      const recoveryAge = s.elapsed - sealingEndedAt;
      const attackPhase =
        villain.phase === "sealing" &&
        sealingAge >= betonTuning.laserChargeSeconds &&
        sealingAge <
          betonTuning.laserChargeSeconds + betonTuning.laserFireSeconds;
      const charging =
        villain.phase === "approaching" ||
        (villain.phase === "sealing" && sealingAge >= 0 && !attackPhase);
      const recovering =
        villain.phase !== "sealing" &&
        recoveryAge >= 0 &&
        recoveryAge < betonTuning.laserRecoverySeconds;
      const chargeAmount =
        villain.phase === "approaching"
          ? 0.42 + 0.18 * (0.5 + 0.5 * Math.sin(s.elapsed * 8))
          : charging
            ? THREE.MathUtils.clamp(
                sealingAge / betonTuning.laserChargeSeconds,
                0,
                1,
              )
            : attackPhase
              ? 1
              : recovering
                ? 1 - recoveryAge / betonTuning.laserRecoverySeconds
                : 0;
      const laserState = attackPhase
        ? "firing"
        : charging
          ? "charging"
          : recovering
            ? "recovery"
            : "normal";
      beton.userData.laserState = laserState;
      const levelIndex = s.campaign?.level ?? 0;
      const levelProgress =
        cityLevels.length <= 1 ? 0 : levelIndex / (cityLevels.length - 1);
      updateBetonLevelAppearance(
        beton,
        levelProgress,
        chargeAmount,
        s.elapsed,
        activeModifier(s)?.effects.angryBeton === true,
      );
      const vehicleCracks = vehicle.glowCracks as THREE.Line[];
      vehicleCracks.forEach((crackLine) => {
        crackLine.visible = chargeAmount > 0.58;
        (crackLine.material as THREE.LineBasicMaterial).opacity =
          0.3 + chargeAmount * 0.7;
      });
      const warningLights = vehicle.warningLights as THREE.Mesh[];
      warningLights.forEach((light) => {
        const material = light.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity =
          s.machineDisabled > 0 ? 0.05 : 0.25 + chargeAmount * 2;
      });

      beton.updateMatrixWorld(true);
      const aimPoint = new THREE.Vector3(
        player.position.x,
        player.position.y + 1.15,
        player.position.z,
      );
      laserBeams.forEach((beam, index) => {
        beam.visible = attackPhase;
        if (!attackPhase) return;
        const eye = laserEyes[index];
        const startWorld = eye.getWorldPosition(new THREE.Vector3());
        const direction = aimPoint.clone().sub(startWorld).normalize();
        if (direction.lengthSq() < 0.5) direction.set(0, 0, 1);
        const raycaster = laserRaycasters[index];
        raycaster.set(startWorld, direction);
        raycaster.far = betonTuning.laserRange;
        const distance = Math.min(
          betonTuning.laserRange,
          startWorld.distanceTo(aimPoint),
        );
        const endWorld = startWorld
          .clone()
          .addScaledVector(direction, distance);
        const startLocal = beton.worldToLocal(startWorld.clone());
        const endLocal = beton.worldToLocal(endWorld);
        const beamDirection = endLocal.clone().sub(startLocal).normalize();
        beam.position.copy(startLocal).add(endLocal).multiplyScalar(0.5);
        beam.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          beamDirection,
        );
        beam.scale.set(1, distance, 1);
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
      (warning.material as THREE.MeshStandardMaterial).color.copy(
        themeColor(s.machineDisabled > 0 ? "leaf" : "coral"),
      );
    },
  };
}
