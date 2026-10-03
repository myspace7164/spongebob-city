import * as THREE from "three";
import { betonConfig } from "../../config/beton.ts";
import { finishSideCharacter } from "./side-character-details.ts";

export function themeColor(name: string): THREE.Color {
  return new THREE.Color(
    getComputedStyle(document.documentElement)
      .getPropertyValue(`--${name}`)
      .trim(),
  );
}

/** Small procedural props share the theme palette and need no external assets. */
export function box(
  group: THREE.Group,
  size: number[],
  at: number[],
  color: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    new THREE.MeshLambertMaterial({ color: themeColor(color) }),
  );
  mesh.position.set(at[0], at[1], at[2]);
  group.add(mesh);
  return mesh;
}
export function ball(
  group: THREE.Group,
  radius: number,
  at: number[],
  color: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 10, 8),
    new THREE.MeshLambertMaterial({ color: themeColor(color) }),
  );
  mesh.position.set(at[0], at[1], at[2]);
  group.add(mesh);
  return mesh;
}

/** A compact procedural cast-concrete grain map with subtle pits and aggregate. */
function makeConcreteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#b8b9b7";
  context.fillRect(0, 0, 128, 128);
  let seed = 57391;
  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 920; i++) {
    const shade = Math.round(72 + random() * 126);
    const radius =
      random() < 0.94 ? 0.35 + random() * 0.9 : 1.1 + random() * 1.4;
    context.fillStyle = `rgba(${shade},${shade},${shade},${0.12 + random() * 0.42})`;
    context.beginPath();
    context.arc(random() * 128, random() * 128, radius, 0, Math.PI * 2);
    context.fill();
  }
  for (let i = 0; i < 15; i++) {
    context.strokeStyle = `rgba(45,49,52,${0.1 + random() * 0.13})`;
    context.lineWidth = 0.35 + random() * 0.55;
    context.beginPath();
    const x = random() * 128;
    const y = random() * 128;
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 9, y + (random() - 0.5) * 9);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 4;
  return texture;
}

