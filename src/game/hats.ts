import * as THREE from "three";
import { hatDefinition } from "../../config/hats.ts";
import type { CityState, HatId } from "../interfaces.ts";

function material(color: number, roughness = 0.72): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function add(
  group: THREE.Group,
  name: string,
  geometry: THREE.BufferGeometry,
  surface: THREE.Material,
  at: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
  rotation: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, surface);
  mesh.name = name;
  mesh.position.set(...at);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  group.add(mesh);
  return mesh;
}

function cylinder(
  group: THREE.Group,
  name: string,
  top: number,
  bottom: number,
  height: number,
  y: number,
  surface: THREE.Material,
  segments = 18,
): THREE.Mesh {
  return add(
    group,
    name,
    new THREE.CylinderGeometry(top, bottom, height, segments),
    surface,
    [0, y, 0],
  );
}

function starGeometry(points = 5): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? 0.105 : 0.047;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function trafficCone(hat: THREE.Group): void {
  const orange = material(0xf56b26);
  const reflective = material(0xfff2ce, 0.42);
  cylinder(hat, "ConeHat_Base", 0.27, 0.27, 0.08, 0.04, orange, 20);
  cylinder(hat, "ConeHat_Body", 0.025, 0.21, 0.57, 0.355, orange, 16);
  cylinder(
    hat,
    "ConeHat_ReflectiveBand_Lower",
    0.16,
    0.18,
    0.065,
    0.22,
    reflective,
    16,
  );
  cylinder(
    hat,
    "ConeHat_ReflectiveBand_Upper",
    0.095,
    0.115,
    0.055,
    0.44,
    reflective,
    16,
  );
}

function cowboyHat(hat: THREE.Group): void {
  const tan = material(0xc99b5d);
  const lightTan = material(0xe0bd82);
  const band = material(0x754323);
  add(
    hat,
    "CowboyHat_Brim",
    new THREE.CylinderGeometry(0.5, 0.5, 0.09, 24),
    tan,
    [0, 0.05, 0],
    [1, 1, 0.83],
  );
  add(
    hat,
    "CowboyHat_LeftRolledBrim",
    new THREE.SphereGeometry(0.16, 12, 8),
    lightTan,
    [-0.38, 0.105, 0],
    [1.4, 0.55, 1],
  );
  add(
    hat,
    "CowboyHat_RightRolledBrim",
    new THREE.SphereGeometry(0.16, 12, 8),
    lightTan,
    [0.38, 0.105, 0],
    [1.4, 0.55, 1],
  );
  cylinder(hat, "CowboyHat_Crown", 0.24, 0.3, 0.37, 0.275, tan, 20);
  add(
    hat,
    "CowboyHat_CrownTop",
    new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    lightTan,
    [0, 0.46, 0],
    [1, 0.68, 1],
  );
  const crownBand = add(
    hat,
    "CowboyHat_Band",
    new THREE.TorusGeometry(0.275, 0.026, 7, 20),
    band,
    [0, 0.19, 0],
  );
  crownBand.rotation.x = Math.PI / 2;
}

function newspaperHat(hat: THREE.Group): void {
  const paper = material(0xf1ead8, 0.93);
  const fold = material(0xd2c8ae, 0.98);
  add(
    hat,
    "PaperHat_FoldedCrown",
    new THREE.ConeGeometry(0.36, 0.34, 4, 1),
    paper,
    [0, 0.19, 0],
    [1, 0.72, 1],
    [0, Math.PI / 4, 0],
  );
  add(
    hat,
    "PaperHat_FoldedFront",
    new THREE.BoxGeometry(0.58, 0.1, 0.38),
    fold,
    [0, 0.045, 0.03],
    [1, 1, 1],
    [0, 0, -0.035],
  );
  const newsInk = material(0x373c3b, 1);
  for (let i = 0; i < 5; i++) {
    add(
      hat,
      `PaperHat_Print_${i + 1}`,
      new THREE.BoxGeometry(0.065 + (i % 2) * 0.025, 0.012, 0.008),
      newsInk,
      [-0.2 + i * 0.09, 0.13 + (i % 2) * 0.045, 0.3],
    );
  }
  add(
    hat,
    "PaperHat_FoldLine",
    new THREE.BoxGeometry(0.012, 0.23, 0.012),
    fold,
    [0, 0.19, 0.307],
  );
}