export function makeCharacter(
  kind: "sponge" | "patrick" | "sandy" | "squid" | "krabs" | "beton",
): THREE.Group {
  const g = new THREE.Group();
  if (kind === "sponge") {
    box(g, [1.1, 1.05, 0.5], [0, 1.45, 0], "sponge");
    box(g, [1.1, 0.18, 0.52], [0, 0.85, 0], "white");
    box(g, [1.1, 0.3, 0.52], [0, 0.61, 0], "wood");
    box(g, [0.12, 0.23, 0.04], [0, 0.79, 0.28], "coral");
    for (const x of [-0.27, 0.27]) {
      ball(g, 0.24, [x, 1.65, 0.27], "white");
      ball(g, 0.105, [x, 1.65, 0.46], "water");
      ball(g, 0.05, [x, 1.65, 0.54], "ink");
      box(g, [0.12, 0.35, 0.12], [x, 0.32, 0], "sponge").name =
        `${x < 0 ? "right" : "left"}-leg-mesh`;
      box(g, [0.29, 0.16, 0.35], [x, 0.08, 0.06], "ink").name =
        `${x < 0 ? "right" : "left"}-shoe`;
      box(g, [0.12, 0.55, 0.12], [x * 2.35, 1.02, 0], "sponge").name =
        `${x < 0 ? "right" : "left"}-arm-mesh`;
      ball(g, 0.09, [x * 1.6, 1.2, 0.265], "pore");
    }
    box(g, [0.42, 0.05, 0.04], [0, 1.19, 0.29], "ink");
    box(g, [0.14, 0.15, 0.06], [-0.1, 1.1, 0.28], "tooth");
    box(g, [0.14, 0.15, 0.06], [0.1, 1.1, 0.28], "tooth");
    ball(g, 0.1, [0, 1.42, 0.32], "sponge");
    for (const [x, y] of [
      [-0.42, 1.86],
      [0.4, 1.05],
      [-0.36, 1.42],
    ])
      ball(g, 0.065, [x, y, 0.25], "pore");
    return g;
  }
  if (kind === "beton") return makeBeton();
  const color = {
    patrick: "pink",
    sandy: "white",
    squid: "squid",
    krabs: "coral",
    beton: "concrete",
  }[kind];
  const body = ball(g, 0.5, [0, 0.95, 0], color);
  body.scale.y = 1.25;
  ball(
    g,
    kind === "squid" ? 0.5 : 0.36,
    [0, 1.67, 0],
    kind === "sandy" ? "wood" : color,
  );
  for (const x of [-0.18, 0.18]) {
    box(g, [0.17, 0.4, 0.17], [x, 0.3, 0], color).name =
      `${x < 0 ? "right" : "left"}-leg-mesh`;
    ball(g, 0.11, [x, 1.73, 0.34], "white");
    ball(g, 0.045, [x, 1.73, 0.43], "ink");
    const arm = box(g, [0.19, 0.6, 0.2], [x * 3.4, 1.02, 0], color);
    arm.name = `${x < 0 ? "right" : "left"}-arm-mesh`;
    arm.rotation.z = x > 0 ? 0.6 : -0.6;
  }
  if (kind === "patrick") box(g, [0.78, 0.32, 0.65], [0, 0.62, 0], "grass");
  if (kind === "squid") {
    ball(g, 0.14, [0, 1.58, 0.49], "squid");
    box(g, [0.7, 0.45, 0.6], [0, 1, 0], "wood");
  }
  if (kind === "krabs") {
    for (const x of [-0.7, 0.7]) ball(g, 0.25, [x, 1.3, 0], "coral");
    box(g, [0.7, 0.4, 0.6], [0, 0.62, 0], "water");
  }
  if (kind === "sandy") {
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.54, 16, 12),
      new THREE.MeshLambertMaterial({
        color: themeColor("water"),
        transparent: true,
        opacity: 0.16,
      }),
    );
    helmet.position.y = 1.7;
    g.add(helmet);
    ball(g, 0.13, [0.3, 2.16, 0], "pink");
  }
  return finishSideCharacter(g, kind);
}

/** Volumetric, stylized concrete villain; the city view adds his attack timing. */
function makeBeton(): THREE.Group {
  const root = new THREE.Group();
  root.name = "dr-beton";
  root.userData.assetKind = "procedural-three-dimensional-villain";

  const concreteGrain = makeConcreteTexture();
  const concrete = new THREE.MeshStandardMaterial({
    color: themeColor("concrete"),
    roughness: 0.96,
    map: concreteGrain,
    bumpMap: concreteGrain,
    bumpScale: 0.045,
  });
  const concreteEdge = new THREE.MeshStandardMaterial({
    color: themeColor("building"),
    roughness: 0.94,
    map: concreteGrain,
    bumpMap: concreteGrain,
    bumpScale: 0.035,
  });
  const asphalt = new THREE.MeshStandardMaterial({
    color: themeColor("asphalt"),
    roughness: 0.76,
    metalness: 0.18,
  });
  const coat = new THREE.MeshStandardMaterial({
    color: themeColor("villain-coat"),
    roughness: 0.66,
    metalness: 0.2,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x17191e,
    roughness: 0.9,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: 0x565b60,
    roughness: 0.38,
    metalness: 0.78,
  });
  const white = new THREE.MeshStandardMaterial({
    color: 0xf1e9da,
    roughness: 0.4,
  });
  const eye = new THREE.MeshStandardMaterial({
    color: 0xff3727,
    emissive: 0x7f0800,
    emissiveIntensity: 0.12,
    roughness: 0.24,
  });
  const eyeCore = new THREE.MeshBasicMaterial({ color: 0xffb6a0 });
  const crackGlow = new THREE.MeshStandardMaterial({
    color: 0xff3b19,
    emissive: 0xff2108,
    emissiveIntensity: 2.2,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });

  const block = (
    parent: THREE.Object3D,
    name: string,
    size: [number, number, number],
    at: [number, number, number],
    material: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...at);
    parent.add(mesh);
    return mesh;
  };
  const sphere = (
    parent: THREE.Object3D,
    name: string,
    scale: [number, number, number],
    at: [number, number, number],
    material: THREE.Material,
    segments = 12,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, segments, 8),
      material,
    );
    mesh.name = name;
    mesh.scale.set(...scale);
    mesh.position.set(...at);
    parent.add(mesh);
    return mesh;
  };
  const spike = (
    parent: THREE.Object3D,
    name: string,
    at: [number, number, number],
    radius: number,
    height: number,
    material: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 5),
      material,
    );
    mesh.name = name;
    mesh.position.set(...at);
    parent.add(mesh);
    return mesh;
  };
  const crack = (
    parent: THREE.Object3D,
    name: string,
    points: [number, number, number][],
    radius = 0.013,
    glow = false,
  ) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((point) => new THREE.Vector3(...point)),
    );
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 8, radius, 4, false),
      glow ? crackGlow : dark,
    );
    mesh.name = name;
    mesh.userData.isEyeCrack = name.includes("Eye");
    if (glow) mesh.visible = false;
    parent.add(mesh);
    return mesh;
  };

  // A forward-hunched torso gives the silhouette a heavy, hostile posture.
  const torso = new THREE.Group();
  torso.name = "BetonTorso";
  torso.position.y = 0.92;
  torso.rotation.x = 0.075;
  root.add(torso);
  block(torso, "Beton_ConcreteBody", [1.38, 1.18, 0.9], [0, 0.47, 0], concrete);
  block(
    torso,
    "Beton_ChestArmor",
    [1.48, 0.62, 0.16],
    [0, 0.58, 0.51],
    asphalt,
  );
  block(
    torso,
    "Beton_ChestInset",
    [0.88, 0.28, 0.055],
    [0, 0.58, 0.62],
    concreteEdge,
  );
  block(
    torso,
    "Beton_HazardPlate",
    [0.22, 0.46, 0.065],
    [0, 0.58, 0.666],
    coat,
  );
  block(torso, "Beton_Collar", [0.78, 0.22, 0.72], [0, 1.06, -0.01], coat);
  block(torso, "Beton_CoatHem", [1.58, 0.36, 1.02], [0, -0.04, -0.06], coat);
  block(torso, "Beton_Cape", [1.48, 1.18, 0.16], [0, 0.32, -0.56], coat);

  // Wide shoulder blocks and thick, pivoted arms retain simple animation pivots.
  const armPivots: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const tag = side < 0 ? "L" : "R";
    block(
      torso,
      `Beton_Pauldron_${tag}`,
      [0.78, 0.68, 0.92],
      [side * 0.82, 0.86, 0],
      concrete,
    );
    block(
      torso,
      `Beton_PauldronFace_${tag}`,
      [0.62, 0.17, 0.1],
      [side * 0.82, 0.75, 0.51],
      coat,
    );
    const rivet = sphere(
      torso,
      `Beton_Rivet_${tag}`,
      [0.07, 0.07, 0.04],
      [side * 1.02, 0.88, 0.58],
      steel,
      8,
    );
    rivet.rotation.z = side * 0.2;
    const arm = new THREE.Group();
    arm.name = `BetonArm_${tag}`;
    arm.position.set(side * 0.84, 0.78, 0.02);
    torso.add(arm);
    block(
      arm,
      `Beton_UpperArm_${tag}`,
      [0.56, 0.72, 0.62],
      [side * 0.05, -0.38, 0],
      concrete,
    );
    block(
      arm,
      `Beton_Forearm_${tag}`,
      [0.66, 0.65, 0.7],
      [side * 0.09, -0.88, 0.04],
      concreteEdge,
    );
    block(
      arm,
      `Beton_Gauntlet_${tag}`,
      [0.7, 0.42, 0.76],
      [side * 0.12, -1.3, 0.09],
      coat,
    );
    for (let i = -1; i <= 1; i++) {
      block(
        arm,
        `Beton_Knuckle_${tag}_${i + 2}`,
        [0.17, 0.2, 0.1],
        [side * 0.12 + i * 0.19, -1.35, 0.49],
        concrete,
      );
    }
    spike(
      torso,
      `Beton_ShoulderSpike_${tag}`,
      [side * 0.92, 1.27, -0.02],
      0.16,
      0.38,
      coat,
    );
    armPivots.push(arm);
  }
  root.userData.armPivots = armPivots;
  root.userData.torso = torso;

  // Heavy legs and boots keep the mass planted.
  for (const side of [-1, 1]) {
    const tag = side < 0 ? "L" : "R";
    block(
      root,
      `Beton_Thigh_${tag}`,
      [0.62, 0.64, 0.62],
      [side * 0.38, 0.53, 0],
      concrete,
    );
    block(
      root,
      `Beton_Shin_${tag}`,
      [0.58, 0.39, 0.58],
      [side * 0.38, 0.2, 0.04],
      asphalt,
    );
    block(
      root,
      `Beton_Boot_${tag}`,
      [0.74, 0.36, 0.96],
      [side * 0.39, 0.17, 0.16],
      steel,
    );
    block(
      root,
      `Beton_BootToe_${tag}`,
      [0.56, 0.2, 0.16],
      [side * 0.39, 0.19, 0.66],
      concreteEdge,
    );
  }

  // The angular head is a separate pivot so eye origins track future head aim.
  const head = new THREE.Group();
  head.name = "BetonHead";
  head.position.set(0, 1.3, 0.04);
  torso.add(head);
  block(head, "Beton_HeadConcrete", [1.0, 0.78, 0.78], [0, 0, 0], concrete);
  block(head, "Beton_JawArmor", [0.76, 0.22, 0.14], [0, -0.29, 0.42], asphalt);
  const eyeSockets: THREE.Mesh[] = [];
  const eyeMeshes: THREE.Mesh[] = [];
  const eyeWhites: THREE.Mesh[] = [];
  const brows: THREE.Mesh[] = [];
  const laserEyes: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const tag = side < 0 ? "L" : "R";
    const x = side * 0.235;
    const socket = sphere(
      head,
      `Beton_EyeSocket_${tag}`,
      [0.205, 0.215, 0.12],
      [x, 0.035, 0.4],
      dark,
    );
    socket.rotation.z = side * -0.1;
    eyeSockets.push(socket);
    eyeWhites.push(
      sphere(
        head,
        `Beton_Eyeball_${tag}`,
        [0.125, 0.135, 0.09],
        [x, 0.025, 0.485],
        white,
        12,
      ),
    );
    const iris = sphere(
      head,
      "evil-eye",
      [0.074, 0.084, 0.055],
      [x, 0.025, 0.559],
      eye,
      12,
    );
    iris.userData.eyeSide = tag;
    eyeMeshes.push(iris);
    sphere(
      head,
      `Beton_EyeHotCore_${tag}`,
      [0.028, 0.036, 0.025],
      [x, 0.025, 0.606],
      eyeCore,
      8,
    );
    const brow = block(
      head,
      `Beton_AngryBrow_${tag}`,
      [0.4, 0.13, 0.16],
      [x, 0.225, 0.47],
      coat,
    );
    // Inner brow drops toward the nose, producing a clear scowl at distance.
    brow.rotation.z = side < 0 ? -0.36 : 0.36;
    brow.userData.side = side;
    brows.push(brow);
    const origin = new THREE.Object3D();
    origin.name = `FX_LaserEye_${tag}`;
    origin.position.set(x, 0.025, 0.64);
    origin.userData.forward = new THREE.Vector3(0, 0, 1);
    head.add(origin);
    laserEyes.push(origin);
  }

  // A downturned armored snarl and chunky teeth replace the old neutral slit.
  block(head, "Beton_MouthRecess", [0.62, 0.18, 0.1], [0, -0.25, 0.445], dark);
  block(head, "Beton_MouthLowerLip", [0.57, 0.1, 0.12], [0, -0.36, 0.44], coat);
  for (const x of [-0.2, -0.07, 0.07, 0.2]) {
    const tooth = block(
      head,
      `Beton_SnarlingTooth_${Math.round((x + 0.22) * 100)}`,
      [0.09, 0.105, 0.07],
      [x, -0.24, 0.515],
      white,
    );
    tooth.rotation.z = x < 0 ? -0.12 : 0.12;
  }

  // Raised branching fissures have dark bases and individually switchable ember overlays.
  const darkCracks: THREE.Mesh[] = [];
  const glowCracks: THREE.Mesh[] = [];
  const crackSets: [
    string,
    THREE.Object3D,
    [number, number, number][],
    boolean,
    number,
  ][] = [
    [
      "HeadEye_L",
      head,
      [
        [-0.48, 0.34, 0.32],
        [-0.36, 0.23, 0.43],
        [-0.43, 0.1, 0.41],
        [-0.29, -0.02, 0.48],
      ],
      true,
      0,
    ],
    [
      "HeadEye_R",
      head,
      [
        [0.48, 0.34, 0.32],
        [0.36, 0.23, 0.43],
        [0.43, 0.1, 0.41],
        [0.29, -0.02, 0.48],
      ],
      true,
      0,
    ],
    [
      "Chest_L",
      torso,
      [
        [-0.62, 0.92, 0.39],
        [-0.49, 0.77, 0.5],
        [-0.57, 0.61, 0.5],
        [-0.39, 0.5, 0.52],
      ],
      false,
      0,
    ],
    [
      "Chest_R",
      torso,
      [
        [0.62, 0.92, 0.39],
        [0.49, 0.77, 0.5],
        [0.57, 0.61, 0.5],
        [0.39, 0.5, 0.52],
      ],
      false,
      0,
    ],
    [
      "Temple_L",
      head,
      [
        [-0.49, 0.34, 0.18],
        [-0.4, 0.18, 0.36],
        [-0.48, 0.02, 0.31],
      ],
      false,
      0.2,
    ],
    [
      "Temple_R",
      head,
      [
        [0.49, 0.34, 0.18],
        [0.4, 0.18, 0.36],
        [0.48, 0.02, 0.31],
      ],
      false,
      0.2,
    ],
    [
      "ChestFork_L",
      torso,
      [
        [-0.66, 0.78, 0.4],
        [-0.54, 0.67, 0.5],
        [-0.67, 0.52, 0.4],
      ],
      false,
      0.48,
    ],
    [
      "ChestFork_R",
      torso,
      [
        [0.66, 0.78, 0.4],
        [0.54, 0.67, 0.5],
        [0.67, 0.52, 0.4],
      ],
      false,
      0.48,
    ],
    [
      "Jaw_L",
      head,
      [
        [-0.42, -0.22, 0.34],
        [-0.32, -0.3, 0.43],
        [-0.39, -0.39, 0.33],
      ],
      false,
      0.72,
    ],
    [
      "Jaw_R",
      head,
      [
        [0.42, -0.22, 0.34],
        [0.32, -0.3, 0.43],
        [0.39, -0.39, 0.33],
      ],
      false,
      0.72,
    ],
  ];
  for (const [name, parent, points, aroundEyes, threshold] of crackSets) {
    const darkCrack = crack(parent, `Beton_Crack_${name}`, points);
    darkCrack.userData.levelThreshold = threshold;
    darkCracks.push(darkCrack);
    const glow = crack(
      parent,
      `Beton_CrackGlow_${name}`,
      points,
      aroundEyes ? 0.027 : 0.021,
      true,
    );
    glow.userData.isEyeCrack = aroundEyes;
    glow.userData.levelThreshold = threshold;
    glowCracks.push(glow);
  }
  const flameGroups: THREE.Group[] = [];
  const flameAnchors: [THREE.Object3D, [number, number, number]][] = [
    [head, [-0.37, 0.36, 0.06]],
    [head, [0.37, 0.36, 0.06]],
    [torso, [-0.91, 1.18, 0.03]],
    [torso, [0.91, 1.18, 0.03]],
    [head, [0, 0.46, -0.02]],
  ];
  flameAnchors.forEach(([parent, at], index) => {
    const flame = new THREE.Group();
    flame.name = `BetonFlame_${index + 1}`;
    flame.position.set(...at);
    const outer = new THREE.Mesh(
      new THREE.ConeGeometry(
        0.12 + (index > 1 ? 0.035 : 0),
        0.42 + (index > 1 ? 0.12 : 0),
        7,
      ),
      new THREE.MeshBasicMaterial({
        color: 0xff3a12,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      }),
    );
    outer.name = `BetonFlameOuter_${index + 1}`;
    outer.position.y = 0.2;
    const inner = new THREE.Mesh(
      new THREE.ConeGeometry(0.065, 0.27, 6),
      new THREE.MeshBasicMaterial({
        color: 0xffc13d,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      }),
    );
    inner.name = `BetonFlameCore_${index + 1}`;
    inner.position.set(0, 0.14, 0.025);
    flame.add(outer, inner);
    flame.visible = false;
    parent.add(flame);
    flameGroups.push(flame);
  });
  const chips: THREE.Mesh[] = [];
  const chipSpecs: {
    parent: THREE.Object3D;
    at: [number, number, number];
    size: number;
  }[] = [
    { parent: head, at: [-0.48, -0.3, 0.3], size: 0.075 },
    { parent: head, at: [0.47, 0.27, 0.31], size: 0.065 },
    { parent: torso, at: [-0.67, 0.28, 0.45], size: 0.085 },
    { parent: torso, at: [0.67, -0.02, 0.39], size: 0.07 },
  ];
  chipSpecs.forEach(({ parent, at, size }, index) => {
    const chip = new THREE.Mesh(
      new THREE.TetrahedronGeometry(size, 0),
      concreteEdge,
    );
    chip.name = `Beton_ChippedConcrete_${index + 1}`;
    chip.position.set(...at);
    chip.userData.levelThreshold = index < 2 ? 0.48 : 0.72;
    chip.visible = false;
    parent.add(chip);
    chips.push(chip);
  });
  root.userData.head = head;
  root.userData.laserEyes = laserEyes;
  root.userData.eyeMeshes = eyeMeshes;
  root.userData.eyeWhites = eyeWhites;
  root.userData.brows = brows;
  root.userData.eyeSockets = eyeSockets;
  root.userData.darkCracks = darkCracks;
  root.userData.glowCracks = glowCracks;
  root.userData.flameGroups = flameGroups;
  root.userData.chips = chips;
  root.userData.concreteMaterials = [concrete, concreteEdge];
  root.userData.baseConcreteColors = [
    concrete.color.clone(),
    concreteEdge.color.clone(),
  ];
  root.userData.concreteTexture = concreteGrain;
  return root;
}