function sailorHat(hat: THREE.Group): void {
  const white = material(0xf7f4e8, 0.48);
  const navy = material(0x202d3b, 0.58);
  const blue = material(0x147dc1, 0.48);
  cylinder(hat, "SailorHat_DarkBand", 0.34, 0.36, 0.15, 0.08, navy, 20);
  cylinder(hat, "SailorHat_Crown", 0.28, 0.33, 0.46, 0.365, white, 20);
  add(
    hat,
    "SailorHat_Top",
    new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    white,
    [0, 0.595, 0],
    [1, 0.46, 1],
  );
  add(
    hat,
    "SailorHat_AnchorRing",
    new THREE.TorusGeometry(0.09, 0.022, 6, 14),
    blue,
    [0, 0.32, 0.306],
  );
  add(
    hat,
    "SailorHat_AnchorStem",
    new THREE.BoxGeometry(0.038, 0.17, 0.035),
    blue,
    [0, 0.42, 0.308],
  );
  add(
    hat,
    "SailorHat_AnchorBar",
    new THREE.BoxGeometry(0.2, 0.034, 0.035),
    blue,
    [0, 0.49, 0.308],
  );
  const leftFluke = add(
    hat,
    "SailorHat_AnchorFluke_L",
    new THREE.BoxGeometry(0.12, 0.035, 0.035),
    blue,
    [-0.055, 0.255, 0.308],
    [1, 1, 1],
    [0, 0, -0.65],
  );
  const rightFluke = add(
    hat,
    "SailorHat_AnchorFluke_R",
    new THREE.BoxGeometry(0.12, 0.035, 0.035),
    blue,
    [0.055, 0.255, 0.308],
    [1, 1, 1],
    [0, 0, 0.65],
  );
  leftFluke.updateMatrix();
  rightFluke.updateMatrix();
}

function wizardHat(hat: THREE.Group): void {
  const blue = material(0x315fa5, 0.62);
  const lighterBlue = material(0x4d7bc0, 0.58);
  const silver = material(0xe0e9f5, 0.38);
  const brim = add(
    hat,
    "WizardHat_Brim",
    new THREE.TorusGeometry(0.34, 0.11, 8, 24),
    blue,
    [0, 0.07, 0],
    [1, 1, 0.9],
  );
  brim.rotation.x = Math.PI / 2;
  add(
    hat,
    "WizardHat_Cone",
    new THREE.ConeGeometry(0.34, 0.82, 14, 2),
    blue,
    [0, 0.46, 0],
    [1, 1, 0.88],
    [0, 0, -0.08],
  );
  add(
    hat,
    "WizardHat_BentTip",
    new THREE.ConeGeometry(0.13, 0.31, 9),
    lighterBlue,
    [0.13, 0.88, 0],
    [1, 1, 1],
    [0, 0, 0.72],
  );
  add(hat, "WizardHat_HangingStar", starGeometry(), silver, [0.28, 0.78, 0.29]);
  for (const [index, at] of [
    [-0.18, 0.37, 0.3],
    [0.12, 0.22, 0.31],
    [-0.04, 0.58, 0.24],
  ].entries()) {
    add(
      hat,
      `WizardHat_Star_${index + 1}`,
      starGeometry(),
      silver,
      at as [number, number, number],
    );
  }
}