/** Visual-only menace ramp, normalized to the campaign's actual level count. */
export function updateBetonLevelAppearance(
  root: THREE.Group,
  progress: number,
  attackCharge = 0,
  time = 0,
  temporaryAnger = false,
): void {
  const menace = THREE.MathUtils.clamp(progress, 0, 1);
  const charge = THREE.MathUtils.clamp(attackCharge, 0, 1);
  const appearance = betonConfig.appearance;
  root.userData.levelProgress = menace;
  root.scale.setScalar(
    1 + menace * (appearance.finalScale - 1) + (temporaryAnger ? 0.1 : 0),
  );

  const materials = root.userData
    .concreteMaterials as THREE.MeshStandardMaterial[];
  const baseColors = root.userData.baseConcreteColors as THREE.Color[];
  materials.forEach((material, i) => {
    material.color
      .copy(baseColors[i])
      .multiplyScalar(1 - menace * appearance.maxConcreteDarkening);
    material.roughness = 0.96 - menace * 0.04;
    material.bumpScale = 0.045 + menace * (appearance.finalBumpScale - 0.045);
  });

  const brows = root.userData.brows as THREE.Mesh[];
  brows.forEach((brow) => {
    brow.rotation.z =
      (brow.userData.side as number) *
      (0.36 +
        menace * (appearance.finalBrowAngle - 0.36) +
        (temporaryAnger ? 0.16 : 0));
    brow.scale.y =
      1 +
      menace * (appearance.finalBrowHeight - 1) +
      (temporaryAnger ? 0.08 : 0);
  });
  const whites = root.userData.eyeWhites as THREE.Mesh[];
  whites.forEach((white) => {
    white.scale.y = 0.135 * (1 - menace * appearance.eyeNarrowing);
  });
  const eyeMeshes = root.userData.eyeMeshes as THREE.Mesh[];
  eyeMeshes.forEach((eye) => {
    const material = eye.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity =
      0.1 +
      menace * appearance.finalEyeEmissive +
      (temporaryAnger ? 0.9 : 0) +
      charge * 2.8;
  });
  const darkCracks = root.userData.darkCracks as THREE.Mesh[];
  darkCracks.forEach((crackMesh) => {
    crackMesh.visible = menace >= (crackMesh.userData.levelThreshold as number);
  });
  const glowCracks = root.userData.glowCracks as THREE.Mesh[];
  glowCracks.forEach((crackMesh) => {
    const eyeCrack = crackMesh.userData.isEyeCrack;
    const threshold = crackMesh.userData.levelThreshold as number;
    const levelGlow =
      temporaryAnger || menace >= (eyeCrack ? 0.28 : threshold + 0.14);
    const attackGlow = charge > (eyeCrack ? 0.04 : 0.58);
    crackMesh.visible = levelGlow || attackGlow;
    const material = crackMesh.material as THREE.MeshStandardMaterial;
    const pulse = menace > 0.92 ? 0.12 * (0.5 + 0.5 * Math.sin(time * 5)) : 0;
    material.emissiveIntensity =
      (levelGlow
        ? 0.45 +
          menace * appearance.finalCrackEmissive +
          (temporaryAnger ? 0.8 : 0) +
          pulse
        : 0) +
      charge * (eyeCrack ? 3.5 : 1.8);
  });
  const flames = root.userData.flameGroups as THREE.Group[];
  const visibleFlames = Math.round(menace * flames.length);
  flames.forEach((flame, index) => {
    flame.visible = index < visibleFlames;
    if (!flame.visible) return;
    const pulse = 1 + Math.sin(time * 7 + index * 1.8) * (0.04 + menace * 0.05);
    const flameScale = 0.7 + menace * (appearance.finalFlameScale - 0.7);
    flame.scale.set(
      flameScale,
      pulse * (0.74 + menace * (appearance.finalFlameScale - 0.74)),
      flameScale,
    );
  });
  const chips = root.userData.chips as THREE.Mesh[];
  chips.forEach((chip) => {
    chip.visible = menace >= (chip.userData.levelThreshold as number);
  });
}

export function label(text: string, speech = false): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = speech ? 180 : 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = `#${themeColor("ink").getHexString()}`;
  if (speech) {
    ctx.fillStyle = "#fffdf0";
    ctx.strokeStyle = "#153c50";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 128, 50);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(220, 135);
    ctx.lineTo(242, 171);
    ctx.lineTo(280, 135);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#153c50";
  } else ctx.fillRect(0, 0, 512, 96);
  if (!speech) ctx.fillStyle = `#${themeColor("white").getHexString()}`;
  ctx.font = `600 29px ${getComputedStyle(document.documentElement).getPropertyValue("--font")}`;
  ctx.textAlign = "center";
  ctx.fillText(text, 256, speech ? 82 : 59, 470);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      depthTest: false,
    }),
  );
  sprite.scale.set(speech ? 3.8 : 4.5, speech ? 1.34 : 0.84, 1);
  sprite.userData.speechBubble = speech;
  return sprite;
}