function footballCap(hat: THREE.Group): void {
  const red = material(0xd8333d, 0.65);
  const blue = material(0x1e5ca8, 0.58);
  const white = material(0xfaf3e5, 0.45);
  const dome = new THREE.SphereGeometry(
    0.34,
    18,
    12,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  add(hat, "FootballCap_BlueDome", dome, blue, [0, 0.1, 0], [1, 1.15, 0.92]);
  add(
    hat,
    "FootballCap_RedSidePanel",
    new THREE.SphereGeometry(
      0.345,
      12,
      8,
      Math.PI / 2,
      Math.PI / 2,
      0,
      Math.PI / 2,
    ),
    red,
    [0, 0.1, 0],
    [1, 1.15, 0.93],
  );
  add(
    hat,
    "FootballCap_Bill",
    new THREE.SphereGeometry(0.36, 16, 8),
    red,
    [0, 0.045, 0.18],
    [1.12, 0.12, 0.64],
  );
  add(
    hat,
    "FootballCap_Crest",
    new THREE.CircleGeometry(0.105, 16),
    white,
    [0, 0.17, 0.315],
  );
  add(
    hat,
    "FootballCap_CrestBolt",
    starGeometry(4),
    red,
    [0, 0.17, 0.322],
    [0.8, 1, 1],
    [0, 0, Math.PI / 4],
  );
}

function diamondKingCrown(hat: THREE.Group): void {
  const leather = new THREE.MeshStandardMaterial({
    color: 0x11151b,
    roughness: 0.48,
    metalness: 0.16,
  });
  const silver = new THREE.MeshStandardMaterial({
    color: 0xc7d0da,
    roughness: 0.22,
    metalness: 0.88,
  });
  const darkSilver = new THREE.MeshStandardMaterial({
    color: 0x56616c,
    roughness: 0.32,
    metalness: 0.82,
  });
  const diamond = new THREE.MeshPhysicalMaterial({
    color: 0xdff7ff,
    roughness: 0.08,
    metalness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    emissive: 0x4a9db1,
    emissiveIntensity: 0.08,
  });

  add(
    hat,
    "DiamondKing_LeatherBand",
    new THREE.CylinderGeometry(0.37, 0.41, 0.24, 32),
    leather,
    [0, 0.14, 0],
  );
  for (const [name, y, radius, thickness, surface] of [
    ["DiamondKing_BottomRim", 0.025, 0.405, 0.028, silver],
    ["DiamondKing_TopRim", 0.26, 0.37, 0.022, silver],
  ] as const) {
    const rim = add(
      hat,
      name,
      new THREE.TorusGeometry(radius, thickness, 8, 36),
      surface,
      [0, y, 0],
    );
    rim.rotation.x = Math.PI / 2;
  }

  const points: THREE.Vector3[] = [];
  const pointHeights = [0.87, 0.67, 0.77, 0.66, 0.8, 0.66, 0.75];
  for (let i = 0; i < pointHeights.length; i++) {
    const angle = (i / pointHeights.length) * Math.PI * 2;
    const x = Math.sin(angle) * 0.34;
    const z = Math.cos(angle) * 0.34;
    const height = pointHeights[i];
    const stem = add(
      hat,
      `DiamondKing_PeakFrame_${i + 1}`,
      new THREE.CylinderGeometry(0.018, 0.037, height - 0.28, 8),
      silver,
      [x, (height + 0.28) / 2, z],
    );
    stem.rotation.x = Math.cos(angle) * 0.12;
    stem.rotation.z = -Math.sin(angle) * 0.12;
    add(
      hat,
      `DiamondKing_Point_${i + 1}`,
      new THREE.ConeGeometry(0.075, 0.19, 6),
      silver,
      [x, height, z],
    );
    points.push(new THREE.Vector3(x, height - 0.06, z));
    const gem = add(
      hat,
      `DiamondKing_Setting_${i + 1}`,
      new THREE.OctahedronGeometry(i === 0 ? 0.13 : 0.072, 0),
      diamond,
      [x, height - 0.22, z + 0.025],
      [0.8, 1.18, 0.72],
    );
    gem.rotation.set(0.12, angle, 0.18);
  }

  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    midpoint.y = 0.38 + (i % 2) * 0.035;
    const chain = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([start, midpoint, end]),
        12,
        0.014,
        5,
        false,
      ),
      darkSilver,
    );
    chain.name = `DiamondKing_PointedChain_${i + 1}`;
    hat.add(chain);
  }

  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const link = add(
      hat,
      `DiamondKing_BandRing_${i + 1}`,
      new THREE.TorusGeometry(0.035, 0.009, 5, 8),
      i % 2 ? darkSilver : silver,
      [Math.sin(angle) * 0.401, 0.14, Math.cos(angle) * 0.401],
      [1, 1, 0.75],
      [Math.cos(angle) * 0.4, 0, -Math.sin(angle) * 0.4],
    );
    link.rotation.z += Math.PI / 2;
  }

  const buckle = add(
    hat,
    "DiamondKing_FrontBuckle",
    new THREE.BoxGeometry(0.25, 0.19, 0.055),
    silver,
    [0, 0.14, 0.397],
  );
  add(
    hat,
    "DiamondKing_BuckleInset",
    new THREE.BoxGeometry(0.17, 0.12, 0.025),
    leather,
    [0, 0.14, 0.431],
  );
  buckle.castShadow = true;
  for (const [name, x] of [
    ["DiamondKing_SideClasp_L", -0.28],
    ["DiamondKing_SideClasp_R", 0.28],
  ] as const) {
    const clasp = add(
      hat,
      name,
      new THREE.TorusGeometry(0.06, 0.014, 6, 14),
      silver,
      [x, 0.14, 0.285],
    );
    clasp.rotation.x = Math.PI / 2;
  }

  const sparkleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
    toneMapped: false,
    depthWrite: false,
  });
  const sparkles = [
    add(
      hat,
      "DiamondKing_Sparkle_1",
      starGeometry(4),
      sparkleMaterial,
      [0.1, 0.57, 0.435],
      [0.8, 0.8, 1],
    ),
    add(
      hat,
      "DiamondKing_Sparkle_2",
      starGeometry(4),
      sparkleMaterial,
      [-0.25, 0.48, 0.37],
      [0.56, 0.56, 1],
    ),
  ];
  sparkles.forEach((sparkle) => (sparkle.visible = false));
  hat.userData.sparkles = sparkles;
}

/** Occasional deterministic glints keep premium diamonds lively without particles. */
export function updateHatSparkles(
  hat: THREE.Group | null,
  elapsed: number,
): void {
  const sparkles = (hat?.userData.sparkles as THREE.Mesh[] | undefined) ?? [];
  sparkles.forEach((sparkle, index) => {
    sparkle.visible = (elapsed + index * 2.7) % 6 < 0.16;
  });
}

/** Purchase a hat once per run; owned hats can be switched without another charge. */
export function purchaseHat(state: CityState, id: HatId): boolean {
  if (!state.campaign || state.outcome !== "playing") return false;
  const owned = (state.campaign.ownedHats ??= state.campaign.equippedHat
    ? [state.campaign.equippedHat]
    : []);
  if (!owned.includes(id)) {
    if (state.budget < hatDefinition(id).price) return false;
    state.budget -= hatDefinition(id).price;
    owned.push(id);
  }
  state.campaign.equippedHat = id;
  return true;
}

/** Build small, game-native 3D headwear; no image textures or extra collision. */
export function createHatModel(id: HatId): THREE.Group {
  const group = new THREE.Group();
  group.name = `Hat_${id}`;
  group.userData.hatId = id;
  switch (id) {
    case "trafficCone":
      trafficCone(group);
      break;
    case "cowboy":
      cowboyHat(group);
      break;
    case "newspaper":
      newspaperHat(group);
      break;
    case "sailor":
      sailorHat(group);
      break;
    case "wizard":
      wizardHat(group);
      break;
    case "footballCap":
      footballCap(group);
      break;
    case "diamondKingCrown":
      diamondKingCrown(group);
      break;
  }
  const definition = hatDefinition(id);
  group.scale.setScalar(definition.scale);
  group.position.set(...definition.offset);
  group.rotation.set(...definition.rotation);
  return group;
}

export function disposeHatModel(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const item of Array.isArray(object.material)
      ? object.material
      : [object.material])
      materials.add(item);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((surface) => surface.dispose());
}
